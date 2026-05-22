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
}
