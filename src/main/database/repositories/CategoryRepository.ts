import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class CategoryRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM categories WHERE status != 'inactive' ORDER BY name ASC").all();
  }

  static create(category: any) {
    const db = getDatabase();
    const id = category.id || `CAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare('INSERT INTO categories (id, name, description) VALUES (@id, @name, @description)');
    const info = stmt.run({
      id,
      name: category.name,
      description: category.description || ''
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'CATEGORY_CREATE', details: `Category ${id} created` });
    }
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static update(category: any) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE categories SET name = @name, description = @description, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
    const info = stmt.run({
      id: category.id,
      name: category.name,
      description: category.description || ''
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'CATEGORY_UPDATE', details: `Category ${category.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE categories SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'CATEGORY_DEACTIVATE', details: `Category ${id} deactivated` });
    }
    return info.changes > 0;
  }
}
