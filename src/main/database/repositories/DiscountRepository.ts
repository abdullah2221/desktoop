import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class DiscountRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM discounts WHERE status != 'inactive' ORDER BY created_at DESC").all() as any[];
  }

  static create(discount: any) {
    const db = getDatabase();
    const id = discount.id || `DSC-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare(`
      INSERT INTO discounts (id, name, discount_type, value, scope, min_quantity, start_date, end_date, status)
      VALUES (@id, @name, @discount_type, @value, @scope, @min_quantity, @start_date, @end_date, @status)
    `);
    const info = stmt.run({
      id,
      name: discount.name,
      discount_type: discount.discount_type,
      value: discount.value,
      scope: discount.scope,
      min_quantity: discount.min_quantity || 0,
      start_date: discount.start_date || null,
      end_date: discount.end_date || null,
      status: discount.status || 'active'
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'DISCOUNT_CREATE', details: `Discount ${id} created: ${discount.name}` });
    }
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static update(discount: any) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE discounts
      SET name = @name,
          discount_type = @discount_type,
          value = @value,
          scope = @scope,
          min_quantity = @min_quantity,
          start_date = @start_date,
          end_date = @end_date,
          status = @status,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    const info = stmt.run({
      id: discount.id,
      name: discount.name,
      discount_type: discount.discount_type,
      value: discount.value,
      scope: discount.scope,
      min_quantity: discount.min_quantity || 0,
      start_date: discount.start_date || null,
      end_date: discount.end_date || null,
      status: discount.status || 'active'
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'DISCOUNT_UPDATE', details: `Discount ${discount.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE discounts SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'DISCOUNT_DEACTIVATE', details: `Discount ${id} deactivated` });
    }
    return info.changes > 0;
  }

  static getActiveDiscounts(dateStr?: string) {
    const db = getDatabase();
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return db.prepare(`
      SELECT * FROM discounts
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
    `).all(targetDate, targetDate) as any[];
  }
}
