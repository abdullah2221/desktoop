import { getDatabase } from '../connection';
import { SupplierRepository } from './SupplierRepository';
import { AuditLogRepository } from './AuditLogRepository';

export class SupplierPaymentRepository {
  static getBySupplier(supplierId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM supplier_payments
      WHERE supplier_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(supplierId);
  }

  static create(payload: any) {
    const db = getDatabase();
    
    const transaction = db.transaction((data: any) => {
      const paymentId = data.id || `SP-${Date.now()}`;
      
      const insertPayment = db.prepare(`
        INSERT INTO supplier_payments (
          id, tenant_id, branch_id, supplier_id, date, amount, payment_method, reference_no, notes
        ) VALUES (
          @id, 'T001', 'B001', @supplier_id, @date, @amount, @payment_method, @reference_no, @notes
        )
      `);
      
      insertPayment.run({
        id: paymentId,
        supplier_id: data.supplier_id,
        date: data.date || new Date().toISOString(),
        amount: data.amount,
        payment_method: data.payment_method || 'Cash',
        reference_no: data.reference_no || '',
        notes: data.notes || ''
      });

      const supplier: any = SupplierRepository.getById(data.supplier_id);
      if (supplier) {
        const currentBalance = supplier.current_balance || 0;
        const newBalance = currentBalance - data.amount;

        const insertLedger = db.prepare(`
          INSERT INTO supplier_ledger (
            id, tenant_id, branch_id, supplier_id, date, type, 
            reference_id, debit, credit, balance, notes
          ) VALUES (
            @id, 'T001', 'B001', @supplier_id, @date, 'PAYMENT', 
            @reference_id, @debit, 0, @balance, @notes
          )
        `);

        insertLedger.run({
          id: `LEDG-${Date.now()}-PY`,
          supplier_id: data.supplier_id,
          date: new Date().toISOString(),
          reference_id: paymentId,
          debit: data.amount,
          balance: newBalance,
          notes: data.notes || `Manual Payment`
        });

        db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, data.supplier_id);
      }

      AuditLogRepository.write({
        action: 'SUPPLIER_PAYMENT_CREATE',
        details: `Supplier payment ${paymentId} created for supplier ${data.supplier_id}`
      });
      
      return { success: true, id: paymentId };
    });

    try {
      return transaction(payload);
    } catch (error: any) {
      console.error('[SupplierPaymentRepository] Transaction failed:', error);
      throw error;
    }
  }
}
