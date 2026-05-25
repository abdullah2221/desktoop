import { getDatabase } from '../connection';
import { TaxRepository } from './TaxRepository';

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  classId?: string;
  budgetId?: string;
}

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

function signedBalance(accountType: AccountType, opening: number, debit: number, credit: number) {
  if (accountType === 'Asset' || accountType === 'Expense') return opening + debit - credit;
  return opening + credit - debit;
}

function daysBetween(date: string, asOf: string) {
  const left = new Date(date).getTime();
  const right = new Date(asOf).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return 0;
  return Math.max(0, Math.floor((right - left) / 86400000));
}

function bucketForAge(age: number) {
  if (age <= 30) return 'current';
  if (age <= 60) return 'days31_60';
  if (age <= 90) return 'days61_90';
  return 'over90';
}

function emptyAgingTotals() {
  return { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
}

export class ReportRepository {
  private static accountBalances(dateTo: string, dateFrom?: string, branchId?: string, classId?: string) {
    const db = getDatabase();
    const dateFilter = dateFrom
      ? "WHERE je.status = 'posted' AND je.entry_date BETWEEN @dateFrom AND @dateTo"
      : "WHERE je.status = 'posted' AND je.entry_date <= @dateTo";
    const branchFilter = branchId ? 'AND je.branch_id = @branchId' : '';
    const classFilter = classId ? 'AND je.class_id = @classId' : '';

    return db.prepare(`
      WITH ledger AS (
        SELECT jl.account_id, SUM(jl.debit) as debit, SUM(jl.credit) as credit
        FROM journal_entry_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        ${dateFilter}
        ${branchFilter}
        ${classFilter}
        GROUP BY jl.account_id
      )
      SELECT
        a.id,
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(a.opening_balance, 0) as opening_balance,
        COALESCE(ledger.debit, 0) as debit,
        COALESCE(ledger.credit, 0) as credit
      FROM chart_of_accounts a
      LEFT JOIN ledger ON ledger.account_id = a.id
      WHERE a.status = 'active'
      ORDER BY a.account_code ASC
    `).all({ dateFrom, dateTo, branchId, classId }) as Array<{
      id: string;
      account_code: string;
      account_name: string;
      account_type: AccountType;
      opening_balance: number;
      debit: number;
      credit: number;
    }>;
  }

  static profitAndLoss({ dateFrom, dateTo, branchId, classId }: ReportDateRange) {
    const rows = this.accountBalances(dateTo, dateFrom, branchId, classId).filter((row) => row.account_type === 'Income' || row.account_type === 'Expense');
    const income = rows
      .filter((row) => row.account_type === 'Income')
      .map((row) => ({ ...row, amount: signedBalance(row.account_type, 0, row.debit, row.credit) }))
      .filter((row) => Math.abs(row.amount) > 0.001);
    const expenses = rows
      .filter((row) => row.account_type === 'Expense')
      .map((row) => ({ ...row, amount: signedBalance(row.account_type, 0, row.debit, row.credit) }))
      .filter((row) => Math.abs(row.amount) > 0.001);
    const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);
    const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);

    return {
      dateFrom,
      dateTo,
      branchId,
      classId,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses
    };
  }

  static balanceSheet(dateTo: string, branchId?: string) {
    const rows = this.accountBalances(dateTo, undefined, branchId).map((row) => ({
      ...row,
      balance: signedBalance(row.account_type, row.opening_balance, row.debit, row.credit)
    }));
    const assets = rows.filter((row) => row.account_type === 'Asset' && Math.abs(row.balance) > 0.001);
    const liabilities = rows.filter((row) => row.account_type === 'Liability' && Math.abs(row.balance) > 0.001);
    const equityAccounts = rows.filter((row) => row.account_type === 'Equity' && Math.abs(row.balance) > 0.001);
    const income = rows.filter((row) => row.account_type === 'Income').reduce((sum, row) => sum + row.balance, 0);
    const expenses = rows.filter((row) => row.account_type === 'Expense').reduce((sum, row) => sum + row.balance, 0);
    const retainedEarnings = income - expenses;
    const equity = retainedEarnings === 0
      ? equityAccounts
      : [...equityAccounts, {
        id: 'REPORT-RETAINED-EARNINGS',
        account_code: '3900',
        account_name: 'Current Earnings',
        account_type: 'Equity' as AccountType,
        opening_balance: 0,
        debit: 0,
        credit: retainedEarnings,
        balance: retainedEarnings
      }];
    const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0);
    const totalEquity = equity.reduce((sum, row) => sum + row.balance, 0);

    return {
      dateTo,
      branchId,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      difference: totalAssets - (totalLiabilities + totalEquity)
    };
  }

  static cashFlow({ dateFrom, dateTo }: ReportDateRange) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        je.entry_date,
        je.reference_type,
        je.description,
        a.account_code,
        a.account_name,
        jl.debit,
        jl.credit
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts a ON a.id = jl.account_id
      WHERE je.status = 'posted'
        AND je.entry_date BETWEEN ? AND ?
        AND a.account_code IN ('1000', '1010')
      ORDER BY je.entry_date ASC, je.created_at ASC
    `).all(dateFrom, dateTo) as Array<{ reference_type: string; debit: number; credit: number }>;

    const sections = {
      operating: { label: 'Operating Activities', total: 0 },
      investing: { label: 'Investing Activities', total: 0 },
      financing: { label: 'Financing Activities', total: 0 }
    };

    for (const row of rows) {
      const amount = (row.debit || 0) - (row.credit || 0);
      const section = row.reference_type === 'BANK_ACCOUNT_OPENING' || row.reference_type === 'MONEY_TRANSACTION' ? 'financing' : 'operating';
      sections[section].total += amount;
    }

    return {
      dateFrom,
      dateTo,
      sections,
      netCashFlow: sections.operating.total + sections.investing.total + sections.financing.total,
      rows
    };
  }

  static trialBalance({ dateFrom, dateTo, branchId, classId }: ReportDateRange) {
    const rows = this.accountBalances(dateTo, dateFrom, branchId, classId).map((row) => {
      const balance = signedBalance(row.account_type, 0, row.debit, row.credit);
      const normalDebit = row.account_type === 'Asset' || row.account_type === 'Expense';
      return {
        ...row,
        debit_balance: normalDebit ? Math.max(balance, 0) : Math.max(-balance, 0),
        credit_balance: normalDebit ? Math.max(-balance, 0) : Math.max(balance, 0)
      };
    }).filter((row) => row.debit_balance > 0.001 || row.credit_balance > 0.001);

    const totalDebit = rows.reduce((sum, row) => sum + row.debit_balance, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit_balance, 0);
    return { dateFrom, dateTo, branchId, classId, rows, totalDebit, totalCredit, difference: totalDebit - totalCredit };
  }

  static generalLedger({ dateFrom, dateTo }: ReportDateRange) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        je.entry_date,
        je.entry_no,
        je.description as journal_description,
        je.reference_type,
        je.reference_id,
        a.account_code,
        a.account_name,
        a.account_type,
        jl.description,
        jl.debit,
        jl.credit
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts a ON a.id = jl.account_id
      WHERE je.status = 'posted'
        AND je.entry_date BETWEEN ? AND ?
      ORDER BY a.account_code ASC, je.entry_date ASC, je.created_at ASC
    `).all(dateFrom, dateTo) as Array<Record<string, any>>;

    const running: Record<string, number> = {};
    return rows.map((row) => {
      const debit = Number(row.debit || 0);
      const credit = Number(row.credit || 0);
      const normalChange = row.account_type === 'Asset' || row.account_type === 'Expense' ? debit - credit : credit - debit;
      running[row.account_code] = (running[row.account_code] || 0) + normalChange;
      return { ...row, running_balance: running[row.account_code] };
    });
  }

  static arAging(dateTo: string) {
    const db = getDatabase();
    const invoiceRows = db.prepare(`
      SELECT customer_name as name, COALESCE(due_date, invoice_date) as aging_date, balance_due as amount
      FROM invoices
      WHERE status IN ('Unpaid', 'Partially Paid') AND balance_due > 0 AND invoice_date <= ?
    `).all(dateTo) as Array<{ name: string; aging_date: string; amount: number }>;
    const customerRows = db.prepare(`
      SELECT name, COALESCE(lastPayment, updated_at, created_at) as aging_date, credit as amount
      FROM customers
      WHERE credit > 0
    `).all() as Array<{ name: string; aging_date: string; amount: number }>;

    return this.buildAging([...invoiceRows, ...customerRows], dateTo);
  }

  static apAging(dateTo: string) {
    const db = getDatabase();
    const purchaseRows = db.prepare(`
      SELECT COALESCE(s.name, 'Unassigned Supplier') as name, p.date as aging_date, p.remaining_payable as amount
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.remaining_payable > 0 AND p.date <= ?
    `).all(dateTo) as Array<{ name: string; aging_date: string; amount: number }>;
    const supplierRows = db.prepare(`
      SELECT name, COALESCE(updated_at, created_at) as aging_date, current_balance as amount
      FROM suppliers
      WHERE current_balance > 0
    `).all() as Array<{ name: string; aging_date: string; amount: number }>;

    return this.buildAging([...purchaseRows, ...supplierRows], dateTo);
  }

  private static buildAging(rows: Array<{ name: string; aging_date: string; amount: number }>, dateTo: string) {
    type AgingRow = ReturnType<typeof emptyAgingTotals> & { name: string };
    type AgingBucket = keyof ReturnType<typeof emptyAgingTotals>;
    const byName = new Map<string, AgingRow>();
    const totals = emptyAgingTotals();
    for (const row of rows) {
      const amount = Number(row.amount || 0);
      if (amount <= 0) continue;
      const bucket = bucketForAge(daysBetween(row.aging_date, dateTo)) as AgingBucket;
      const current = byName.get(row.name) || { name: row.name, ...emptyAgingTotals() };
      current[bucket] += amount;
      current.total += amount;
      totals[bucket] += amount;
      totals.total += amount;
      byName.set(row.name, current);
    }
    return { dateTo, rows: Array.from(byName.values()).sort((a, b) => b.total - a.total), totals };
  }

  static inventoryValuation() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        p.id,
        p.sku,
        p.name,
        p.category,
        COALESCE(p.stock, 0) as quantity_on_hand,
        COALESCE(p.cost, 0) as unit_cost,
        COALESCE(p.price, 0) as sale_price,
        COALESCE(p.stock, 0) * COALESCE(p.cost, 0) as inventory_value
      FROM products p
      WHERE COALESCE(p.status, 'active') = 'active'
      ORDER BY p.name ASC
    `).all() as Array<{ inventory_value: number }>;
    return {
      rows,
      totalQuantity: rows.reduce((sum: number, row: any) => sum + Number(row.quantity_on_hand || 0), 0),
      totalValue: rows.reduce((sum, row) => sum + Number(row.inventory_value || 0), 0)
    };
  }

  static taxSummary({ dateFrom, dateTo }: ReportDateRange) {
    return {
      dateFrom,
      dateTo,
      output: TaxRepository.getOutputTaxReport(dateFrom, dateTo),
      input: TaxRepository.getInputTaxReport(dateFrom, dateTo),
      summary: TaxRepository.getTaxSummary(dateFrom, dateTo)
    };
  }

  static salesByCustomerProduct({ dateFrom, dateTo }: ReportDateRange) {
    const db = getDatabase();
    const byCustomer = db.prepare(`
      SELECT customer_name, COUNT(*) as invoices, SUM(grand_total) as total_sales, SUM(balance_due) as balance_due
      FROM invoices
      WHERE status IN ('Unpaid', 'Partially Paid', 'Paid') AND invoice_date BETWEEN ? AND ?
      GROUP BY customer_name
      ORDER BY total_sales DESC
    `).all(dateFrom, dateTo);
    const byProduct = db.prepare(`
      SELECT pr.name as product_name, SUM(ii.quantity) as quantity, SUM(ii.line_total) as total_sales
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      LEFT JOIN products pr ON pr.id = ii.product_id
      WHERE i.status IN ('Unpaid', 'Partially Paid', 'Paid') AND i.invoice_date BETWEEN ? AND ?
      GROUP BY ii.product_id, pr.name
      ORDER BY total_sales DESC
    `).all(dateFrom, dateTo);
    return { dateFrom, dateTo, byCustomer, byProduct };
  }

  static purchasesBySupplierProduct({ dateFrom, dateTo }: ReportDateRange) {
    const db = getDatabase();
    const bySupplier = db.prepare(`
      SELECT COALESCE(s.name, 'Unassigned Supplier') as supplier_name, COUNT(*) as purchases, SUM(p.grand_total) as total_purchases, SUM(p.remaining_payable) as remaining_payable
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.date BETWEEN ? AND ?
      GROUP BY supplier_name
      ORDER BY total_purchases DESC
    `).all(dateFrom, dateTo);
    const byProduct = db.prepare(`
      SELECT pr.name as product_name, SUM(pi.quantity) as quantity, SUM(pi.line_total) as total_purchases
      FROM purchase_items pi
      JOIN purchases p ON p.id = pi.purchase_id
      LEFT JOIN products pr ON pr.id = pi.product_id
      WHERE p.date BETWEEN ? AND ?
      GROUP BY pi.product_id, pr.name
      ORDER BY total_purchases DESC
    `).all(dateFrom, dateTo);
    return { dateFrom, dateTo, bySupplier, byProduct };
  }

  static expenseSummary({ dateFrom, dateTo }: ReportDateRange) {
    const db = getDatabase();
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as entries, SUM(amount) as total_amount, SUM(COALESCE(tax_amount, 0)) as tax_amount
      FROM expenses
      WHERE date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total_amount DESC
    `).all(dateFrom, dateTo);
    const total = (byCategory as Array<{ total_amount: number }>).reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    return { dateFrom, dateTo, byCategory, total };
  }

  static budgetVsActual({ dateFrom, dateTo, branchId, classId, budgetId }: ReportDateRange) {
    const db = getDatabase();
    const budgetFilter = budgetId ? 'AND b.id = @budgetId' : '';
    const branchFilter = branchId ? 'AND (b.branch_id = @branchId OR b.branch_id IS NULL)' : '';
    const classFilter = classId ? 'AND (b.class_id = @classId OR b.class_id IS NULL)' : '';
    const rows = db.prepare(`
      WITH selected_budget AS (
        SELECT b.*
        FROM budgets b
        WHERE b.status IN ('Draft', 'Active', 'Closed')
          AND b.date_from <= @dateTo
          AND b.date_to >= @dateFrom
          ${budgetFilter}
          ${branchFilter}
          ${classFilter}
      ),
      planned AS (
        SELECT
          bl.account_id,
          SUM(bl.amount) as budget_amount,
          GROUP_CONCAT(DISTINCT sb.id) as budget_ids,
          COALESCE(MAX(sb.branch_id), @branchId) as effective_branch_id,
          COALESCE(MAX(sb.class_id), @classId) as effective_class_id
        FROM budget_lines bl
        JOIN selected_budget sb ON sb.id = bl.budget_id
        GROUP BY bl.account_id
      ),
      actuals AS (
        SELECT
          jl.account_id,
          SUM(jl.debit) as debit,
          SUM(jl.credit) as credit
        FROM journal_entry_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE je.status = 'posted'
          AND je.entry_date BETWEEN @dateFrom AND @dateTo
          AND (@branchId IS NULL OR je.branch_id = @branchId)
          AND (@classId IS NULL OR je.class_id = @classId)
        GROUP BY jl.account_id
      )
      SELECT
        a.id as account_id,
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(p.budget_amount, 0) as budget_amount,
        COALESCE(actuals.debit, 0) as debit,
        COALESCE(actuals.credit, 0) as credit,
        p.budget_ids
      FROM planned p
      JOIN chart_of_accounts a ON a.id = p.account_id
      LEFT JOIN actuals ON actuals.account_id = p.account_id
      ORDER BY a.account_code ASC
    `).all({ dateFrom, dateTo, branchId: branchId || null, classId: classId || null, budgetId: budgetId || null }) as Array<{
      account_id: string;
      account_code: string;
      account_name: string;
      account_type: AccountType;
      budget_amount: number;
      debit: number;
      credit: number;
      budget_ids: string;
    }>;

    const reportRows = rows.map((row) => {
      const actual_amount = signedBalance(row.account_type, 0, row.debit, row.credit);
      const variance_amount = actual_amount - Number(row.budget_amount || 0);
      const variance_percentage = Number(row.budget_amount || 0) === 0 ? null : (variance_amount / Math.abs(Number(row.budget_amount))) * 100;
      return { ...row, actual_amount, variance_amount, variance_percentage };
    });
    return {
      dateFrom,
      dateTo,
      branchId,
      classId,
      budgetId,
      rows: reportRows,
      totalBudget: reportRows.reduce((sum, row) => sum + Number(row.budget_amount || 0), 0),
      totalActual: reportRows.reduce((sum, row) => sum + Number(row.actual_amount || 0), 0),
      totalVariance: reportRows.reduce((sum, row) => sum + Number(row.variance_amount || 0), 0)
    };
  }

  static classProfitAndLoss({ dateFrom, dateTo, branchId, classId }: ReportDateRange) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        COALESCE(c.id, 'UNASSIGNED') as class_id,
        COALESCE(c.class_code, 'UNASSIGNED') as class_code,
        COALESCE(c.class_name, 'Unassigned') as class_name,
        a.account_type,
        a.account_code,
        SUM(jl.debit) as debit,
        SUM(jl.credit) as credit
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts a ON a.id = jl.account_id
      LEFT JOIN classes c ON c.id = je.class_id
      WHERE je.status = 'posted'
        AND je.entry_date BETWEEN @dateFrom AND @dateTo
        AND a.account_type IN ('Income', 'Expense')
        AND (@branchId IS NULL OR je.branch_id = @branchId)
        AND (@classId IS NULL OR je.class_id = @classId)
      GROUP BY COALESCE(c.id, 'UNASSIGNED'), COALESCE(c.class_code, 'UNASSIGNED'), COALESCE(c.class_name, 'Unassigned'), a.account_type, a.account_code
      ORDER BY class_code ASC
    `).all({ dateFrom, dateTo, branchId: branchId || null, classId: classId || null }) as Array<{
      class_id: string;
      class_code: string;
      class_name: string;
      account_type: AccountType;
      account_code: string;
      debit: number;
      credit: number;
    }>;

    const byClass = new Map<string, { class_id: string; class_code: string; class_name: string; income: number; cogs: number; expenses: number; grossProfit: number; netProfit: number }>();
    for (const row of rows) {
      const current = byClass.get(row.class_id) || {
        class_id: row.class_id,
        class_code: row.class_code,
        class_name: row.class_name,
        income: 0,
        cogs: 0,
        expenses: 0,
        grossProfit: 0,
        netProfit: 0
      };
      const amount = signedBalance(row.account_type, 0, row.debit, row.credit);
      if (row.account_type === 'Income') current.income += amount;
      else if (row.account_code === '5000') current.cogs += amount;
      else current.expenses += amount;
      current.grossProfit = current.income - current.cogs;
      current.netProfit = current.income - current.cogs - current.expenses;
      byClass.set(row.class_id, current);
    }
    const classes = Array.from(byClass.values()).sort((a, b) => b.netProfit - a.netProfit);
    return {
      dateFrom,
      dateTo,
      branchId,
      classId,
      classes,
      totals: {
        income: classes.reduce((sum, row) => sum + row.income, 0),
        cogs: classes.reduce((sum, row) => sum + row.cogs, 0),
        expenses: classes.reduce((sum, row) => sum + row.expenses, 0),
        netProfit: classes.reduce((sum, row) => sum + row.netProfit, 0)
      }
    };
  }

  static customerBalanceReport() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        c.name as customer_name,
        c.phone,
        c.whatsapp,
        c.credit_limit,
        c.due_days,
        c.status,
        c.credit as current_balance,
        c.lastPayment
      FROM customers c
      WHERE COALESCE(c.status, 'active') != 'inactive'
      ORDER BY c.credit DESC, c.name ASC
    `).all();
    const totalOutstanding = (rows as any[]).reduce((sum, row) => sum + Number(row.current_balance || 0), 0);
    return { rows, totalOutstanding };
  }

  static customerAgingReport(asOfDate: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        c.name as customer_name,
        c.credit as balance,
        c.due_days,
        c.lastPayment
      FROM customers c
      WHERE COALESCE(c.status, 'active') != 'inactive'
        AND COALESCE(c.credit, 0) > 0
      ORDER BY c.credit DESC
    `).all() as Array<{ customer_name: string; balance: number; due_days: number; lastPayment: string }>;

    const asOf = new Date(asOfDate);
    const mapped = rows.map((row) => {
      const baseDate = new Date(row.lastPayment || asOfDate);
      const dueDate = new Date(baseDate.getTime() + Math.max(0, Number(row.due_days || 0)) * 86400000);
      const overdueDays = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000));
      const bucket = overdueDays <= 30 ? '0-30' : overdueDays <= 60 ? '31-60' : overdueDays <= 90 ? '61-90' : '90+';
      return { ...row, due_date: dueDate.toISOString().split('T')[0], overdue_days: overdueDays, aging_bucket: bucket };
    });
    return {
      asOfDate,
      rows: mapped,
      totals: {
        total: mapped.reduce((sum, row) => sum + Number(row.balance || 0), 0),
        current: mapped.filter((row) => row.overdue_days === 0).reduce((sum, row) => sum + Number(row.balance || 0), 0),
        days_30: mapped.filter((row) => row.aging_bucket === '0-30' && row.overdue_days > 0).reduce((sum, row) => sum + Number(row.balance || 0), 0),
        days_60: mapped.filter((row) => row.aging_bucket === '31-60').reduce((sum, row) => sum + Number(row.balance || 0), 0),
        days_90: mapped.filter((row) => row.aging_bucket === '61-90').reduce((sum, row) => sum + Number(row.balance || 0), 0),
        over_90: mapped.filter((row) => row.aging_bucket === '90+').reduce((sum, row) => sum + Number(row.balance || 0), 0)
      }
    };
  }

  static paymentCollectionReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const khataPayments = db.prepare(`
      SELECT customer_name, SUM(amount) as amount
      FROM customer_payments
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY customer_name
    `).all(dateFrom, dateTo) as Array<{ customer_name: string; amount: number }>;
    const invoicePayments = db.prepare(`
      SELECT i.customer_name, SUM(ip.amount) as amount
      FROM invoice_payments ip
      JOIN invoices i ON i.id = ip.invoice_id
      WHERE ip.payment_date BETWEEN ? AND ?
      GROUP BY i.customer_name
    `).all(dateFrom, dateTo) as Array<{ customer_name: string; amount: number }>;
    const byCustomer = new Map<string, { customer_name: string; khata_payments: number; invoice_payments: number; total_collected: number }>();
    for (const row of khataPayments) {
      const current = byCustomer.get(row.customer_name) || { customer_name: row.customer_name, khata_payments: 0, invoice_payments: 0, total_collected: 0 };
      current.khata_payments += Number(row.amount || 0);
      current.total_collected = current.khata_payments + current.invoice_payments;
      byCustomer.set(row.customer_name, current);
    }
    for (const row of invoicePayments) {
      const current = byCustomer.get(row.customer_name) || { customer_name: row.customer_name, khata_payments: 0, invoice_payments: 0, total_collected: 0 };
      current.invoice_payments += Number(row.amount || 0);
      current.total_collected = current.khata_payments + current.invoice_payments;
      byCustomer.set(row.customer_name, current);
    }
    const rows = Array.from(byCustomer.values()).sort((a, b) => b.total_collected - a.total_collected);
    return {
      dateFrom,
      dateTo,
      rows,
      totals: {
        khata_payments: rows.reduce((sum, row) => sum + row.khata_payments, 0),
        invoice_payments: rows.reduce((sum, row) => sum + row.invoice_payments, 0),
        total_collected: rows.reduce((sum, row) => sum + row.total_collected, 0)
      }
    };
  }

  static shiftSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.id as shift_id,
        s.user_id,
        s.cashier_name,
        s.branch_id,
        b.branch_name,
        s.register_id,
        s.opened_at,
        s.closed_at,
        s.status,
        s.opening_cash,
        s.expected_cash,
        s.counted_cash,
        s.difference,
        COALESCE(SUM(CASE WHEN sl.status='Paid' THEN sl.total ELSE 0 END),0) as paid_sales,
        COALESCE(SUM(CASE WHEN sl.status='VOIDED' THEN 1 ELSE 0 END),0) as total_voids,
        COALESCE(COUNT(DISTINCT CASE WHEN sl.status='Paid' THEN sl.invoiceNo END),0) as total_transactions
      FROM cashier_shifts s
      LEFT JOIN branches b ON b.id=s.branch_id
      LEFT JOIN sales sl ON sl.shift_id=s.id
      WHERE date(s.opened_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY s.id
      ORDER BY s.opened_at DESC
    `).all({
      date_from: dateFrom,
      date_to: dateTo,
      branch_id: branchId || null
    });
    return {
      dateFrom,
      dateTo,
      branchId: branchId || null,
      rows,
      totals: {
        shifts: (rows as any[]).length,
        paid_sales: (rows as any[]).reduce((sum, row) => sum + Number(row.paid_sales || 0), 0),
        shortages: (rows as any[]).filter((row) => Number(row.difference || 0) < 0).length,
        overages: (rows as any[]).filter((row) => Number(row.difference || 0) > 0).length
      }
    };
  }

  static cashierDiscrepancyReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.user_id,
        s.cashier_name,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        COUNT(*) as total_shifts,
        COALESCE(SUM(CASE WHEN COALESCE(s.difference,0) < 0 THEN ABS(s.difference) ELSE 0 END),0) as total_short_amount,
        COALESCE(SUM(CASE WHEN COALESCE(s.difference,0) > 0 THEN s.difference ELSE 0 END),0) as total_over_amount,
        COALESCE(SUM(CASE WHEN ABS(COALESCE(s.difference,0)) >= 500 THEN 1 ELSE 0 END),0) as suspicious_shift_count
      FROM cashier_shifts s
      LEFT JOIN branches b ON b.id=s.branch_id
      WHERE date(s.opened_at) BETWEEN @date_from AND @date_to
        AND s.status IN ('CLOSED','FORCE_CLOSED')
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY s.user_id, s.cashier_name, s.branch_id, COALESCE(b.branch_name, s.branch_id)
      ORDER BY suspicious_shift_count DESC, total_short_amount DESC
    `).all({
      date_from: dateFrom,
      date_to: dateTo,
      branch_id: branchId || null
    });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static dailySalesSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.date,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        COUNT(CASE WHEN s.status='Paid' THEN 1 END) as paid_transactions,
        COUNT(CASE WHEN s.status='Credit' THEN 1 END) as credit_transactions,
        COUNT(CASE WHEN s.status='VOIDED' THEN 1 END) as voided_transactions,
        COALESCE(SUM(CASE WHEN s.status='Paid' THEN s.total ELSE 0 END),0) as paid_sales,
        COALESCE(SUM(CASE WHEN s.status='Credit' THEN s.total ELSE 0 END),0) as credit_sales,
        COALESCE(SUM(CASE WHEN s.status='VOIDED' THEN s.total ELSE 0 END),0) as void_amount,
        COALESCE(SUM(s.discount_amount),0) as discount_amount,
        COALESCE(SUM(s.tax_amount),0) as tax_amount
      FROM sales s
      LEFT JOIN branches b ON b.id=s.branch_id
      WHERE s.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY s.date, s.branch_id, COALESCE(b.branch_name, s.branch_id)
      ORDER BY s.date DESC, s.branch_id ASC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static productSalesReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        si.product_id,
        COALESCE(p.name, si.product_id) as product_name,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        SUM(si.quantity) as qty_sold,
        SUM(si.price * si.quantity) as gross_sales,
        SUM(COALESCE(si.discount_amount, 0)) as discount_amount,
        SUM(COALESCE(si.line_total, (si.price * si.quantity) - COALESCE(si.discount_amount,0))) as net_sales,
        SUM(COALESCE(p.cost,0) * si.quantity) as cogs_estimate,
        SUM(COALESCE(si.line_total, (si.price * si.quantity) - COALESCE(si.discount_amount,0))) - SUM(COALESCE(p.cost,0) * si.quantity) as profit_estimate
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      LEFT JOIN branches b ON b.id=s.branch_id
      WHERE s.status='Paid'
        AND s.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY si.product_id, COALESCE(p.name, si.product_id), s.branch_id, COALESCE(b.branch_name, s.branch_id)
      ORDER BY qty_sold DESC, net_sales DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static discountSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const byInvoice = db.prepare(`
      SELECT
        s.invoiceNo,
        s.date,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        s.cashier_id,
        COALESCE(s.cashier_name, s.cashier_id, 'Unknown') as cashier_name,
        s.discount_type,
        s.discount_value,
        COALESCE(s.discount_amount,0) as discount_amount,
        COALESCE(s.total,0) as sale_total
      FROM sales s
      LEFT JOIN branches b ON b.id=s.branch_id
      WHERE s.date BETWEEN @date_from AND @date_to
        AND s.status IN ('Paid','Credit')
        AND COALESCE(s.discount_amount,0) > 0
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      ORDER BY s.date DESC, s.invoiceNo DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });

    const byProduct = db.prepare(`
      SELECT
        si.product_id,
        COALESCE(p.name, si.product_id) as product_name,
        COUNT(*) as lines,
        SUM(si.quantity) as qty,
        SUM(COALESCE(si.discount_amount,0)) as discount_amount
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      WHERE s.date BETWEEN @date_from AND @date_to
        AND s.status IN ('Paid','Credit')
        AND COALESCE(si.discount_amount,0) > 0
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY si.product_id, COALESCE(p.name, si.product_id)
      ORDER BY discount_amount DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });

    return { dateFrom, dateTo, branchId: branchId || null, byInvoice, byProduct };
  }

  static returnSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        sr.id as return_id,
        sr.created_at as return_date,
        sr.sale_id,
        sr.branch_id,
        COALESCE(b.branch_name, sr.branch_id) as branch_name,
        sr.refund_method,
        COALESCE(sr.subtotal,0) as subtotal,
        COALESCE(sr.tax_amount,0) as tax_amount,
        COALESCE(sr.total_amount,0) as total_amount,
        sr.return_reason,
        sr.created_by
      FROM sales_returns sr
      LEFT JOIN branches b ON b.id=sr.branch_id
      WHERE date(sr.created_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR sr.branch_id=@branch_id)
      ORDER BY sr.created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return {
      dateFrom,
      dateTo,
      branchId: branchId || null,
      rows,
      totals: {
        total_returns: (rows as any[]).length,
        total_amount: (rows as any[]).reduce((sum, row) => sum + Number(row.total_amount || 0), 0)
      }
    };
  }

  static voidSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.invoiceNo,
        s.date,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        s.cashier_id,
        COALESCE(s.cashier_name, s.cashier_id, 'Unknown') as cashier_name,
        COALESCE(s.total,0) as total,
        al.details as void_reason,
        al.created_at as voided_at
      FROM sales s
      LEFT JOIN branches b ON b.id=s.branch_id
      LEFT JOIN audit_logs al
        ON al.action='SALE_VOID'
       AND al.details LIKE '%' || s.invoiceNo || '%'
      WHERE s.status='VOIDED'
        AND s.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      ORDER BY s.date DESC, s.invoiceNo DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static paymentMethodReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        UPPER(COALESCE(NULLIF(TRIM(payment_method),''),'UNKNOWN')) as payment_method,
        COUNT(*) as transactions,
        COALESCE(SUM(total),0) as amount
      FROM sales
      WHERE status='Paid'
        AND date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
      GROUP BY UPPER(COALESCE(NULLIF(TRIM(payment_method),''),'UNKNOWN'))
      ORDER BY amount DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return {
      dateFrom,
      dateTo,
      branchId: branchId || null,
      rows,
      totalAmount: (rows as any[]).reduce((sum, row) => sum + Number(row.amount || 0), 0)
    };
  }

  static cashDrawerReconciliationReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.id as shift_id,
        s.user_id,
        s.cashier_name,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        s.register_id,
        s.status,
        s.opening_cash,
        s.expected_cash,
        s.counted_cash,
        s.difference,
        s.opened_at,
        s.closed_at,
        COALESCE(SUM(CASE WHEN scm.movement_type='MANUAL_IN' THEN scm.amount ELSE 0 END),0) as manual_in,
        COALESCE(SUM(CASE WHEN scm.movement_type='MANUAL_OUT' THEN scm.amount ELSE 0 END),0) as manual_out,
        COALESCE(SUM(CASE WHEN scm.movement_type='EXPENSE_CASH_OUT' THEN scm.amount ELSE 0 END),0) as drawer_expenses
      FROM cashier_shifts s
      LEFT JOIN branches b ON b.id=s.branch_id
      LEFT JOIN shift_cash_movements scm ON scm.shift_id=s.id
      WHERE date(s.opened_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY s.id
      ORDER BY s.opened_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static branchPerformanceReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        COUNT(CASE WHEN s.status='Paid' THEN 1 END) as paid_transactions,
        COALESCE(SUM(CASE WHEN s.status='Paid' THEN s.total ELSE 0 END),0) as paid_sales,
        COALESCE(SUM(CASE WHEN s.status='Credit' THEN s.total ELSE 0 END),0) as credit_sales,
        COALESCE(SUM(CASE WHEN s.status='VOIDED' THEN s.total ELSE 0 END),0) as void_amount,
        COALESCE(SUM(s.discount_amount),0) as discount_amount,
        COALESCE(SUM(sr.total_amount),0) as return_amount
      FROM sales s
      LEFT JOIN branches b ON b.id=s.branch_id
      LEFT JOIN sales_returns sr
        ON sr.sale_id=s.invoiceNo
       AND date(sr.created_at) BETWEEN @date_from AND @date_to
      WHERE s.date BETWEEN @date_from AND @date_to
      GROUP BY s.branch_id, COALESCE(b.branch_name, s.branch_id)
      ORDER BY paid_sales DESC
    `).all({ date_from: dateFrom, date_to: dateTo });
    return { dateFrom, dateTo, rows };
  }

  static cashierSalesReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        COALESCE(s.cashier_id, 'UNKNOWN') as cashier_id,
        COALESCE(s.cashier_name, s.cashier_id, 'Unknown Cashier') as cashier_name,
        s.branch_id,
        COALESCE(b.branch_name, s.branch_id) as branch_name,
        COUNT(CASE WHEN s.status='Paid' THEN 1 END) as paid_transactions,
        COALESCE(SUM(CASE WHEN s.status='Paid' THEN s.total ELSE 0 END),0) as paid_sales,
        COALESCE(SUM(CASE WHEN s.status='Credit' THEN s.total ELSE 0 END),0) as credit_sales,
        COALESCE(SUM(CASE WHEN s.status='VOIDED' THEN 1 ELSE 0 END),0) as total_voids,
        COALESCE(SUM(s.discount_amount),0) as discount_amount
      FROM sales s
      LEFT JOIN branches b ON b.id=s.branch_id
      WHERE s.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY COALESCE(s.cashier_id, 'UNKNOWN'), COALESCE(s.cashier_name, s.cashier_id, 'Unknown Cashier'), s.branch_id, COALESCE(b.branch_name, s.branch_id)
      ORDER BY paid_sales DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static hourlySalesReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        strftime('%H:00', COALESCE(s.sale_time, s.created_at)) as hour_bucket,
        COUNT(*) as transactions,
        COALESCE(SUM(s.total),0) as sales
      FROM sales s
      WHERE s.status='Paid'
        AND s.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR s.branch_id=@branch_id)
      GROUP BY strftime('%H:00', COALESCE(s.sale_time, s.created_at))
      ORDER BY hour_bucket ASC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static salesInvoicesReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        i.id,
        i.invoice_no,
        i.invoice_date,
        i.customer_name,
        i.branch_id,
        COALESCE(b.branch_name, i.branch_id) as branch_name,
        i.status,
        i.grand_total,
        i.amount_paid,
        i.balance_due
      FROM invoices i
      LEFT JOIN branches b ON b.id=i.branch_id
      WHERE i.invoice_date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR i.branch_id=@branch_id)
      ORDER BY i.invoice_date DESC, i.invoice_no DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static purchaseSummaryReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        p.id,
        p.date,
        p.branch_id,
        COALESCE(b.branch_name, p.branch_id) as branch_name,
        COALESCE(s.name, 'Unassigned Supplier') as supplier_name,
        p.status,
        COALESCE(p.grand_total, p.total, 0) as grand_total,
        COALESCE(p.amount_paid, 0) as amount_paid,
        COALESCE(p.remaining_payable, 0) as remaining_payable
      FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      LEFT JOIN branches b ON b.id=p.branch_id
      WHERE p.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR p.branch_id=@branch_id)
      ORDER BY p.date DESC, p.id DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static purchaseReturnsReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        pr.id,
        pr.created_at,
        pr.purchase_id,
        pr.branch_id,
        COALESCE(b.branch_name, pr.branch_id) as branch_name,
        COALESCE(s.name, 'Unassigned Supplier') as supplier_name,
        pr.return_reason,
        COALESCE(pr.total_amount,0) as total_amount
      FROM purchase_returns pr
      LEFT JOIN suppliers s ON s.id=pr.supplier_id
      LEFT JOIN branches b ON b.id=pr.branch_id
      WHERE date(pr.created_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR pr.branch_id=@branch_id)
      ORDER BY pr.created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static stockMovementReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        sm.date,
        sm.branch_id,
        COALESCE(b.branch_name, sm.branch_id) as branch_name,
        sm.product_id,
        COALESCE(p.name, sm.product_id) as product_name,
        sm.movement_type,
        sm.quantity_in,
        sm.quantity_out,
        sm.previous_stock,
        sm.new_stock,
        sm.reference_type,
        sm.reference_id
      FROM stock_movements sm
      LEFT JOIN products p ON p.id=sm.product_id
      LEFT JOIN branches b ON b.id=sm.branch_id
      WHERE sm.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR sm.branch_id=@branch_id)
      ORDER BY sm.date DESC, sm.created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static lowStockReport(branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        p.id as product_id,
        p.sku,
        p.name as product_name,
        p.branch_id,
        COALESCE(b.branch_name, p.branch_id) as branch_name,
        COALESCE(p.stock,0) as stock,
        COALESCE(p.min_stock_alert,0) as min_stock_alert
      FROM products p
      LEFT JOIN branches b ON b.id=p.branch_id
      WHERE COALESCE(p.stock,0) <= COALESCE(p.min_stock_alert,0)
        AND (@branch_id IS NULL OR p.branch_id=@branch_id)
      ORDER BY (COALESCE(p.min_stock_alert,0) - COALESCE(p.stock,0)) DESC
    `).all({ branch_id: branchId || null });
    return { branchId: branchId || null, rows };
  }

  static branchStockReport(branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        bi.branch_id,
        COALESCE(b.branch_name, bi.branch_id) as branch_name,
        bi.product_id,
        COALESCE(p.name, bi.product_id) as product_name,
        bi.quantity_on_hand,
        bi.quantity_reserved,
        bi.reorder_level,
        bi.average_cost,
        (COALESCE(bi.quantity_on_hand,0) * COALESCE(bi.average_cost,0)) as stock_value
      FROM branch_inventory bi
      LEFT JOIN products p ON p.id=bi.product_id
      LEFT JOIN branches b ON b.id=bi.branch_id
      WHERE (@branch_id IS NULL OR bi.branch_id=@branch_id)
      ORDER BY bi.branch_id ASC, product_name ASC
    `).all({ branch_id: branchId || null });
    return { branchId: branchId || null, rows };
  }

  static inventoryAdjustmentReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        ia.id,
        ia.adjustment_date,
        ia.branch_id,
        COALESCE(b.branch_name, ia.branch_id) as branch_name,
        ia.adjustment_type,
        ia.reason,
        ia.status,
        ia.accounting_status,
        COUNT(iai.id) as item_count,
        COALESCE(SUM(iai.value_change),0) as total_value_change
      FROM inventory_adjustments ia
      LEFT JOIN inventory_adjustment_items iai ON iai.adjustment_id=ia.id
      LEFT JOIN branches b ON b.id=ia.branch_id
      WHERE ia.adjustment_date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR ia.branch_id=@branch_id)
      GROUP BY ia.id
      ORDER BY ia.adjustment_date DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static stockTransferReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        st.id,
        st.transfer_no,
        st.status,
        st.request_date,
        st.approval_date,
        st.completion_date,
        COALESCE(sb.branch_name, st.source_branch_id) as source_branch,
        COALESCE(dbn.branch_name, st.destination_branch_id) as destination_branch,
        COUNT(sti.id) as item_count,
        COALESCE(SUM(sti.quantity),0) as total_qty
      FROM stock_transfers st
      LEFT JOIN stock_transfer_items sti ON sti.transfer_id=st.id
      LEFT JOIN branches sb ON sb.id=st.source_branch_id
      LEFT JOIN branches dbn ON dbn.id=st.destination_branch_id
      WHERE st.request_date BETWEEN @date_from AND @date_to
      GROUP BY st.id
      ORDER BY st.request_date DESC
    `).all({ date_from: dateFrom, date_to: dateTo });
    return { dateFrom, dateTo, rows };
  }

  static customerStatementReport(customerIdOrName: string, dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 'SALE' as source, s.date as tx_date, s.invoiceNo as reference_no, s.status, s.total as debit, 0 as credit
      FROM sales s
      WHERE (s.customer_id=@customer OR s.customerName=@customer)
        AND s.date BETWEEN @date_from AND @date_to
      UNION ALL
      SELECT 'INVOICE' as source, i.invoice_date as tx_date, i.invoice_no as reference_no, i.status, i.grand_total as debit, 0 as credit
      FROM invoices i
      WHERE (i.customer_id=@customer OR i.customer_name=@customer)
        AND i.invoice_date BETWEEN @date_from AND @date_to
      UNION ALL
      SELECT 'KHATA_PAYMENT' as source, cp.payment_date as tx_date, cp.id as reference_no, 'Posted' as status, 0 as debit, cp.amount as credit
      FROM customer_payments cp
      WHERE cp.customer_name=@customer
        AND cp.payment_date BETWEEN @date_from AND @date_to
      ORDER BY tx_date ASC, reference_no ASC
    `).all({ customer: customerIdOrName, date_from: dateFrom, date_to: dateTo });
    return { customer: customerIdOrName, dateFrom, dateTo, rows };
  }

  static supplierPayableReport(dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        s.id as supplier_id,
        s.name as supplier_name,
        COALESCE(s.current_balance,0) as current_balance,
        COALESCE(SUM(CASE WHEN p.date <= @date_to THEN COALESCE(p.remaining_payable,0) ELSE 0 END),0) as invoice_payable
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id=s.id
      GROUP BY s.id, s.name, s.current_balance
      HAVING current_balance > 0 OR invoice_payable > 0
      ORDER BY invoice_payable DESC, current_balance DESC
    `).all({ date_to: dateTo });
    return { dateTo, rows };
  }

  static supplierLedgerReport(supplierId: string, dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        date,
        type,
        reference_id,
        debit,
        credit,
        balance,
        notes
      FROM supplier_ledger
      WHERE supplier_id=@supplier_id
        AND date BETWEEN @date_from AND @date_to
      ORDER BY date ASC, created_at ASC
    `).all({ supplier_id: supplierId, date_from: dateFrom, date_to: dateTo });
    return { supplierId, dateFrom, dateTo, rows };
  }

  static supplierPaymentReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        sp.id,
        sp.date,
        sp.branch_id,
        COALESCE(b.branch_name, sp.branch_id) as branch_name,
        COALESCE(s.name, 'Unassigned Supplier') as supplier_name,
        sp.payment_method,
        sp.amount,
        sp.reference_no
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON s.id=sp.supplier_id
      LEFT JOIN branches b ON b.id=sp.branch_id
      WHERE sp.date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR sp.branch_id=@branch_id)
      ORDER BY sp.date DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static outputTaxReport(dateFrom: string, dateTo: string) {
    return { dateFrom, dateTo, rows: TaxRepository.getOutputTaxReport(dateFrom, dateTo) };
  }

  static inputTaxReport(dateFrom: string, dateTo: string) {
    return { dateFrom, dateTo, rows: TaxRepository.getInputTaxReport(dateFrom, dateTo) };
  }

  static bankAccountSummaryReport() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        id,
        code,
        name,
        account_type,
        opening_balance,
        current_balance,
        status
      FROM cash_bank_accounts
      ORDER BY code ASC
    `).all();
    return { rows };
  }

  static moneyTransactionReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        mt.id,
        mt.transaction_date,
        mt.branch_id,
        COALESCE(b.branch_name, mt.branch_id) as branch_name,
        cba.name as account_name,
        mt.transaction_type,
        mt.amount,
        mt.reference_no,
        mt.is_cleared
      FROM money_transactions mt
      LEFT JOIN cash_bank_accounts cba ON cba.id=mt.account_id
      LEFT JOIN branches b ON b.id=mt.branch_id
      WHERE mt.transaction_date BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR mt.branch_id=@branch_id)
      ORDER BY mt.transaction_date DESC, mt.created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static bankReconciliationReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        br.id,
        cba.name as account_name,
        br.start_date,
        br.end_date,
        br.statement_balance,
        br.book_balance,
        br.difference,
        br.status
      FROM bank_reconciliations br
      LEFT JOIN cash_bank_accounts cba ON cba.id=br.account_id
      WHERE br.start_date <= @date_to
        AND br.end_date >= @date_from
      ORDER BY br.end_date DESC
    `).all({ date_from: dateFrom, date_to: dateTo });
    return { dateFrom, dateTo, rows };
  }

  static branchProfitAndLossReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const branches = db.prepare(`SELECT id, COALESCE(branch_name, name, id) as branch_name FROM branches`).all() as Array<{ id: string; branch_name: string }>;
    const rows = branches.map((branch) => {
      const pnl = this.profitAndLoss({ dateFrom, dateTo, branchId: branch.id });
      return {
        branch_id: branch.id,
        branch_name: branch.branch_name,
        income: pnl.totalIncome,
        expenses: pnl.totalExpenses,
        net_income: pnl.netIncome
      };
    });
    return { dateFrom, dateTo, rows };
  }

  static auditLogReport(dateFrom: string, dateTo: string, userId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        al.id,
        al.created_at,
        al.user_id,
        COALESCE(u.full_name, u.username, al.user_id, 'System') as user_name,
        al.action,
        al.details
      FROM audit_logs al
      LEFT JOIN users u ON u.id=al.user_id
      WHERE date(al.created_at) BETWEEN @date_from AND @date_to
        AND (@user_id IS NULL OR al.user_id=@user_id)
      ORDER BY al.created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, user_id: userId || null });
    return { dateFrom, dateTo, userId: userId || null, rows };
  }

  static backupHistoryReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        id,
        created_at,
        file_name,
        backup_type,
        status,
        file_size,
        integrity_status,
        notes
      FROM backup_history
      WHERE date(created_at) BETWEEN @date_from AND @date_to
      ORDER BY created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo });
    return { dateFrom, dateTo, rows };
  }

  static notificationReport(dateFrom: string, dateTo: string, branchId?: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        id,
        created_at,
        type,
        category,
        severity,
        title,
        status,
        branch_id
      FROM notifications
      WHERE date(created_at) BETWEEN @date_from AND @date_to
        AND (@branch_id IS NULL OR branch_id=@branch_id)
      ORDER BY created_at DESC
    `).all({ date_from: dateFrom, date_to: dateTo, branch_id: branchId || null });
    return { dateFrom, dateTo, branchId: branchId || null, rows };
  }

  static userActivityReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT
        COALESCE(al.user_id, 'SYSTEM') as user_id,
        COALESCE(u.full_name, u.username, 'System') as user_name,
        COUNT(*) as activity_count,
        MAX(al.created_at) as last_activity_at
      FROM audit_logs al
      LEFT JOIN users u ON u.id=al.user_id
      WHERE date(al.created_at) BETWEEN @date_from AND @date_to
      GROUP BY COALESCE(al.user_id, 'SYSTEM'), COALESCE(u.full_name, u.username, 'System')
      ORDER BY activity_count DESC
    `).all({ date_from: dateFrom, date_to: dateTo });
    return { dateFrom, dateTo, rows };
  }
}
