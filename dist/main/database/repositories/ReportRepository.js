"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepository = void 0;
const connection_1 = require("../connection");
const TaxRepository_1 = require("./TaxRepository");
function signedBalance(accountType, opening, debit, credit) {
    if (accountType === 'Asset' || accountType === 'Expense')
        return opening + debit - credit;
    return opening + credit - debit;
}
function daysBetween(date, asOf) {
    const left = new Date(date).getTime();
    const right = new Date(asOf).getTime();
    if (Number.isNaN(left) || Number.isNaN(right))
        return 0;
    return Math.max(0, Math.floor((right - left) / 86400000));
}
function bucketForAge(age) {
    if (age <= 30)
        return 'current';
    if (age <= 60)
        return 'days31_60';
    if (age <= 90)
        return 'days61_90';
    return 'over90';
}
function emptyAgingTotals() {
    return { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
}
class ReportRepository {
    static accountBalances(dateTo, dateFrom) {
        const db = (0, connection_1.getDatabase)();
        const dateFilter = dateFrom
            ? "WHERE je.status = 'posted' AND je.entry_date BETWEEN @dateFrom AND @dateTo"
            : "WHERE je.status = 'posted' AND je.entry_date <= @dateTo";
        return db.prepare(`
      WITH ledger AS (
        SELECT jl.account_id, SUM(jl.debit) as debit, SUM(jl.credit) as credit
        FROM journal_entry_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        ${dateFilter}
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
    `).all({ dateFrom, dateTo });
    }
    static profitAndLoss({ dateFrom, dateTo }) {
        const rows = this.accountBalances(dateTo, dateFrom).filter((row) => row.account_type === 'Income' || row.account_type === 'Expense');
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
            income,
            expenses,
            totalIncome,
            totalExpenses,
            netIncome: totalIncome - totalExpenses
        };
    }
    static balanceSheet(dateTo) {
        const rows = this.accountBalances(dateTo).map((row) => ({
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
                    account_type: 'Equity',
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
    static cashFlow({ dateFrom, dateTo }) {
        const db = (0, connection_1.getDatabase)();
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
    `).all(dateFrom, dateTo);
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
    static trialBalance({ dateFrom, dateTo }) {
        const rows = this.accountBalances(dateTo, dateFrom).map((row) => {
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
        return { dateFrom, dateTo, rows, totalDebit, totalCredit, difference: totalDebit - totalCredit };
    }
    static generalLedger({ dateFrom, dateTo }) {
        const db = (0, connection_1.getDatabase)();
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
    `).all(dateFrom, dateTo);
        const running = {};
        return rows.map((row) => {
            const debit = Number(row.debit || 0);
            const credit = Number(row.credit || 0);
            const normalChange = row.account_type === 'Asset' || row.account_type === 'Expense' ? debit - credit : credit - debit;
            running[row.account_code] = (running[row.account_code] || 0) + normalChange;
            return { ...row, running_balance: running[row.account_code] };
        });
    }
    static arAging(dateTo) {
        const db = (0, connection_1.getDatabase)();
        const invoiceRows = db.prepare(`
      SELECT customer_name as name, COALESCE(due_date, invoice_date) as aging_date, balance_due as amount
      FROM invoices
      WHERE status IN ('Unpaid', 'Partially Paid') AND balance_due > 0 AND invoice_date <= ?
    `).all(dateTo);
        const customerRows = db.prepare(`
      SELECT name, COALESCE(lastPayment, updated_at, created_at) as aging_date, credit as amount
      FROM customers
      WHERE credit > 0
    `).all();
        return this.buildAging([...invoiceRows, ...customerRows], dateTo);
    }
    static apAging(dateTo) {
        const db = (0, connection_1.getDatabase)();
        const purchaseRows = db.prepare(`
      SELECT COALESCE(s.name, 'Unassigned Supplier') as name, p.date as aging_date, p.remaining_payable as amount
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.remaining_payable > 0 AND p.date <= ?
    `).all(dateTo);
        const supplierRows = db.prepare(`
      SELECT name, COALESCE(updated_at, created_at) as aging_date, current_balance as amount
      FROM suppliers
      WHERE current_balance > 0
    `).all();
        return this.buildAging([...purchaseRows, ...supplierRows], dateTo);
    }
    static buildAging(rows, dateTo) {
        const byName = new Map();
        const totals = emptyAgingTotals();
        for (const row of rows) {
            const amount = Number(row.amount || 0);
            if (amount <= 0)
                continue;
            const bucket = bucketForAge(daysBetween(row.aging_date, dateTo));
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
        const db = (0, connection_1.getDatabase)();
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
    `).all();
        return {
            rows,
            totalQuantity: rows.reduce((sum, row) => sum + Number(row.quantity_on_hand || 0), 0),
            totalValue: rows.reduce((sum, row) => sum + Number(row.inventory_value || 0), 0)
        };
    }
    static taxSummary({ dateFrom, dateTo }) {
        return {
            dateFrom,
            dateTo,
            output: TaxRepository_1.TaxRepository.getOutputTaxReport(dateFrom, dateTo),
            input: TaxRepository_1.TaxRepository.getInputTaxReport(dateFrom, dateTo),
            summary: TaxRepository_1.TaxRepository.getTaxSummary(dateFrom, dateTo)
        };
    }
    static salesByCustomerProduct({ dateFrom, dateTo }) {
        const db = (0, connection_1.getDatabase)();
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
    static purchasesBySupplierProduct({ dateFrom, dateTo }) {
        const db = (0, connection_1.getDatabase)();
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
    static expenseSummary({ dateFrom, dateTo }) {
        const db = (0, connection_1.getDatabase)();
        const byCategory = db.prepare(`
      SELECT category, COUNT(*) as entries, SUM(amount) as total_amount, SUM(COALESCE(tax_amount, 0)) as tax_amount
      FROM expenses
      WHERE date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total_amount DESC
    `).all(dateFrom, dateTo);
        const total = byCategory.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
        return { dateFrom, dateTo, byCategory, total };
    }
}
exports.ReportRepository = ReportRepository;
