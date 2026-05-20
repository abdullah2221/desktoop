import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { TaxRepository } from './TaxRepository';

export interface InvoiceItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

export interface InvoicePayload {
  id?: string;
  invoice_no?: string;
  customer_name: string;
  invoice_date: string;
  due_date?: string;
  status?: 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Void';
  subtotal: number;
  discount_total: number;
  tax_total: number;
  tax_code?: string;
  tax_mode?: 'inclusive' | 'exclusive';
  tax_amount?: number;
  grand_total: number;
  amount_paid?: number;
  balance_due?: number;
  notes?: string;
  items: InvoiceItemInput[];
}

export class InvoiceRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC, created_at DESC').all();
  }

  static getById(id: string) {
    const db = getDatabase();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!invoice) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid ASC').all(id);
    return { ...invoice, items };
  }

  static create(payload: InvoicePayload) {
    const db = getDatabase();
    const tx = db.transaction((data: InvoicePayload) => {
      const id = data.id || `SI-${Date.now()}`;
      const invoiceNo = data.invoice_no || `INVX-${Date.now()}`;
      const status = data.status || 'Draft';
      const amountPaid = data.amount_paid || 0;
      const balanceDue = data.balance_due ?? Math.max(0, data.grand_total - amountPaid);

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_no, tenant_id, branch_id, customer_name, invoice_date, due_date,
          status, subtotal, discount_total, tax_total, grand_total, amount_paid, balance_due,
          stock_posted, accounting_posted, notes, tax_code, tax_mode, tax_amount
        ) VALUES (
          @id, @invoice_no, 'T001', 'B001', @customer_name, @invoice_date, @due_date,
          @status, @subtotal, @discount_total, @tax_total, @grand_total, @amount_paid, @balance_due,
          0, 0, @notes, @tax_code, @tax_mode, @tax_amount
        )
      `).run({
        id,
        invoice_no: invoiceNo,
        customer_name: data.customer_name,
        invoice_date: data.invoice_date,
        due_date: data.due_date || data.invoice_date,
        status,
        subtotal: data.subtotal,
        discount_total: data.discount_total,
        tax_total: data.tax_total,
        grand_total: data.grand_total,
        tax_code: data.tax_code || TaxRepository.getDefaultTaxCode('sales'),
        tax_mode: data.tax_mode || 'exclusive',
        tax_amount: data.tax_amount || data.tax_total || 0,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        notes: data.notes || ''
      });

      this.replaceItemsInternal(id, data.items);

      if (status !== 'Draft' && status !== 'Void') {
        this.finalizeInternal(id);
      }

      AuditLogRepository.write({ action: 'INVOICE_CREATE', details: `Invoice ${id} created` });
      return { success: true, id };
    });

    return tx(payload);
  }

  static updateDraft(payload: InvoicePayload & { id: string }) {
    const db = getDatabase();
    const tx = db.transaction((data: InvoicePayload & { id: string }) => {
      const invoice = db.prepare('SELECT status FROM invoices WHERE id = ?').get(data.id) as { status: string } | undefined;
      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.status !== 'Draft') throw new Error('Only draft invoices can be edited.');

      const amountPaid = data.amount_paid || 0;
      const balanceDue = Math.max(0, data.grand_total - amountPaid);

      const info = db.prepare(`
        UPDATE invoices
        SET customer_name = @customer_name,
            invoice_date = @invoice_date,
            due_date = @due_date,
            subtotal = @subtotal,
            discount_total = @discount_total,
            tax_total = @tax_total,
            grand_total = @grand_total,
            tax_code = @tax_code,
            tax_mode = @tax_mode,
            tax_amount = @tax_amount,
            amount_paid = @amount_paid,
            balance_due = @balance_due,
            notes = @notes,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        id: data.id,
        customer_name: data.customer_name,
        invoice_date: data.invoice_date,
        due_date: data.due_date || data.invoice_date,
        subtotal: data.subtotal,
        discount_total: data.discount_total,
        tax_total: data.tax_total,
        grand_total: data.grand_total,
        tax_code: data.tax_code || TaxRepository.getDefaultTaxCode('sales'),
        tax_mode: data.tax_mode || 'exclusive',
        tax_amount: data.tax_amount || data.tax_total || 0,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        notes: data.notes || ''
      });

      if (info.changes === 0) return false;
      this.replaceItemsInternal(data.id, data.items);
      AuditLogRepository.write({ action: 'INVOICE_UPDATE_DRAFT', details: `Draft invoice ${data.id} updated` });
      return true;
    });

    return tx(payload);
  }

  static finalize(id: string) {
    const db = getDatabase();
    const tx = db.transaction((invoiceId: string) => {
      const invoice = db.prepare('SELECT status FROM invoices WHERE id = ?').get(invoiceId) as { status: string } | undefined;
      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.status === 'Void') throw new Error('Void invoices cannot be finalized.');
      this.finalizeInternal(invoiceId);
      AuditLogRepository.write({ action: 'INVOICE_FINALIZE', details: `Invoice ${invoiceId} finalized` });
      return true;
    });
    return tx(id);
  }

  static voidInvoice(id: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE invoices
      SET status = 'Void', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'Draft'
    `).run(id);

    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'INVOICE_VOID', details: `Invoice ${id} voided` });
    }

    return info.changes > 0;
  }

  static applyPayment(invoiceId: string, amount: number) {
    const db = getDatabase();
    const invoice = db.prepare('SELECT amount_paid, grand_total, status FROM invoices WHERE id = ?').get(invoiceId) as { amount_paid: number; grand_total: number; status: string } | undefined;
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'Void') throw new Error('Cannot apply payment to a void invoice.');
    if (invoice.status === 'Draft') throw new Error('Cannot apply payment to a draft invoice.');

    const newPaid = invoice.amount_paid + amount;
    const newBalance = Math.max(0, invoice.grand_total - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    db.prepare('UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPaid, newBalance, newStatus, invoiceId);

    return { newPaid, newBalance, newStatus };
  }

  private static replaceItemsInternal(invoiceId: string, items: InvoiceItemInput[]) {
    const db = getDatabase();
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId);
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, quantity, unit_price, discount, tax_rate, line_total
      ) VALUES (
        @id, @invoice_id, @product_id, @quantity, @unit_price, @discount, @tax_rate, @line_total
      )
    `);

    for (const item of items) {
      insertItem.run({
        id: `II-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        invoice_id: invoiceId,
        ...item
      });
    }
  }

  private static finalizeInternal(invoiceId: string) {
    const db = getDatabase();

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as {
      id: string;
      invoice_no: string;
      invoice_date: string;
      status: string;
      customer_name: string;
      grand_total: number;
      tax_amount: number;
      amount_paid: number;
      stock_posted: number;
      accounting_posted: number;
    } | undefined;

    if (!invoice) throw new Error('Invoice not found.');

    const items = db.prepare('SELECT product_id, quantity, unit_price FROM invoice_items WHERE invoice_id = ?').all(invoiceId) as Array<{ product_id: string; quantity: number; unit_price: number }>;

    if (invoice.stock_posted === 0) {
      const getStock = db.prepare('SELECT stock, cost FROM products WHERE id = ?');
      const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, branch_id, product_id, movement_type, quantity_in, quantity_out,
          reference_type, reference_id, previous_stock, new_stock, date, notes
        ) VALUES (
          @id, 'T001', 'B001', @product_id, 'SALE', 0, @quantity_out,
          'INVOICE', @reference_id, @previous_stock, @new_stock, @date, @notes
        )
      `);

      for (const item of items) {
        const product = getStock.get(item.product_id) as { stock: number; cost: number } | undefined;
        if (!product) throw new Error(`Product not found: ${item.product_id}`);
        const previousStock = product.stock;
        const newStock = Math.max(0, previousStock - item.quantity);
        updateStock.run(newStock, item.product_id);
        insertMovement.run({
          id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          product_id: item.product_id,
          quantity_out: item.quantity,
          reference_id: invoiceId,
          previous_stock: previousStock,
          new_stock: newStock,
          date: invoice.invoice_date,
          notes: `Stock out via invoice ${invoice.invoice_no}`
        });
      }

      db.prepare('UPDATE invoices SET stock_posted = 1 WHERE id = ?').run(invoiceId);
    }

    if (invoice.accounting_posted === 0) {
      const cogs = items.reduce((sum, item) => {
        const product = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.product_id) as { cost: number } | undefined;
        return sum + (product?.cost || 0) * item.quantity;
      }, 0);

      AccountingPostingService.postInvoiceFinalize({
        invoiceId,
        invoiceNo: invoice.invoice_no,
        date: invoice.invoice_date,
        total: invoice.grand_total,
        status: invoice.amount_paid > 0 ? 'Paid' : 'Unpaid',
        cogsAmount: cogs,
        taxAmount: invoice.tax_amount || 0
      });

      if (invoice.amount_paid > 0) {
        AccountingPostingService.postInvoicePayment({
          invoiceId,
          paymentId: `${invoiceId}-INITPAY`,
          date: invoice.invoice_date,
          amount: invoice.amount_paid,
          method: 'Cash'
        });
      }

      db.prepare('UPDATE invoices SET accounting_posted = 1 WHERE id = ?').run(invoiceId);
    }

    const status = invoice.amount_paid === 0 ? 'Unpaid' : (invoice.amount_paid >= invoice.grand_total ? 'Paid' : 'Partially Paid');
    const balanceDue = Math.max(0, invoice.grand_total - invoice.amount_paid);
    db.prepare('UPDATE invoices SET status = ?, balance_due = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, balanceDue, invoiceId);
  }
}
