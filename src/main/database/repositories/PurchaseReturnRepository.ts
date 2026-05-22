import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';

export interface PurchaseReturnItemInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
  tax_amount?: number;
  total: number;
}

export interface PurchaseReturnCreateInput {
  purchase_id: string;
  supplier_id: string;
  branch_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  return_reason?: string;
  created_by?: string;
  items: PurchaseReturnItemInput[];
}

export interface PurchaseReturnResponse {
  success: boolean;
  returnId?: string;
  error?: string;
}

export class PurchaseReturnRepository {
  static getHistory() {
    const db = getDatabase();
    return db.prepare(`
      SELECT pr.*, s.name as supplier_name
      FROM purchase_returns pr
      JOIN suppliers s ON pr.supplier_id = s.id
      ORDER BY pr.created_at DESC
    `).all();
  }

  static getReturnById(id: string) {
    const db = getDatabase();
    const ret = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as any;
    if (ret) {
      ret.items = db.prepare(`
        SELECT pri.*, p.name as product_name
        FROM purchase_return_items pri
        LEFT JOIN products p ON pri.product_id = p.id
        WHERE pri.purchase_return_id = ?
      `).all(id);
    }
    return ret;
  }

  static getByPurchase(purchaseId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM purchase_returns WHERE purchase_id = ?').all(purchaseId);
  }

  static create(payload: PurchaseReturnCreateInput): PurchaseReturnResponse {
    const db = getDatabase();

    try {
      const tx = db.transaction((data: PurchaseReturnCreateInput) => {
        // 1. Validate purchase exists
        const purchase = db.prepare('SELECT id, supplier_id, branch_id FROM purchases WHERE id = ?').get(data.purchase_id) as {
          id: string;
          supplier_id: string;
          branch_id: string;
        } | undefined;

        if (!purchase) {
          throw new Error(`Purchase invoice not found: ${data.purchase_id}`);
        }

        // 2. Validate return quantities
        const originalItems = db.prepare('SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?').all(data.purchase_id) as {
          product_id: string;
          quantity: number;
        }[];

        const alreadyReturnedItems = db.prepare(`
          SELECT pri.product_id, SUM(pri.quantity) as total_returned
          FROM purchase_return_items pri
          JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
          WHERE pr.purchase_id = ?
          GROUP BY pri.product_id
        `).all(data.purchase_id) as { product_id: string; total_returned: number }[];

        const returnLimits = new Map<string, number>();
        for (const item of originalItems) {
          returnLimits.set(item.product_id, item.quantity);
        }

        for (const item of alreadyReturnedItems) {
          const limit = returnLimits.get(item.product_id) || 0;
          returnLimits.set(item.product_id, Math.max(0, limit - item.total_returned));
        }

        for (const item of data.items) {
          const availableToReturn = returnLimits.get(item.product_id) || 0;
          if (item.quantity > availableToReturn) {
            throw new Error(`Cannot return quantity ${item.quantity} for product ${item.product_id}. Maximum allowed supplier return is ${availableToReturn}.`);
          }
        }

        // 3. Create purchase_returns header
        const returnId = `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const branchId = data.branch_id || purchase.branch_id || 'B001';
        const dateStr = new Date().toISOString().split('T')[0];

        const insertHeader = db.prepare(`
          INSERT INTO purchase_returns (
            id, purchase_id, supplier_id, branch_id,
            subtotal, tax_amount, total_amount, notes, return_reason, created_by
          ) VALUES (
            @id, @purchase_id, @supplier_id, @branch_id,
            @subtotal, @tax_amount, @total_amount, @notes, @return_reason, @created_by
          )
        `);

        insertHeader.run({
          id: returnId,
          purchase_id: data.purchase_id,
          supplier_id: data.supplier_id,
          branch_id: branchId,
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          total_amount: data.total_amount,
          notes: data.notes || '',
          return_reason: data.return_reason || '',
          created_by: data.created_by || 'system'
        });

        // 4. Loop items
        const insertItem = db.prepare(`
          INSERT INTO purchase_return_items (
            id, purchase_return_id, product_id, quantity, unit_cost, tax_amount, total
          ) VALUES (
            @id, @purchase_return_id, @product_id, @quantity, @unit_cost, @tax_amount, @total
          )
        `);

        const getStock = db.prepare('SELECT stock FROM products WHERE id = ?');
        const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const insertStockMovement = db.prepare(`
          INSERT INTO stock_movements (
            id, tenant_id, branch_id, class_id, product_id, movement_type,
            quantity_in, quantity_out, reference_type, reference_id,
            previous_stock, new_stock, date, notes
          ) VALUES (
            @id, 'T001', @branch_id, NULL, @product_id, 'PURCHASE_RETURN',
            0, @quantity_out, 'PURCHASE_RETURN', @reference_id,
            @previous_stock, @new_stock, @date, @notes
          )
        `);

        for (const item of data.items) {
          const priId = `PRI-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          insertItem.run({
            id: priId,
            purchase_return_id: returnId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            tax_amount: item.tax_amount || 0,
            total: item.total
          });

          // Reduce product stock
          const product = getStock.get(item.product_id) as { stock: number } | undefined;
          if (product) {
            const previousStock = product.stock;
            const newStock = Math.max(0, previousStock - item.quantity);
            updateStock.run(newStock, item.product_id);

            // Log stock movement
            insertStockMovement.run({
              id: `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              branch_id: branchId,
              product_id: item.product_id,
              quantity_out: item.quantity,
              reference_id: returnId,
              previous_stock: previousStock,
              new_stock: newStock,
              date: dateStr,
              notes: `Returned to supplier via Purchase Return ${returnId} (Invoice ${data.purchase_id})`
            });
          }
        }

        // 5. Update supplier payable outstanding balance
        const supplier = db.prepare('SELECT current_balance FROM suppliers WHERE id = ?').get(data.supplier_id) as { current_balance: number } | undefined;
        const currentBalance = supplier?.current_balance ?? 0;
        const newBalance = currentBalance - data.total_amount;

        db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, data.supplier_id);

        // 6. Write to supplier ledger
        db.prepare(`
          INSERT INTO supplier_ledger (
            id, tenant_id, branch_id, supplier_id, date, type, reference_id, debit, credit, balance, notes
          ) VALUES (
            @id, 'T001', @branch_id, @supplier_id, @date, 'PURCHASE_RETURN', @reference_id, @debit, 0, @balance, @notes
          )
        `).run({
          id: `SL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          branch_id: branchId,
          supplier_id: data.supplier_id,
          date: dateStr,
          reference_id: returnId,
          debit: data.total_amount,
          balance: newBalance,
          notes: `Returned items against purchase reference ${data.purchase_id}`
        });

        // 7. Post double-entry accounting journals
        try {
          AccountingPostingService.postPurchaseReturn({
            returnId,
            purchaseId: data.purchase_id,
            date: dateStr,
            total: data.total_amount,
            refundMethod: 'Store Credit', // always deduct payable balance
            taxAmount: data.tax_amount,
            branchId,
            classId: null
          });
        } catch (err) {
          console.error('[PurchaseReturnRepository] Accounting auto-post failed:', err);
        }

        AuditLogRepository.write({
          action: 'PURCHASE_RETURN_CREATE',
          details: `Purchase Return ${returnId} processed for supplier ${data.supplier_id} with total ${data.total_amount}`
        });

        return returnId;
      });

      const returnId = tx(payload);
      return { success: true, returnId };
    } catch (error: any) {
      console.error('[PurchaseReturnRepository] Create failed:', error);
      return { success: false, error: error?.message || 'Failed to process supplier purchase return' };
    }
  }
}
