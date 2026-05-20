import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class BrandRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM brands WHERE status != 'inactive' ORDER BY name ASC").all();
  }

  static create(brand: any) {
    const db = getDatabase();
    const id = brand.id || `BR-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare("INSERT INTO brands (id, tenant_id, name) VALUES (@id, 'T001', @name)");
    const info = stmt.run({
      id,
      name: brand.name
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'BRAND_CREATE', details: `Brand ${id} created` });
    }
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static update(brand: any) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE brands SET name = @name, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
    const info = stmt.run({
      id: brand.id,
      name: brand.name
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'BRAND_UPDATE', details: `Brand ${brand.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE brands SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'BRAND_DEACTIVATE', details: `Brand ${id} deactivated` });
    }
    return info.changes > 0;
  }
}
