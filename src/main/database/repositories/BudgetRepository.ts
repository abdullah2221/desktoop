import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export interface BudgetLineInput {
  id?: string;
  account_id: string;
  period_start?: string;
  period_end?: string;
  amount: number;
  notes?: string;
}

export interface BudgetInput {
  id?: string;
  name: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  date_from: string;
  date_to: string;
  branch_id?: string | null;
  class_id?: string | null;
  status?: 'Draft' | 'Active' | 'Closed' | 'inactive';
  notes?: string;
  lines?: BudgetLineInput[];
}

export class BudgetRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT b.*, br.branch_code, COALESCE(br.branch_name, br.name) as branch_name,
             c.class_code, c.class_name,
             COALESCE(SUM(bl.amount), 0) as total_budget
      FROM budgets b
      LEFT JOIN branches br ON br.id = b.branch_id
      LEFT JOIN classes c ON c.id = b.class_id
      LEFT JOIN budget_lines bl ON bl.budget_id = b.id
      GROUP BY b.id
      ORDER BY b.date_from DESC, b.created_at DESC
    `).all();
  }

  static getById(id: string) {
    const db = getDatabase();
    const budget = db.prepare(`
      SELECT b.*, br.branch_code, COALESCE(br.branch_name, br.name) as branch_name,
             c.class_code, c.class_name
      FROM budgets b
      LEFT JOIN branches br ON br.id = b.branch_id
      LEFT JOIN classes c ON c.id = b.class_id
      WHERE b.id = ?
    `).get(id) as any;
    if (!budget) return null;
    budget.lines = db.prepare(`
      SELECT bl.*, a.account_code, a.account_name, a.account_type
      FROM budget_lines bl
      JOIN chart_of_accounts a ON a.id = bl.account_id
      WHERE bl.budget_id = ?
      ORDER BY a.account_code ASC
    `).all(id);
    return budget;
  }

  static create(payload: BudgetInput, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction((data: BudgetInput) => {
      const id = data.id || `BUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      db.prepare(`
        INSERT INTO budgets (
          id, name, period_type, date_from, date_to, branch_id, class_id, status, notes, created_by
        ) VALUES (
          @id, @name, @period_type, @date_from, @date_to, @branch_id, @class_id, @status, @notes, @created_by
        )
      `).run({
        id,
        name: data.name,
        period_type: data.period_type || 'monthly',
        date_from: data.date_from,
        date_to: data.date_to,
        branch_id: data.branch_id || null,
        class_id: data.class_id || null,
        status: data.status || 'Draft',
        notes: data.notes || '',
        created_by: actorId || null
      });
      this.replaceLinesInternal(id, data.lines || []);
      AuditLogRepository.write({ action: 'BUDGET_CREATE', user_id: actorId, details: `Budget ${id} created` });
      return { success: true, id };
    });
    return tx(payload);
  }

  static update(payload: BudgetInput & { id: string }, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction((data: BudgetInput & { id: string }) => {
      const info = db.prepare(`
        UPDATE budgets
        SET name=@name,
            period_type=@period_type,
            date_from=@date_from,
            date_to=@date_to,
            branch_id=@branch_id,
            class_id=@class_id,
            status=@status,
            notes=@notes,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=@id
      `).run({
        id: data.id,
        name: data.name,
        period_type: data.period_type || 'monthly',
        date_from: data.date_from,
        date_to: data.date_to,
        branch_id: data.branch_id || null,
        class_id: data.class_id || null,
        status: data.status || 'Draft',
        notes: data.notes || ''
      });
      if (data.lines) this.replaceLinesInternal(data.id, data.lines);
      if (info.changes > 0) AuditLogRepository.write({ action: 'BUDGET_UPDATE', user_id: actorId, details: `Budget ${data.id} updated` });
      return info.changes > 0;
    });
    return tx(payload);
  }

  static deactivate(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE budgets SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'BUDGET_DEACTIVATE', user_id: actorId, details: `Budget ${id} deactivated` });
    return info.changes > 0;
  }

  private static replaceLinesInternal(budgetId: string, lines: BudgetLineInput[]) {
    const db = getDatabase();
    db.prepare('DELETE FROM budget_lines WHERE budget_id=?').run(budgetId);
    const insert = db.prepare(`
      INSERT INTO budget_lines (id, budget_id, account_id, period_start, period_end, amount, notes)
      VALUES (@id, @budget_id, @account_id, @period_start, @period_end, @amount, @notes)
    `);
    for (const line of lines) {
      if (!line.account_id) continue;
      insert.run({
        id: line.id || `BUDL-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        budget_id: budgetId,
        account_id: line.account_id,
        period_start: line.period_start || null,
        period_end: line.period_end || null,
        amount: Number(line.amount || 0),
        notes: line.notes || ''
      });
    }
  }
}
