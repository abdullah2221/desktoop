import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { CustomerRepository } from './CustomerRepository';
import { CashierShiftRepository } from './CashierShiftRepository';

export interface SalesReturnItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_amount?: number;
  total: number;
}

export interface SalesReturnCreateInput {
  sale_id: string; // references sales(invoiceNo)
  customer_id?: string | null;
  branch_id?: string;
  shift_id?: string | null;
  refund_method: 'Cash' | 'Bank' | 'Store Credit';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  return_reason?: string;
  created_by?: string;
  items: SalesReturnItemInput[];
}

export interface SalesReturnResponse {
  success: boolean;
  returnId?: string;
  error?: string;
}

export class SalesReturnRepository {
  static getHistory() {
    const db = getDatabase();
    return db.prepare(`
      SELECT sr.*, s.customerName
      FROM sales_returns sr
      JOIN sales s ON sr.sale_id = s.invoiceNo
      ORDER BY sr.created_at DESC
    `).all();
  }

  static getReturnById(id: string) {
    const db = getDatabase();
    const ret = db.prepare('SELECT * FROM sales_returns WHERE id = ?').get(id) as any;
    if (ret) {
      ret.items = db.prepare(`
        SELECT sri.*, p.name as product_name
        FROM sales_return_items sri
        LEFT JOIN products p ON sri.product_id = p.id
        WHERE sri.sales_return_id = ?
      `).all(id);
    }
    return ret;
  }

  static getBySale(invoiceNo: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sales_returns WHERE sale_id = ?').all(invoiceNo);
  }

  static create(payload: SalesReturnCreateInput): SalesReturnResponse {
    const db = getDatabase();

    try {
      const tx = db.transaction((data: SalesReturnCreateInput) => {
        // 1. Validate that the sale exists
        const sale = db.prepare('SELECT invoiceNo, customerName, branch_id, customer_id, date FROM sales WHERE invoiceNo = ?').get(data.sale_id) as {
          invoiceNo: string;
          customerName: string;
          branch_id: string;
          customer_id?: string | null;
          date: string;
        } | undefined;

        if (!sale) {
          throw new Error(`Sale not found with invoice number: ${data.sale_id}`);
        }

        // 2. Validate returned quantities against original sale quantities and already returned quantities
        const originalItems = db.prepare('SELECT product_id, quantity FROM sale_items WHERE invoiceNo = ?').all(data.sale_id) as {
          product_id: string;
          quantity: number;
        }[];

        const alreadyReturnedItems = db.prepare(`
          SELECT sri.product_id, SUM(sri.quantity) as total_returned
          FROM sales_return_items sri
          JOIN sales_returns sr ON sri.sales_return_id = sr.id
          WHERE sr.sale_id = ?
          GROUP BY sri.product_id
        `).all(data.sale_id) as { product_id: string; total_returned: number }[];

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
            throw new Error(`Cannot return quantity ${item.quantity} for product ${item.product_id}. Maximum allowed return quantity is ${availableToReturn}.`);
          }
        }

        // 3. Insert sales_returns header
        const returnId = `SR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const branchId = data.branch_id || sale.branch_id || 'B001';
        const dateStr = new Date().toISOString().split('T')[0];

        const insertHeader = db.prepare(`
          INSERT INTO sales_returns (
            id, sale_id, customer_id, branch_id, shift_id, refund_method,
            subtotal, tax_amount, total_amount, notes, return_reason, created_by
          ) VALUES (
            @id, @sale_id, @customer_id, @branch_id, @shift_id, @refund_method,
            @subtotal, @tax_amount, @total_amount, @notes, @return_reason, @created_by
          )
        `);

        insertHeader.run({
          id: returnId,
          sale_id: data.sale_id,
          customer_id: sale.customerName || null,
          branch_id: branchId,
          shift_id: data.shift_id || null,
          refund_method: data.refund_method,
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          total_amount: data.total_amount,
          notes: data.notes || '',
          return_reason: data.return_reason || '',
          created_by: data.created_by || 'system'
        });

        // 4. Loop returned items
        const insertItem = db.prepare(`
          INSERT INTO sales_return_items (
            id, sales_return_id, product_id, quantity, unit_price, discount, tax_amount, total
          ) VALUES (
            @id, @sales_return_id, @product_id, @quantity, @unit_price, @discount, @tax_amount, @total
          )
        `);

        const getStock = db.prepare('SELECT stock, cost FROM products WHERE id = ?');
        const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const insertStockMovement = db.prepare(`
          INSERT INTO stock_movements (
            id, tenant_id, branch_id, class_id, product_id, movement_type,
            quantity_in, quantity_out, reference_type, reference_id,
            previous_stock, new_stock, date, notes
          ) VALUES (
            @id, 'T001', @branch_id, NULL, @product_id, 'SALES_RETURN',
            @quantity_in, 0, 'SALES_RETURN', @reference_id,
            @previous_stock, @new_stock, @date, @notes
          )
        `);

        let cogsAmount = 0;

        for (const item of data.items) {
          const sriId = `SRI-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          insertItem.run({
            id: sriId,
            sales_return_id: returnId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            tax_amount: item.tax_amount || 0,
            total: item.total
          });

          // Restore product stock
          const product = getStock.get(item.product_id) as { stock: number; cost: number } | undefined;
          if (product) {
            const previousStock = product.stock;
            const newStock = previousStock + item.quantity;
            updateStock.run(newStock, item.product_id);
            cogsAmount += product.cost * item.quantity;

            // Log stock movement
            insertStockMovement.run({
              id: `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              branch_id: branchId,
              product_id: item.product_id,
              quantity_in: item.quantity,
              reference_id: returnId,
              previous_stock: previousStock,
              new_stock: newStock,
              date: dateStr,
              notes: `Returned via Sales Return ${returnId} (Invoice ${data.sale_id})`
            });
          }
        }

        // 5. Update Customer credit if appropriate
        if (sale.customerName) {
          // Decrement customer totalPurchases and optionally credit balance if Store Credit or Credit invoice return
          const isCreditOrStoreCredit = data.refund_method === 'Store Credit';
          const creditChange = isCreditOrStoreCredit ? -data.total_amount : 0;
          CustomerRepository.createOrIncrementCredit(
            sale.customerName,
            creditChange,
            -data.total_amount,
            dateStr
          );
        }

        if (data.shift_id && data.refund_method === 'Cash') {
          CashierShiftRepository.addCashMovement({
            shift_id: data.shift_id,
            movement_type: 'REFUND_CASH_OUT',
            amount: data.total_amount,
            payment_method: 'Cash',
            reference_type: 'SALES_RETURN',
            reference_id: returnId,
            notes: `Cash refund for return ${returnId}`
          });
        }

        // 6. Post double-entry accounting journals
        try {
          AccountingPostingService.postSalesReturn({
            returnId,
            saleId: data.sale_id,
            date: dateStr,
            total: data.total_amount,
            refundMethod: data.refund_method,
            cogsAmount,
            taxAmount: data.tax_amount,
            branchId,
            classId: null
          });
        } catch (err) {
          console.error('[SalesReturnRepository] Accounting auto-post failed:', err);
        }

        AuditLogRepository.write({
          action: 'SALES_RETURN_CREATE',
          details: `Sales Return ${returnId} processed for invoice ${data.sale_id} with total ${data.total_amount}`
        });

        return returnId;
      });

      const returnId = tx(payload);
      return { success: true, returnId };
    } catch (error: any) {
      console.error('[SalesReturnRepository] Create failed:', error);
      return { success: false, error: error?.message || 'Failed to process sales return' };
    }
  }
}
