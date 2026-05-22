import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class PriceRuleRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM price_rules WHERE status != 'inactive' ORDER BY created_at DESC").all() as any[];
  }

  static create(rule: any) {
    const db = getDatabase();
    const id = rule.id || `PR-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare(`
      INSERT INTO price_rules (id, name, rule_type, target_id, discount_type, value, min_qty, start_date, end_date, status)
      VALUES (@id, @name, @rule_type, @target_id, @discount_type, @value, @min_qty, @start_date, @end_date, @status)
    `);
    const info = stmt.run({
      id,
      name: rule.name,
      rule_type: rule.rule_type,
      target_id: rule.target_id || null,
      discount_type: rule.discount_type,
      value: rule.value,
      min_qty: rule.min_qty || 0,
      start_date: rule.start_date || null,
      end_date: rule.end_date || null,
      status: rule.status || 'active'
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRICERULE_CREATE', details: `Price rule ${id} created: ${rule.name}` });
    }
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static update(rule: any) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE price_rules
      SET name = @name,
          rule_type = @rule_type,
          target_id = @target_id,
          discount_type = @discount_type,
          value = @value,
          min_qty = @min_qty,
          start_date = @start_date,
          end_date = @end_date,
          status = @status,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    const info = stmt.run({
      id: rule.id,
      name: rule.name,
      rule_type: rule.rule_type,
      target_id: rule.target_id || null,
      discount_type: rule.discount_type,
      value: rule.value,
      min_qty: rule.min_qty || 0,
      start_date: rule.start_date || null,
      end_date: rule.end_date || null,
      status: rule.status || 'active'
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRICERULE_UPDATE', details: `Price rule ${rule.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE price_rules SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRICERULE_DEACTIVATE', details: `Price rule ${id} deactivated` });
    }
    return info.changes > 0;
  }

  static getActiveRules(dateStr?: string) {
    const db = getDatabase();
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return db.prepare(`
      SELECT * FROM price_rules
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
    `).all(targetDate, targetDate) as any[];
  }

  static logPromotionRun(run: any) {
    const db = getDatabase();
    const id = run.id || `PRUN-${Math.floor(100000 + Math.random() * 900000)}`;
    db.prepare(`
      INSERT INTO promotion_runs (id, discount_id, price_rule_id, transaction_type, transaction_id, applied_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, run.discount_id || null, run.price_rule_id || null, run.transaction_type, run.transaction_id, run.applied_amount);
    return id;
  }

  static getPromotionHistory() {
    const db = getDatabase();
    return db.prepare(`
      SELECT p.*, d.name as discount_name, r.name as rule_name
      FROM promotion_runs p
      LEFT JOIN discounts d ON p.discount_id = d.id
      LEFT JOIN price_rules r ON p.price_rule_id = r.id
      ORDER BY p.created_at DESC
    `).all() as any[];
  }
}
