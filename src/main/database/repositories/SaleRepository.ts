import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { TaxCalculationService } from './TaxCalculationService';
import { TaxRepository } from './TaxRepository';
import { CashierShiftRepository } from './CashierShiftRepository';
import { CustomerRepository } from './CustomerRepository';
import { JournalRepository } from './JournalRepository';

interface SaleItemInput {
  product_id: string;
  quantity: number;
  price: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  line_total?: number;
}

interface SaleCreateInput {
  invoiceNo: string;
  customerName: string;
  customer_id?: string | null;
  customer_type?: 'WALK_IN' | 'REGISTERED';
  date: string;
  sale_time?: string;
  total: number;
  status: 'Paid' | 'Credit';
  discount?: number;
  subtotal?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  total_amount?: number;
  tax_rate?: number;
  tax_code?: string;
  tax_mode?: 'inclusive' | 'exclusive';
  branch_id?: string;
  branch_name?: string;
  cashier_id?: string | null;
  cashier_name?: string | null;
  shift_id?: string | null;
  register_id?: string | null;
  payment_method?: string | null;
  class_id?: string | null;
  items: SaleItemInput[];
}

export class SaleRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sales ORDER BY date DESC, invoiceNo DESC').all();
  }

  static getRecent(filters: { cashier_id?: string; branch_id?: string; date_from?: string; date_to?: string; limit?: number } = {}) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM sales
      WHERE (@cashier_id IS NULL OR cashier_id=@cashier_id)
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@date_from IS NULL OR date >= @date_from)
        AND (@date_to IS NULL OR date <= @date_to)
      ORDER BY date DESC, sale_time DESC, created_at DESC
      LIMIT @limit
    `).all({
      cashier_id: filters.cashier_id || null,
      branch_id: filters.branch_id || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      limit: Math.max(1, Math.min(Number(filters.limit || 10), 100))
    });
  }

  static getById(invoiceNo: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sales WHERE invoiceNo = ?').get(invoiceNo);
  }

  static getItems(invoiceNo: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sale_items WHERE invoiceNo = ? ORDER BY created_at ASC').all(invoiceNo);
  }

  static getByCustomer(customerIdOrName: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM sales
      WHERE customer_id = @value OR customerName = @value
      ORDER BY date DESC, sale_time DESC, created_at DESC
    `).all({ value: customerIdOrName });
  }

  static getByShift(shiftId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM sales
      WHERE shift_id = ?
      ORDER BY date DESC, sale_time DESC, created_at DESC
    `).all(shiftId);
  }

  static getByBranch(branchId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM sales
      WHERE branch_id = ?
      ORDER BY date DESC, sale_time DESC, created_at DESC
    `).all(branchId);
  }

  static getByCashier(cashierId: string, filters: {
    branch_id?: string;
    date_from?: string;
    date_to?: string;
    shift_id?: string;
    limit?: number;
  } = {}) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM sales
      WHERE cashier_id = @cashier_id
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@date_from IS NULL OR date >= @date_from)
        AND (@date_to IS NULL OR date <= @date_to)
        AND (@shift_id IS NULL OR shift_id=@shift_id)
      ORDER BY date DESC, sale_time DESC, created_at DESC
      LIMIT @limit
    `).all({
      cashier_id: cashierId,
      branch_id: filters.branch_id || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      shift_id: filters.shift_id || null,
      limit: Math.max(1, Math.min(Number(filters.limit || 200), 2000))
    });
  }

  static getReceiptDetail(invoiceNo: string) {
    const db = getDatabase();
    const sale = this.getById(invoiceNo) as Record<string, any> | undefined;
    if (!sale) return null;
    const items = db.prepare(`
      SELECT
        si.*,
        p.name as product_name,
        p.sku as sku,
        p.barcode as barcode
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.invoiceNo = ?
      ORDER BY si.created_at ASC
    `).all(invoiceNo) as Array<Record<string, any>>;

    const salesReturn = db.prepare(`
      SELECT
        COUNT(*) as return_count,
        COALESCE(SUM(total_amount), 0) as return_total
      FROM sales_returns
      WHERE sale_id = ?
    `).get(invoiceNo) as { return_count: number; return_total: number };

    const stockMovementCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock_movements
      WHERE reference_type IN ('SALE','VOID_SALE')
        AND reference_id = ?
    `).get(invoiceNo) as { count: number };

    const accountingCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM journal_entries
      WHERE reference_type = 'SALE'
        AND reference_id = ?
    `).get(invoiceNo) as { count: number };

    const auditRows = db.prepare(`
      SELECT id, action, details, created_at
      FROM audit_logs
      WHERE details LIKE '%' || ? || '%'
      ORDER BY created_at DESC
      LIMIT 20
    `).all(invoiceNo);

    const grossSubtotal = Number(sale.subtotal || 0);
    const itemDiscounts = items.reduce((sum, i) => sum + Number(i.discount_amount || 0), 0);
    const invoiceDiscount = Math.max(0, Number(sale.discount_amount || 0) - itemDiscounts);
    const taxAmount = Number(sale.tax_amount || 0);
    const totalPaid = sale.status === 'Paid' ? Number(sale.total || 0) : 0;
    const balance = Math.max(0, Number(sale.total || 0) - totalPaid);

    return {
      sale,
      items,
      summary: {
        gross_subtotal: grossSubtotal,
        item_discounts: itemDiscounts,
        invoice_discount: invoiceDiscount,
        tax_amount: taxAmount,
        total: Number(sale.total || 0),
        total_paid: totalPaid,
        balance
      },
      statuses: {
        accounting_posted: accountingCount.count > 0,
        stock_posted: stockMovementCount.count > 0,
        return_status: salesReturn.return_count > 0 ? (salesReturn.return_total >= Number(sale.total || 0) ? 'RETURNED' : 'PARTIALLY_RETURNED') : 'NONE'
      },
      audit: auditRows
    };
  }

  static getAuditTrail(invoiceNo: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, action, details, created_at
      FROM audit_logs
      WHERE details LIKE '%' || ? || '%'
      ORDER BY created_at DESC
    `).all(invoiceNo);
  }

  static voidSale(invoiceNo: string, reason: string, actor: { user_id?: string; name?: string } = {}) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const sale = this.getById(invoiceNo) as Record<string, any> | undefined;
      if (!sale) throw new Error('Sale not found.');
      if (sale.status === 'VOIDED') throw new Error('Sale is already voided.');
      if (sale.status === 'RETURNED') throw new Error('Returned sale cannot be voided.');

      const items = this.getItems(invoiceNo) as Array<Record<string, any>>;
      const getProduct = db.prepare(`SELECT stock, cost FROM products WHERE id=?`);
      const updateStock = db.prepare(`UPDATE products SET stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`);
      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, branch_id, class_id, product_id, movement_type,
          quantity_in, quantity_out, reference_type, reference_id,
          previous_stock, new_stock, date, notes
        ) VALUES (
          @id, 'T001', @branch_id, @class_id, @product_id, 'VOID_SALE_REVERSAL',
          @quantity_in, 0, 'VOID_SALE', @reference_id,
          @previous_stock, @new_stock, @date, @notes
        )
      `);

      let cogsAmount = 0;
      for (const item of items) {
        const product = getProduct.get(item.product_id) as { stock: number; cost: number } | undefined;
        if (!product) continue;
        const prev = Number(product.stock || 0);
        const qty = Number(item.quantity || 0);
        const next = prev + qty;
        updateStock.run(next, item.product_id);
        cogsAmount += Number(product.cost || 0) * qty;
        insertStockMovement.run({
          id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          branch_id: sale.branch_id || 'B001',
          class_id: sale.class_id || null,
          product_id: item.product_id,
          quantity_in: qty,
          reference_id: invoiceNo,
          previous_stock: prev,
          new_stock: next,
          date: new Date().toISOString().split('T')[0],
          notes: `Stock reversal for void sale ${invoiceNo}`
        });
      }

      db.prepare(`
        UPDATE sales
        SET status='VOIDED', updated_at=CURRENT_TIMESTAMP
        WHERE invoiceNo=?
      `).run(invoiceNo);

      if (sale.customer_type === 'REGISTERED' && sale.customerName) {
        const creditChange = sale.status === 'Credit' ? -Number(sale.total || 0) : 0;
        CustomerRepository.createOrIncrementCredit(
          sale.customerName,
          creditChange,
          -Number(sale.total || 0),
          new Date().toISOString().split('T')[0]
        );
      }

      if (sale.shift_id && sale.status === 'Paid' && (sale.payment_method || 'Cash') === 'Cash') {
        CashierShiftRepository.addCashMovement({
          shift_id: sale.shift_id,
          movement_type: 'REFUND_CASH_OUT',
          amount: Number(sale.total || 0),
          payment_method: 'Cash',
          reference_type: 'VOID_SALE',
          reference_id: invoiceNo,
          notes: `Cash reversal for void sale ${invoiceNo}`
        });
      }

      const originalJournals = db.prepare(`
        SELECT id, entry_date, branch_id, class_id
        FROM journal_entries
        WHERE reference_type='SALE' AND reference_id=?
      `).all(invoiceNo) as Array<{ id: string; entry_date: string; branch_id?: string; class_id?: string | null }>;
      for (const journal of originalJournals) {
        const lines = db.prepare(`
          SELECT account_id, description, debit, credit
          FROM journal_entry_lines
          WHERE journal_entry_id=?
        `).all(journal.id) as Array<{ account_id: string; description: string; debit: number; credit: number }>;
        if (!lines.length) continue;
        JournalRepository.createJournal({
          entry_no: `REV-SALE-${invoiceNo}-${Math.floor(Math.random() * 1000)}`,
          entry_date: new Date().toISOString().split('T')[0],
          description: `Reversal for void sale ${invoiceNo}`,
          reference_type: 'SALE_VOID',
          reference_id: invoiceNo,
          branch_id: journal.branch_id || sale.branch_id || 'B001',
          class_id: journal.class_id || sale.class_id || null,
          lines: lines.map((line) => ({
            account_id: line.account_id,
            description: `Reversal: ${line.description || ''}`,
            debit: Number(line.credit || 0),
            credit: Number(line.debit || 0)
          }))
        });
      }

      AuditLogRepository.write({
        action: 'SALE_VOID',
        user_id: actor.user_id,
        details: `Sale ${invoiceNo} voided by ${actor.name || actor.user_id || 'system'}. Reason: ${reason || 'N/A'}`
      });

      return { success: true };
    });
    return tx();
  }

  static getHistory(filters: {
    branch_id?: string;
    customer?: string;
    cashier?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  } = {}) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM sales
      WHERE (@branch_id IS NULL OR branch_id = @branch_id)
        AND (
          @customer IS NULL
          OR customer_id = @customer
          OR lower(customerName) LIKE '%' || lower(@customer) || '%'
        )
        AND (
          @cashier IS NULL
          OR lower(cashier_id) LIKE '%' || lower(@cashier) || '%'
          OR lower(cashier_name) LIKE '%' || lower(@cashier) || '%'
        )
        AND (@date_from IS NULL OR date >= @date_from)
        AND (@date_to IS NULL OR date <= @date_to)
      ORDER BY date DESC, sale_time DESC, created_at DESC
      LIMIT @limit
    `).all({
      branch_id: filters.branch_id || null,
      customer: filters.customer || null,
      cashier: filters.cashier || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      limit: Math.max(1, Math.min(Number(filters.limit || 100), 1000))
    });
  }

  static create(sale: SaleCreateInput) {
    const db = getDatabase();
    const tx = db.transaction((payload: SaleCreateInput) => {
      const customerType = payload.customer_type || (payload.customer_id ? 'REGISTERED' : 'WALK_IN');
      if (payload.status === 'Credit' && customerType !== 'REGISTERED') {
        throw new Error('Credit/khata sale requires a registered customer.');
      }
      if (customerType === 'REGISTERED') {
        const customerKey = payload.customer_id || payload.customerName;
        const customer = customerKey ? CustomerRepository.getByName(customerKey) as any : null;
        if (!customer) throw new Error('Registered customer not found.');
        if (String(customer.status || 'active') === 'inactive') {
          throw new Error('Inactive customer cannot be used for new khata sale.');
        }
      }
      const grossSubtotal = payload.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
      if ((payload.discount_type || 'fixed') === 'percentage' && Number(payload.discount_value || 0) > 100) {
        throw new Error('Invoice percentage discount cannot exceed 100%.');
      }
      if ((payload.discount_type || 'fixed') === 'fixed' && Number(payload.discount_amount ?? payload.discount ?? 0) > grossSubtotal) {
        throw new Error('Invoice discount cannot exceed subtotal.');
      }
      if (Number(payload.total || 0) < 0) {
        throw new Error('Sale total cannot be negative.');
      }
      if (payload.cashier_id && payload.branch_id && payload.register_id) {
        if (!payload.shift_id) throw new Error('Start your day before creating POS sales.');
        const activeShift = CashierShiftRepository.getActiveShift(payload.cashier_id, payload.branch_id, payload.register_id);
        if (!activeShift || activeShift.id !== payload.shift_id) {
          throw new Error('No active shift found. Start your day before creating POS sales.');
        }
      }

      const stmt = db.prepare(`
        INSERT INTO sales (
          invoiceNo, tenant_id, branch_id, class_id, customerName, customer_id, customer_type,
          cashier_id, cashier_name, branch_name, shift_id, register_id, date, sale_time, payment_method,
          subtotal, total, total_amount, status, discount, discount_type, discount_value, discount_amount, tax_rate, tax_code, tax_mode, tax_amount
        )
        VALUES (
          @invoiceNo, 'T001', @branch_id, @class_id, @customerName, @customer_id, @customer_type,
          @cashier_id, @cashier_name, @branch_name, @shift_id, @register_id, @date, @sale_time, @payment_method,
          @subtotal, @total, @total_amount, @status, @discount, @discount_type, @discount_value, @discount_amount, @tax_rate, @tax_code, @tax_mode, @tax_amount
        )
      `);
      const branchId = payload.branch_id || 'B001';
      const classId = payload.class_id || null;
      const taxCode = payload.tax_code || TaxRepository.getDefaultTaxCode('sales');
      const configuredTax = taxCode ? TaxRepository.getTaxRateByCode(taxCode) : null;
      const effectiveRate = configuredTax?.rate ?? (payload.tax_rate ?? 0);
      const effectiveMode = payload.tax_mode || configuredTax?.mode || 'exclusive';
      const taxableBase = Math.max(0, payload.total - (payload.tax_rate ? payload.total * (payload.tax_rate / (100 + payload.tax_rate)) : 0));
      const taxCalc = TaxCalculationService.calculate({ amount: taxableBase, rate: effectiveRate, mode: effectiveMode });

      const info = stmt.run({
        ...payload,
        branch_id: branchId,
        class_id: classId,
        customer_id: payload.customer_id ?? null,
        customer_type: customerType,
        cashier_id: payload.cashier_id || null,
        cashier_name: payload.cashier_name || 'System Cashier',
        branch_name: payload.branch_name || '',
        shift_id: payload.shift_id || null,
        register_id: payload.register_id || null,
        sale_time: payload.sale_time || new Date().toISOString(),
        payment_method: payload.payment_method || (payload.status === 'Paid' ? 'Cash' : 'Credit'),
        subtotal: payload.subtotal ?? payload.items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0),
        discount: payload.discount ?? 0,
        discount_type: payload.discount_type || 'fixed',
        discount_value: payload.discount_value ?? (payload.discount ?? 0),
        discount_amount: payload.discount_amount ?? (payload.discount ?? 0),
        total_amount: payload.total_amount ?? payload.total,
        tax_rate: effectiveRate,
        tax_code: taxCode || configuredTax?.code || null,
        tax_mode: effectiveMode,
        tax_amount: taxCalc.taxAmount
      });

      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (
          id, invoiceNo, product_id, quantity, price, discount, discount_type, discount_value, discount_amount, line_total
        )
        VALUES (
          @id, @invoiceNo, @product_id, @quantity, @price, @discount, @discount_type, @discount_value, @discount_amount, @line_total
        )
      `);

      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, branch_id, class_id, product_id, movement_type,
          quantity_in, quantity_out, reference_type, reference_id,
          previous_stock, new_stock, date, notes
        ) VALUES (
          @id, 'T001', @branch_id, @class_id, @product_id, 'SALE',
          0, @quantity_out, 'SALE', @reference_id,
          @previous_stock, @new_stock, @date, @notes
        )
      `);

      const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const getStock = db.prepare('SELECT stock FROM products WHERE id = ?');
      const getCost = db.prepare('SELECT cost FROM products WHERE id = ?');
      let cogsAmount = 0;

      for (const item of payload.items) {
        const lineSubtotal = Number(item.price || 0) * Number(item.quantity || 0);
        const lineDiscountType = item.discount_type || 'fixed';
        if (lineDiscountType === 'percentage' && Number(item.discount_value || 0) > 100) {
          throw new Error(`Item percentage discount cannot exceed 100% for product ${item.product_id}.`);
        }
        const rawLineDiscount = lineDiscountType === 'percentage'
          ? lineSubtotal * (Math.min(100, Math.max(0, Number(item.discount_value || 0))) / 100)
          : Math.max(0, Number(item.discount_value || item.discount_amount || 0));
        const lineDiscount = Math.min(lineSubtotal, rawLineDiscount);
        const lineTotal = Math.max(0, Number(item.line_total ?? (lineSubtotal - lineDiscount)));
        insertSaleItem.run({
          id: `SI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          invoiceNo: payload.invoiceNo,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount: lineDiscount,
          discount_type: lineDiscountType,
          discount_value: Number(item.discount_value || 0),
          discount_amount: lineDiscount,
          line_total: lineTotal
        });

        const product = getStock.get(item.product_id) as { stock: number } | undefined;
        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }
        const previousStock = product.stock;
        const newStock = Math.max(0, previousStock - item.quantity);
        updateStock.run(newStock, item.product_id);
        const productCost = (getCost.get(item.product_id) as { cost: number } | undefined)?.cost ?? 0;
        cogsAmount += productCost * item.quantity;

        insertStockMovement.run({
          id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          branch_id: branchId,
          class_id: classId,
          product_id: item.product_id,
          quantity_out: item.quantity,
          reference_id: payload.invoiceNo,
          previous_stock: previousStock,
          new_stock: newStock,
          date: payload.date,
          notes: `Sold via Invoice ${payload.invoiceNo}`
        });
      }

      AuditLogRepository.write({
        action: 'SALE_CREATE',
        details: `Sale ${payload.invoiceNo} created with ${payload.items.length} items`
      });

      try {
        AccountingPostingService.postSale({
          invoiceNo: payload.invoiceNo,
          date: payload.date,
          total: payload.total,
          status: payload.status,
          cogsAmount,
          taxAmount: taxCalc.taxAmount,
          branchId,
          classId
        });
      } catch (err) {
        console.error('[SaleRepository] Accounting auto-post failed:', err);
      }

      if (payload.shift_id && payload.status === 'Paid' && (payload.payment_method || 'Cash') === 'Cash') {
        CashierShiftRepository.addCashMovement({
          shift_id: payload.shift_id,
          movement_type: 'SALE_CASH_IN',
          amount: payload.total,
          payment_method: 'Cash',
          reference_type: 'SALE',
          reference_id: payload.invoiceNo,
          notes: `Cash sale ${payload.invoiceNo}`
        });
      }

      return info.changes > 0;
    });

    return tx(sale);
  }
}
