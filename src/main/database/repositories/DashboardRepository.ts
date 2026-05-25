import { getDatabase } from '../connection';

export interface DashboardFilter {
  date?: string;
  date_from?: string;
  date_to?: string;
  branch_id?: string;
  cashier_id?: string;
  class_id?: string;
  register_id?: string;
}

export type DashboardMetricKey =
  | 'pos_sales'
  | 'invoice_sales'
  | 'cash_in_hand'
  | 'khata_due'
  | 'low_stock'
  | 'returns'
  | 'discounts'
  | 'open_shifts'
  | 'expenses'
  | 'top_products';

function toDateRange(filters: DashboardFilter) {
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = filters.date_from || filters.date || today;
  const dateTo = filters.date_to || filters.date || today;
  return { dateFrom, dateTo };
}

function dayBefore(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export class DashboardRepository {
  private static scopeClause(filters: DashboardFilter) {
    return {
      branchClause: '(@branch_id IS NULL OR branch_id=@branch_id)',
      cashierClause: '(@cashier_id IS NULL OR cashier_id=@cashier_id)',
      classClause: '(@class_id IS NULL OR class_id=@class_id)',
      registerClause: '(@register_id IS NULL OR register_id=@register_id)',
      params: {
        branch_id: filters.branch_id || null,
        cashier_id: filters.cashier_id || null,
        class_id: filters.class_id || null,
        register_id: filters.register_id || null
      }
    };
  }

  private static scopeClauseWithAlias(filters: DashboardFilter, alias: string) {
    return {
      branchClause: `(@branch_id IS NULL OR ${alias}.branch_id=@branch_id)`,
      cashierClause: `(@cashier_id IS NULL OR ${alias}.cashier_id=@cashier_id)`,
      classClause: `(@class_id IS NULL OR ${alias}.class_id=@class_id)`,
      registerClause: `(@register_id IS NULL OR ${alias}.register_id=@register_id)`,
      params: {
        branch_id: filters.branch_id || null,
        cashier_id: filters.cashier_id || null,
        class_id: filters.class_id || null,
        register_id: filters.register_id || null
      }
    };
  }

  static getOverview(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);
    const prevFrom = dayBefore(dateFrom);
    const prevTo = dayBefore(dateTo);
    const { branchClause, cashierClause, classClause, registerClause, params } = this.scopeClause(filters);

    const currentSales = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status='Paid' THEN total ELSE 0 END),0) as pos_sales,
        COALESCE(SUM(CASE WHEN status='Credit' THEN total ELSE 0 END),0) as credit_sales,
        COALESCE(SUM(COALESCE(discount_amount,0)),0) as discounts,
        COUNT(CASE WHEN status='Paid' THEN 1 END) as paid_count
      FROM sales
      WHERE date BETWEEN @date_from AND @date_to
        AND ${branchClause}
        AND ${cashierClause}
        AND ${classClause}
        AND ${registerClause}
    `).get({ ...params, date_from: dateFrom, date_to: dateTo }) as any;

    const previousSales = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN status='Paid' THEN total ELSE 0 END),0) as pos_sales
      FROM sales
      WHERE date BETWEEN @date_from AND @date_to
        AND ${branchClause}
        AND ${cashierClause}
        AND ${classClause}
        AND ${registerClause}
    `).get({ ...params, date_from: prevFrom, date_to: prevTo }) as any;

    const invoiceSales = db.prepare(`
      SELECT
        COALESCE(SUM(grand_total),0) as invoice_sales,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status IN ('Unpaid','Partially Paid') THEN 1 END) as pending_invoices
      FROM invoices
      WHERE invoice_date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@cashier_id IS NULL OR cashier_id=@cashier_id)
        AND (@class_id IS NULL OR class_id=@class_id)
        AND (@register_id IS NULL OR register_id=@register_id)
    `).get({ ...params, date_from: dateFrom, date_to: dateTo }) as any;

    const collections = db.prepare(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM customer_payments WHERE payment_date BETWEEN @date_from AND @date_to AND (@branch_id IS NULL OR branch_id=@branch_id)),0)
        + COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE payment_date BETWEEN @date_from AND @date_to AND (@branch_id IS NULL OR branch_id=@branch_id)),0)
        as total_collections
    `).get({ ...params, date_from: dateFrom, date_to: dateTo }) as any;

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as expenses
      FROM expenses
      WHERE date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@class_id IS NULL OR class_id=@class_id)
    `).get({ ...params, date_from: dateFrom, date_to: dateTo }) as any;

    const returns = db.prepare(`
      SELECT COALESCE(SUM(total_amount),0) as return_total, COUNT(*) as return_count
      FROM sales_returns
      WHERE date(created_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).get({ ...params, date_from: dateFrom, date_to: dateTo }) as any;

    const receivablesPayables = this.getReceivablesPayables(filters);
    const shifts = this.getShiftSummary(filters);
    const lowStock = this.getLowStock(filters);

    const scopedSales = this.scopeClauseWithAlias(filters, 's');
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(p.cost,0) * si.quantity),0) as cogs
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      WHERE s.status='Paid'
        AND s.date BETWEEN @date_from AND @date_to
        AND ${scopedSales.branchClause}
        AND ${scopedSales.cashierClause}
        AND ${scopedSales.classClause}
        AND ${scopedSales.registerClause}
    `).get({ ...scopedSales.params, date_from: dateFrom, date_to: dateTo }) as any;

    const grossProfit = Number(currentSales.pos_sales || 0) - Number(cogs.cogs || 0);
    const netProfit = grossProfit - Number(expenses.expenses || 0);

    return {
      date_from: dateFrom,
      date_to: dateTo,
      metrics: {
        today_pos_sales: Number(currentSales.pos_sales || 0),
        today_invoice_sales: Number(invoiceSales.invoice_sales || 0),
        total_collections: Number(collections.total_collections || 0),
        cash_in_hand: Number(shifts.cash_in_hand || 0),
        khata_outstanding: Number(receivablesPayables.khata_outstanding || 0),
        supplier_payables: Number(receivablesPayables.supplier_payables || 0),
        today_expenses: Number(expenses.expenses || 0),
        gross_profit_estimate: grossProfit,
        net_profit_estimate: netProfit,
        total_returns: Number(returns.return_total || 0),
        total_discounts: Number(currentSales.discounts || 0),
        low_stock_items: Number(lowStock.total || 0),
        open_shifts: Number(shifts.open_shifts || 0),
        cash_short_over: Number(shifts.cash_short_over || 0),
        pending_invoices: Number(invoiceSales.pending_invoices || 0),
        overdue_customers: Number(receivablesPayables.overdue_customers || 0)
      },
      trends: {
        pos_sales_pct: pctChange(Number(currentSales.pos_sales || 0), Number(previousSales.pos_sales || 0))
      }
    };
  }

  static getSalesTrend(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);
    const { branchClause, cashierClause, classClause, registerClause, params } = this.scopeClause(filters);
    const isSingleDay = dateFrom === dateTo;

    if (isSingleDay) {
      const rows = db.prepare(`
        SELECT
          strftime('%H:00', COALESCE(sale_time, created_at)) as bucket,
          COUNT(*) as transactions,
          COALESCE(SUM(total),0) as sales,
          COALESCE(SUM(COALESCE(discount_amount,0)),0) as discounts
        FROM sales
        WHERE status='Paid'
          AND date=@date
          AND ${branchClause}
          AND ${cashierClause}
          AND ${classClause}
          AND ${registerClause}
        GROUP BY strftime('%H:00', COALESCE(sale_time, created_at))
        ORDER BY bucket ASC
      `).all({ ...params, date: dateFrom });
      return { granularity: 'hourly', rows };
    }

    const rows = db.prepare(`
      SELECT
        date as bucket,
        COUNT(*) as transactions,
        COALESCE(SUM(total),0) as sales,
        COALESCE(SUM(COALESCE(discount_amount,0)),0) as discounts
      FROM sales
      WHERE status='Paid'
        AND date BETWEEN @date_from AND @date_to
        AND ${branchClause}
        AND ${cashierClause}
        AND ${classClause}
        AND ${registerClause}
      GROUP BY date
      ORDER BY date ASC
    `).all({ ...params, date_from: dateFrom, date_to: dateTo });

    return { granularity: 'daily', rows };
  }

  static getPaymentBreakdown(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);
    const { branchClause, cashierClause, classClause, registerClause, params } = this.scopeClause(filters);

    const rows = db.prepare(`
      SELECT
        UPPER(COALESCE(NULLIF(TRIM(payment_method),''),'UNKNOWN')) as payment_method,
        COUNT(*) as transactions,
        COALESCE(SUM(total),0) as amount
      FROM sales
      WHERE status='Paid'
        AND date BETWEEN @date_from AND @date_to
        AND ${branchClause}
        AND ${cashierClause}
        AND ${classClause}
        AND ${registerClause}
      GROUP BY UPPER(COALESCE(NULLIF(TRIM(payment_method),''),'UNKNOWN'))
      ORDER BY amount DESC
    `).all({ ...params, date_from: dateFrom, date_to: dateTo });

    return { rows, total: (rows as any[]).reduce((sum, r) => sum + Number(r.amount || 0), 0) };
  }

  static getTopProducts(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);
    const { branchClause, cashierClause, classClause, registerClause, params } = this.scopeClauseWithAlias(filters, 's');

    const rows = db.prepare(`
      SELECT
        si.product_id,
        COALESCE(p.name, si.product_id) as product_name,
        SUM(si.quantity) as qty,
        SUM(COALESCE(si.line_total, (si.price * si.quantity) - COALESCE(si.discount_amount,0))) as revenue,
        SUM(COALESCE(p.cost,0) * si.quantity) as cogs,
        SUM(COALESCE(si.line_total, (si.price * si.quantity) - COALESCE(si.discount_amount,0))) - SUM(COALESCE(p.cost,0) * si.quantity) as profit
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      WHERE s.status='Paid'
        AND s.date BETWEEN @date_from AND @date_to
        AND ${branchClause}
        AND ${cashierClause}
        AND ${classClause}
        AND ${registerClause}
      GROUP BY si.product_id, COALESCE(p.name, si.product_id)
      ORDER BY revenue DESC
      LIMIT 10
    `).all({ ...params, date_from: dateFrom, date_to: dateTo });

    return { rows };
  }

  static getRecentActivity(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);

    const rows = db.prepare(`
      SELECT action, details, created_at
      FROM audit_logs
      WHERE date(created_at) BETWEEN @date_from AND @date_to
      ORDER BY created_at DESC
      LIMIT 50
    `).all({ date_from: dateFrom, date_to: dateTo });

    return { rows };
  }

  static getShiftSummary(filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);

    const rows = db.prepare(`
      SELECT
        id,
        user_id,
        cashier_name,
        branch_id,
        register_id,
        opened_at,
        closed_at,
        status,
        opening_cash,
        expected_cash,
        counted_cash,
        difference
      FROM cashier_shifts
      WHERE date(opened_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@cashier_id IS NULL OR user_id=@cashier_id)
        AND (@register_id IS NULL OR register_id=@register_id)
      ORDER BY opened_at DESC
    `).all({
      date_from: dateFrom,
      date_to: dateTo,
      branch_id: filters.branch_id || null,
      cashier_id: filters.cashier_id || null,
      register_id: filters.register_id || null
    }) as any[];

    const openShifts = rows.filter((r) => r.status === 'OPEN' || r.status === 'SUSPENDED').length;
    const cashShortOver = rows.reduce((sum, r) => sum + Number(r.difference || 0), 0);
    const cashInHand = rows
      .filter((r) => r.status === 'OPEN' || r.status === 'SUSPENDED')
      .reduce((sum, r) => sum + Number(r.expected_cash || r.opening_cash || 0), 0);

    return { rows, open_shifts: openShifts, cash_short_over: cashShortOver, cash_in_hand: cashInHand };
  }

  static getLowStock(filters: DashboardFilter) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id as product_id, sku, name as product_name, branch_id, stock, min_stock_alert
      FROM products
      WHERE COALESCE(stock,0) <= COALESCE(min_stock_alert,0)
        AND (@branch_id IS NULL OR branch_id=@branch_id)
      ORDER BY (COALESCE(min_stock_alert,0)-COALESCE(stock,0)) DESC
      LIMIT 50
    `).all({ branch_id: filters.branch_id || null });
    return { rows, total: (rows as any[]).length };
  }

  static getReceivablesPayables(filters: DashboardFilter) {
    const db = getDatabase();
    const customer = db.prepare(`
      SELECT
        COALESCE(SUM(credit),0) as khata_outstanding,
        COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND date(due_date) < date('now') AND credit > 0 THEN 1 ELSE 0 END),0) as overdue_customers
      FROM customers
      WHERE COALESCE(status,'active')!='inactive'
    `).get() as any;

    const supplier = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(current_balance,0)),0) as supplier_payables
      FROM suppliers
      WHERE COALESCE(status,'active')='active'
    `).get() as any;

    const pendingInvoices = db.prepare(`
      SELECT COALESCE(SUM(balance_due),0) as pending_invoice_amount
      FROM invoices
      WHERE status IN ('Unpaid','Partially Paid')
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).get({ branch_id: filters.branch_id || null }) as any;

    return {
      khata_outstanding: Number(customer.khata_outstanding || 0),
      overdue_customers: Number(customer.overdue_customers || 0),
      supplier_payables: Number(supplier.supplier_payables || 0),
      pending_invoice_amount: Number(pendingInvoices.pending_invoice_amount || 0)
    };
  }

  static getDateDetail(date: string, filters: DashboardFilter) {
    const db = getDatabase();
    const scoped = {
      branch_id: filters.branch_id || null,
      cashier_id: filters.cashier_id || null,
      class_id: filters.class_id || null,
      register_id: filters.register_id || null,
      date
    };

    const sales = db.prepare(`
      SELECT invoiceNo, customerName, total, status, payment_method, cashier_name, sale_time
      FROM sales
      WHERE date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@cashier_id IS NULL OR cashier_id=@cashier_id)
        AND (@class_id IS NULL OR class_id=@class_id)
        AND (@register_id IS NULL OR register_id=@register_id)
      ORDER BY sale_time DESC
    `).all(scoped);

    const invoices = db.prepare(`
      SELECT invoice_no, customer_name, grand_total, amount_paid, balance_due, status
      FROM invoices
      WHERE invoice_date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const returns = db.prepare(`
      SELECT id, sale_id, total_amount, refund_method, created_at
      FROM sales_returns
      WHERE date(created_at)=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const expenses = db.prepare(`
      SELECT id, category, amount, paidTo, status
      FROM expenses
      WHERE date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const shifts = db.prepare(`
      SELECT id, cashier_name, register_id, opening_cash, expected_cash, counted_cash, difference, status
      FROM cashier_shifts
      WHERE date(opened_at)=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@cashier_id IS NULL OR user_id=@cashier_id)
    `).all(scoped);

    const topProducts = db.prepare(`
      SELECT COALESCE(p.name, si.product_id) as product_name, SUM(si.quantity) as qty, SUM(COALESCE(si.line_total,0)) as revenue
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      WHERE s.date=@date
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY COALESCE(p.name, si.product_id)
      ORDER BY revenue DESC
      LIMIT 10
    `).all(scoped);

    const customerPayments = db.prepare(`
      SELECT id, customer_name, amount, payment_method
      FROM customer_payments
      WHERE payment_date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const supplierPayments = db.prepare(`
      SELECT id, amount, payment_method, supplier_id
      FROM supplier_payments
      WHERE date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const journals = db.prepare(`
      SELECT entry_no, description, total_debit, total_credit
      FROM journal_entries
      WHERE entry_date=@date
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const discounts = db.prepare(`
      SELECT invoiceNo, discount_amount
      FROM sales
      WHERE date=@date
        AND COALESCE(discount_amount,0) > 0
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const voids = db.prepare(`
      SELECT invoiceNo, total, updated_at
      FROM sales
      WHERE date=@date
        AND status='VOIDED'
        AND (@branch_id IS NULL OR branch_id=@branch_id)
    `).all(scoped);

    const lowStock = this.getLowStock(filters).rows;

    return {
      date,
      sales,
      invoices,
      returns,
      expenses,
      shifts,
      top_products: topProducts,
      customer_payments: customerPayments,
      supplier_payments: supplierPayments,
      journal_summary: journals,
      tax_summary: {
        output: db.prepare(`SELECT COALESCE(SUM(tax_amount),0) as value FROM sales WHERE date=@date AND status='Paid' AND (@branch_id IS NULL OR branch_id=@branch_id)`).get(scoped),
        input: db.prepare(`SELECT COALESCE(SUM(tax_amount),0) as value FROM expenses WHERE date=@date AND (@branch_id IS NULL OR branch_id=@branch_id)`).get(scoped)
      },
      discounts,
      voids,
      low_stock_events: lowStock
    };
  }

  static getMetricDetail(metric: DashboardMetricKey, filters: DashboardFilter) {
    const db = getDatabase();
    const { dateFrom, dateTo } = toDateRange(filters);
    const scoped = {
      branch_id: filters.branch_id || null,
      cashier_id: filters.cashier_id || null,
      class_id: filters.class_id || null,
      register_id: filters.register_id || null,
      date_from: dateFrom,
      date_to: dateTo
    };

    const build = (title: string, summary: Record<string, any>, rows: any[], columns: string[]) => ({ title, summary, rows, columns });

    if (metric === 'pos_sales') {
      const rows = db.prepare(`
        SELECT invoiceNo, date, sale_time, customerName, payment_method, total, status, cashier_name
        FROM sales
        WHERE status='Paid'
          AND date BETWEEN @date_from AND @date_to
          AND (@branch_id IS NULL OR branch_id=@branch_id)
          AND (@cashier_id IS NULL OR cashier_id=@cashier_id)
          AND (@class_id IS NULL OR class_id=@class_id)
          AND (@register_id IS NULL OR register_id=@register_id)
        ORDER BY date DESC, sale_time DESC
      `).all(scoped);
      return build('POS Sales Detail', { date_from: dateFrom, date_to: dateTo, count: rows.length }, rows, ['invoiceNo', 'date', 'sale_time', 'customerName', 'payment_method', 'total', 'cashier_name']);
    }

    if (metric === 'invoice_sales') {
      const rows = db.prepare(`
        SELECT invoice_no, invoice_date, customer_name, status, grand_total, amount_paid, balance_due
        FROM invoices
        WHERE invoice_date BETWEEN @date_from AND @date_to
          AND (@branch_id IS NULL OR branch_id=@branch_id)
        ORDER BY invoice_date DESC, invoice_no DESC
      `).all(scoped);
      return build('Invoice Sales Detail', { date_from: dateFrom, date_to: dateTo, count: rows.length }, rows, ['invoice_no', 'invoice_date', 'customer_name', 'status', 'grand_total', 'amount_paid', 'balance_due']);
    }

    if (metric === 'cash_in_hand') {
      const shifts = this.getShiftSummary(filters);
      const rows = shifts.rows;
      return build('Cash In Hand (Shift/Drawer)', { cash_in_hand: shifts.cash_in_hand, open_shifts: shifts.open_shifts }, rows, ['cashier_name', 'register_id', 'status', 'opening_cash', 'expected_cash', 'counted_cash', 'difference']);
    }

    if (metric === 'khata_due') {
      const rows = db.prepare(`
        SELECT name as customer_name, phone, credit, due_date, due_days
        FROM customers
        WHERE COALESCE(credit,0) > 0
        ORDER BY credit DESC
      `).all();
      return build('Customer Khata Due', { count: rows.length }, rows, ['customer_name', 'phone', 'credit', 'due_date', 'due_days']);
    }

    if (metric === 'low_stock') {
      const low = this.getLowStock(filters);
      return build('Low Stock Products', { total: low.total }, low.rows, ['product_id', 'sku', 'product_name', 'branch_id', 'stock', 'min_stock_alert']);
    }

    if (metric === 'returns') {
      const salesReturns = db.prepare(`
        SELECT id, sale_id, branch_id, refund_method, total_amount, created_at
        FROM sales_returns
        WHERE date(created_at) BETWEEN @date_from AND @date_to
          AND (@branch_id IS NULL OR branch_id=@branch_id)
        ORDER BY created_at DESC
      `).all(scoped);
      const purchaseReturns = db.prepare(`
        SELECT id, purchase_id, branch_id, total_amount, created_at
        FROM purchase_returns
        WHERE date(created_at) BETWEEN @date_from AND @date_to
          AND (@branch_id IS NULL OR branch_id=@branch_id)
        ORDER BY created_at DESC
      `).all(scoped);
      const rows = [
        ...salesReturns.map((r: any) => ({ type: 'SALES_RETURN', ...r })),
        ...purchaseReturns.map((r: any) => ({ type: 'PURCHASE_RETURN', ...r }))
      ];
      return build('Returns Detail', { total: rows.length }, rows, ['type', 'id', 'branch_id', 'total_amount', 'created_at']);
    }

    if (metric === 'discounts') {
      const rows = db.prepare(`
        SELECT invoiceNo, date, customerName, cashier_name, discount_type, discount_value, discount_amount, total
        FROM sales
        WHERE date BETWEEN @date_from AND @date_to
          AND COALESCE(discount_amount,0) > 0
          AND (@branch_id IS NULL OR branch_id=@branch_id)
          AND (@cashier_id IS NULL OR cashier_id=@cashier_id)
        ORDER BY date DESC, invoiceNo DESC
      `).all(scoped);
      return build('Discount Transactions', { count: rows.length }, rows, ['invoiceNo', 'date', 'customerName', 'cashier_name', 'discount_type', 'discount_value', 'discount_amount', 'total']);
    }

    if (metric === 'open_shifts') {
      const rows = db.prepare(`
        SELECT id, user_id, cashier_name, branch_id, register_id, opened_at, status, opening_cash, expected_cash
        FROM cashier_shifts
        WHERE status IN ('OPEN','SUSPENDED')
          AND (@branch_id IS NULL OR branch_id=@branch_id)
          AND (@cashier_id IS NULL OR user_id=@cashier_id)
          AND (@register_id IS NULL OR register_id=@register_id)
        ORDER BY opened_at DESC
      `).all(scoped);
      return build('Open Shifts', { count: rows.length }, rows, ['id', 'cashier_name', 'branch_id', 'register_id', 'opened_at', 'status', 'opening_cash', 'expected_cash']);
    }

    if (metric === 'expenses') {
      const rows = db.prepare(`
        SELECT id, date, category, amount, paidTo, status
        FROM expenses
        WHERE date BETWEEN @date_from AND @date_to
          AND (@branch_id IS NULL OR branch_id=@branch_id)
          AND (@class_id IS NULL OR class_id=@class_id)
        ORDER BY date DESC, id DESC
      `).all(scoped);
      return build('Expense Transactions', { count: rows.length }, rows, ['id', 'date', 'category', 'amount', 'paidTo', 'status']);
    }

    const top = this.getTopProducts(filters);
    return build('Top Products', { count: top.rows.length }, top.rows, ['product_id', 'product_name', 'qty', 'revenue', 'profit']);
  }
}
