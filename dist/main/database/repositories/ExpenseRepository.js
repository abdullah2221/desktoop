"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const AccountingPostingService_1 = require("./AccountingPostingService");
const TaxRepository_1 = require("./TaxRepository");
class ExpenseRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
    }
    static create(expense) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO expenses (id, tenant_id, branch_id, date, category, amount, paidTo, status, tax_code, tax_mode, tax_amount)
      VALUES (@id, 'T001', 'B001', @date, @category, @amount, @paidTo, @status, @tax_code, @tax_mode, @tax_amount)
    `);
        const info = stmt.run({
            ...expense,
            tax_code: expense.tax_code || TaxRepository_1.TaxRepository.getDefaultTaxCode('expense'),
            tax_mode: expense.tax_mode || 'exclusive',
            tax_amount: expense.tax_amount || 0
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'EXPENSE_CREATE', details: `Expense ${expense.id} created` });
            try {
                AccountingPostingService_1.AccountingPostingService.postExpense({
                    expenseId: expense.id,
                    date: expense.date,
                    amount: expense.amount,
                    taxAmount: expense.tax_amount || 0
                });
            }
            catch (err) {
                console.error('[ExpenseRepository] Accounting auto-post failed:', err);
            }
        }
        return info.changes > 0;
    }
}
exports.ExpenseRepository = ExpenseRepository;
