import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { TaxRepository } from './TaxRepository';
import { CurrencyRepository } from './CurrencyRepository';
import { ExchangeRateRepository } from './ExchangeRateRepository';

export class ExpenseRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
  }

  static create(expense: any) {
    const db = getDatabase();
    const branchId = expense.branch_id || 'B001';
    const classId = expense.class_id || null;
    const baseCurrency = (CurrencyRepository.getBaseCurrency() as any).code || 'PKR';
    const currencyCode = (expense.currency_code || baseCurrency).toUpperCase();
    const exchangeRate = expense.exchange_rate || ExchangeRateRepository.getRate(currencyCode, baseCurrency, expense.date);
    const originalAmount = Number(expense.amount || 0);
    const baseAmount = Number((originalAmount * exchangeRate).toFixed(4));
    const originalTaxAmount = Number(expense.tax_amount || 0);
    const baseTaxAmount = Number((originalTaxAmount * exchangeRate).toFixed(4));
    const stmt = db.prepare(`
      INSERT INTO expenses (
        id, tenant_id, branch_id, class_id, date, category, amount, paidTo, status,
        tax_code, tax_mode, tax_amount, currency_code, exchange_rate, original_amount, base_amount
      )
      VALUES (
        @id, 'T001', @branch_id, @class_id, @date, @category, @amount, @paidTo, @status,
        @tax_code, @tax_mode, @tax_amount, @currency_code, @exchange_rate, @original_amount, @base_amount
      )
    `);
    const info = stmt.run({
      ...expense,
      branch_id: branchId,
      class_id: classId,
      amount: baseAmount,
      tax_code: expense.tax_code || TaxRepository.getDefaultTaxCode('expense'),
      tax_mode: expense.tax_mode || 'exclusive',
      tax_amount: baseTaxAmount,
      currency_code: currencyCode,
      exchange_rate: exchangeRate,
      original_amount: originalAmount,
      base_amount: baseAmount
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'EXPENSE_CREATE', details: `Expense ${expense.id} created` });
      try {
        AccountingPostingService.postExpense({
          expenseId: expense.id,
          date: expense.date,
          amount: baseAmount,
          taxAmount: baseTaxAmount,
          branchId,
          classId
        });
      } catch (err) {
        console.error('[ExpenseRepository] Accounting auto-post failed:', err);
      }
    }
    return info.changes > 0;
  }
}
