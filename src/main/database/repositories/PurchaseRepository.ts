import { getDatabase } from '../connection';
import { ProductRepository } from './ProductRepository';
import { SupplierRepository } from './SupplierRepository';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { TaxRepository } from './TaxRepository';
import { CurrencyRepository } from './CurrencyRepository';
import { ExchangeRateRepository } from './ExchangeRateRepository';

export class PurchaseRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.created_at DESC
    `).all();
  }

  static getById(id: string) {
    const db = getDatabase();
    const purchase = db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id) as any;

    if (purchase) {
      purchase.items = db.prepare(`
        SELECT 
          pi.*,
          pr.name as product_name
        FROM purchase_items pi
        LEFT JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `).all(id);
    }
    
    return purchase;
  }

  static create(payload: any) {
    const db = getDatabase();
    
    // Setup transaction
    const transaction = db.transaction((purchaseData: any) => {
      const purchaseId = purchaseData.id || `PUR-${Date.now()}`;
      const branchId = purchaseData.branch_id || 'B001';
      const classId = purchaseData.class_id || null;
      const baseCurrency = (CurrencyRepository.getBaseCurrency() as any).code || 'PKR';
      const currencyCode = (purchaseData.currency_code || baseCurrency).toUpperCase();
      const exchangeRate = purchaseData.exchange_rate || ExchangeRateRepository.getRate(currencyCode, baseCurrency, purchaseData.date || new Date().toISOString().split('T')[0]);
      const originalGrandTotal = Number(purchaseData.grand_total || 0);
      const baseGrandTotal = Number((originalGrandTotal * exchangeRate).toFixed(4));
      const baseAmountPaid = Number((Number(purchaseData.amount_paid || 0) * exchangeRate).toFixed(4));
      const baseRemainingPayable = Number((Number(purchaseData.remaining_payable || Math.max(0, originalGrandTotal - Number(purchaseData.amount_paid || 0))) * exchangeRate).toFixed(4));
      const baseTax = Number((Number(purchaseData.tax || 0) * exchangeRate).toFixed(4));
      
      // 1. Insert Purchase
      const insertPurchase = db.prepare(`
        INSERT INTO purchases (
          id, tenant_id, branch_id, class_id, supplier_id, date, 
          total, status, payment_status, discount, tax, 
          grand_total, amount_paid, remaining_payable, notes, tax_code, tax_mode,
          currency_code, exchange_rate, original_grand_total, base_grand_total
        ) VALUES (
          @id, 'T001', @branch_id, @class_id, @supplier_id, @date,
          @subtotal, @status, @payment_status, @discount, @tax,
          @grand_total, @amount_paid, @remaining_payable, @notes, @tax_code, @tax_mode,
          @currency_code, @exchange_rate, @original_grand_total, @base_grand_total
        )
      `);
      
      insertPurchase.run({
        id: purchaseId,
        branch_id: branchId,
        class_id: classId,
        supplier_id: purchaseData.supplier_id,
        date: purchaseData.date || new Date().toISOString(),
        subtotal: Number((Number(purchaseData.subtotal || 0) * exchangeRate).toFixed(4)),
        status: purchaseData.status || 'Completed',
        payment_status: purchaseData.payment_status || 'Paid',
        discount: Number((Number(purchaseData.discount || 0) * exchangeRate).toFixed(4)),
        tax: baseTax,
        grand_total: baseGrandTotal,
        amount_paid: baseAmountPaid,
        remaining_payable: baseRemainingPayable,
        notes: purchaseData.notes || '',
        tax_code: purchaseData.tax_code || TaxRepository.getDefaultTaxCode('purchase'),
        tax_mode: purchaseData.tax_mode || 'exclusive',
        currency_code: currencyCode,
        exchange_rate: exchangeRate,
        original_grand_total: originalGrandTotal,
        base_grand_total: baseGrandTotal
      });

      // 2. Insert Purchase Items & 3. Update Stock & 4. Insert Stock Movement & 5. Update Product Purchase Cost
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_id, product_id, quantity, cost, unit_cost, line_total
        ) VALUES (
          @id, @purchase_id, @product_id, @quantity, @cost, @unit_cost, @line_total
        )
      `);

      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, branch_id, class_id, product_id, movement_type, 
          quantity_in, reference_type, reference_id, 
          previous_stock, new_stock, date, notes
        ) VALUES (
          @id, 'T001', @branch_id, @class_id, @product_id, 'PURCHASE', 
          @quantity_in, 'PURCHASE', @reference_id, 
          @previous_stock, @new_stock, @date, @notes
        )
      `);

      for (const item of purchaseData.items) {
        const itemId = `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        insertItem.run({
          id: itemId,
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          cost: item.unit_cost,
          unit_cost: item.unit_cost,
          line_total: item.line_total
        });

        // Get current product state
        const product: any = ProductRepository.getById(item.product_id);
        if (product) {
          const currentStock = product.stock_quantity ?? 0;
          const newStock = currentStock + item.quantity;
          
          // Update Stock & Cost
          db.prepare(`
            UPDATE products 
            SET stock = ?, cost = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newStock, item.unit_cost, item.product_id);

          // Insert Stock Movement
          insertStockMovement.run({
            id: `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            branch_id: branchId,
            class_id: classId,
            product_id: item.product_id,
            quantity_in: item.quantity,
            reference_id: purchaseId,
            previous_stock: currentStock,
            new_stock: newStock,
            date: new Date().toISOString(),
            notes: `Purchased via Invoice ${purchaseData.purchase_invoice_no || purchaseId}`
          });
        }
      }

      // 6. Update Supplier Ledger and Balance
      const supplier: any = SupplierRepository.getById(purchaseData.supplier_id);
      if (supplier) {
        const currentBalance = supplier.current_balance || 0;
        let newBalance = currentBalance;
        
        // If there's a purchase total, it increases what we owe the supplier (Credit in Ledger)
        // If we paid something, it decreases what we owe the supplier (Debit in Ledger)
        // Note: ERP typically handles supplier balance as "Amount we owe".
        // Owe amount increases by grand_total, decreases by amount_paid
        const purchaseLedgerId = `LEDG-${Date.now()}-P`;
        
        db.prepare(`
          INSERT INTO supplier_ledger (
            id, tenant_id, branch_id, supplier_id, date, type, 
            reference_id, debit, credit, balance, notes
          ) VALUES (
            @id, 'T001', @branch_id, @supplier_id, @date, 'PURCHASE', 
            @reference_id, 0, @credit, @balance, @notes
          )
        `).run({
          id: purchaseLedgerId,
          branch_id: branchId,
          supplier_id: purchaseData.supplier_id,
          date: new Date().toISOString(),
          reference_id: purchaseId,
          credit: baseGrandTotal,
          balance: currentBalance + baseGrandTotal,
          notes: `Purchase Invoice ${purchaseData.purchase_invoice_no || purchaseId}`
        });
        
        newBalance += baseGrandTotal;

        if (baseAmountPaid > 0) {
          const paymentLedgerId = `LEDG-${Date.now()}-PY`;
          const paymentId = `SP-${Date.now()}`;
          
          db.prepare(`
            INSERT INTO supplier_payments (
            id, tenant_id, branch_id, supplier_id, date, amount, payment_method, reference_no, notes
          ) VALUES (
              @id, 'T001', @branch_id, @supplier_id, @date, @amount, @payment_method, @reference_no, @notes
            )
          `).run({
            id: paymentId,
            branch_id: branchId,
            supplier_id: purchaseData.supplier_id,
            date: new Date().toISOString(),
            amount: baseAmountPaid,
            payment_method: purchaseData.payment_method || 'Cash',
            reference_no: purchaseId,
            notes: `Payment for Purchase ${purchaseData.purchase_invoice_no || purchaseId}`
          });
          
          db.prepare(`
            INSERT INTO supplier_ledger (
              id, tenant_id, branch_id, supplier_id, date, type, 
              reference_id, debit, credit, balance, notes
            ) VALUES (
              @id, 'T001', @branch_id, @supplier_id, @date, 'PAYMENT', 
              @reference_id, @debit, 0, @balance, @notes
            )
          `).run({
            id: paymentLedgerId,
            branch_id: branchId,
            supplier_id: purchaseData.supplier_id,
            date: new Date().toISOString(),
            reference_id: paymentId,
            debit: baseAmountPaid,
            balance: newBalance - baseAmountPaid,
            notes: `Payment for Purchase Invoice ${purchaseData.purchase_invoice_no || purchaseId}`
          });
          
          newBalance -= baseAmountPaid;
        }

        // Update Supplier Balance
        db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, purchaseData.supplier_id);
      }

      AuditLogRepository.write({
        action: 'PURCHASE_CREATE',
        details: `Purchase ${purchaseId} created with ${purchaseData.items.length} items`
      });

      try {
        AccountingPostingService.postPurchase({
          purchaseId,
          date: purchaseData.date || new Date().toISOString(),
          grandTotal: baseGrandTotal,
          amountPaid: baseAmountPaid,
          taxAmount: baseTax,
          branchId,
          classId
        });
      } catch (err) {
        console.error('[PurchaseRepository] Accounting auto-post failed:', err);
      }

      return { success: true, id: purchaseId };
    });

    try {
      return transaction(payload);
    } catch (error: any) {
      console.error('[PurchaseRepository] Transaction failed:', error);
      throw error;
    }
  }
}
