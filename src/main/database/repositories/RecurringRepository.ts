import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export type RecurringTemplateType = 'invoice' | 'purchase' | 'expense' | 'journal';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTemplateInput {
  id?: string;
  name: string;
  template_type: RecurringTemplateType;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_run_date?: string;
  auto_create?: boolean | number;
  status?: 'active' | 'inactive';
  branch_id?: string | null;
  class_id?: string | null;
  payload?: Record<string, any>;
  payload_json?: string;
}

function parseTemplate(row: any) {
  if (!row) return null;
  return {
    ...row,
    auto_create: Number(row.auto_create || 0),
    payload: row.payload_json ? JSON.parse(row.payload_json) : {}
  };
}

export class RecurringRepository {
  static getAll() {
    const db = getDatabase();
    return (db.prepare(`
      SELECT rt.*, br.branch_code, COALESCE(br.branch_name, br.name) as branch_name,
             c.class_code, c.class_name
      FROM recurring_templates rt
      LEFT JOIN branches br ON br.id = rt.branch_id
      LEFT JOIN classes c ON c.id = rt.class_id
      ORDER BY rt.next_run_date ASC, rt.created_at DESC
    `).all() as any[]).map(parseTemplate);
  }

  static getById(id: string) {
    const db = getDatabase();
    return parseTemplate(db.prepare('SELECT * FROM recurring_templates WHERE id=?').get(id));
  }

  static create(payload: RecurringTemplateInput, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `RECT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const info = db.prepare(`
      INSERT INTO recurring_templates (
        id, name, template_type, frequency, start_date, end_date, next_run_date,
        auto_create, status, branch_id, class_id, payload_json, created_by
      ) VALUES (
        @id, @name, @template_type, @frequency, @start_date, @end_date, @next_run_date,
        @auto_create, @status, @branch_id, @class_id, @payload_json, @created_by
      )
    `).run({
      id,
      name: payload.name,
      template_type: payload.template_type,
      frequency: payload.frequency,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      next_run_date: payload.next_run_date || payload.start_date,
      auto_create: payload.auto_create ? 1 : 0,
      status: payload.status || 'active',
      branch_id: payload.branch_id || null,
      class_id: payload.class_id || null,
      payload_json: payload.payload_json || JSON.stringify(payload.payload || {}),
      created_by: actorId || null
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'RECURRING_TEMPLATE_CREATE', user_id: actorId, details: `Recurring template ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: RecurringTemplateInput & { id: string }, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE recurring_templates
      SET name=@name,
          template_type=@template_type,
          frequency=@frequency,
          start_date=@start_date,
          end_date=@end_date,
          next_run_date=@next_run_date,
          auto_create=@auto_create,
          status=@status,
          branch_id=@branch_id,
          class_id=@class_id,
          payload_json=@payload_json,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      name: payload.name,
      template_type: payload.template_type,
      frequency: payload.frequency,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      next_run_date: payload.next_run_date || payload.start_date,
      auto_create: payload.auto_create ? 1 : 0,
      status: payload.status || 'active',
      branch_id: payload.branch_id || null,
      class_id: payload.class_id || null,
      payload_json: payload.payload_json || JSON.stringify(payload.payload || {})
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'RECURRING_TEMPLATE_UPDATE', user_id: actorId, details: `Recurring template ${payload.id} updated` });
    return info.changes > 0;
  }

  static deactivate(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE recurring_templates SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'RECURRING_TEMPLATE_DEACTIVATE', user_id: actorId, details: `Recurring template ${id} deactivated` });
    return info.changes > 0;
  }

  static getDue(runDate: string) {
    const db = getDatabase();
    return (db.prepare(`
      SELECT *
      FROM recurring_templates
      WHERE status = 'active'
        AND auto_create = 1
        AND next_run_date <= ?
        AND (end_date IS NULL OR end_date = '' OR end_date >= ?)
      ORDER BY next_run_date ASC
    `).all(runDate, runDate) as any[]).map(parseTemplate);
  }

  static getRuns(templateId?: string) {
    const db = getDatabase();
    const sql = templateId
      ? 'SELECT rr.*, rt.name as template_name FROM recurring_runs rr JOIN recurring_templates rt ON rt.id = rr.template_id WHERE rr.template_id=? ORDER BY rr.created_at DESC'
      : 'SELECT rr.*, rt.name as template_name FROM recurring_runs rr JOIN recurring_templates rt ON rt.id = rr.template_id ORDER BY rr.created_at DESC';
    return templateId ? db.prepare(sql).all(templateId) : db.prepare(sql).all();
  }

  static hasSuccessfulRun(templateId: string, runDate: string) {
    const db = getDatabase();
    return Boolean(db.prepare("SELECT 1 FROM recurring_runs WHERE template_id=? AND run_date=? AND status='success'").get(templateId, runDate));
  }

  static logRun(data: { template_id: string; run_date: string; status: 'success' | 'failed' | 'skipped'; created_transaction_type?: string | null; created_transaction_id?: string | null; error_message?: string | null }) {
    const db = getDatabase();
    const id = `RECRUN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    db.prepare(`
      INSERT INTO recurring_runs (
        id, template_id, run_date, status, created_transaction_type, created_transaction_id, error_message
      ) VALUES (
        @id, @template_id, @run_date, @status, @created_transaction_type, @created_transaction_id, @error_message
      )
    `).run({
      id,
      template_id: data.template_id,
      run_date: data.run_date,
      status: data.status,
      created_transaction_type: data.created_transaction_type || null,
      created_transaction_id: data.created_transaction_id || null,
      error_message: data.error_message || null
    });
    return { success: true, id };
  }

  static advanceNextRunDate(templateId: string, nextRunDate: string) {
    const db = getDatabase();
    return db.prepare('UPDATE recurring_templates SET next_run_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(nextRunDate, templateId).changes > 0;
  }
}
