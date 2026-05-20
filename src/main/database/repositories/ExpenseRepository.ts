import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { TaxRepository } from './TaxRepository';

export class ExpenseRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
  }

  static create(expense: any) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO expenses (id, tenant_id, branch_id, date, category, amount, paidTo, status, tax_code, tax_mode, tax_amount)
      VALUES (@id, 'T001', 'B001', @date, @category, @amount, @paidTo, @status, @tax_code, @tax_mode, @tax_amount)
    `);
    const info = stmt.run({
      ...expense,
      tax_code: expense.tax_code || TaxRepository.getDefaultTaxCode('expense'),
      tax_mode: expense.tax_mode || 'exclusive',
      tax_amount: expense.tax_amount || 0
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'EXPENSE_CREATE', details: `Expense ${expense.id} created` });
      try {
        AccountingPostingService.postExpense({
          expenseId: expense.id,
          date: expense.date,
          amount: expense.amount,
          taxAmount: expense.tax_amount || 0
        });
      } catch (err) {
        console.error('[ExpenseRepository] Accounting auto-post failed:', err);
      }
    }
    return info.changes > 0;
  }
}
