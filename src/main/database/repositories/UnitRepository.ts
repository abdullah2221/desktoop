import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class UnitRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM units WHERE status != 'inactive' ORDER BY name ASC").all();
  }

  static create(unit: any) {
    const db = getDatabase();
    const id = unit.id || `U-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare("INSERT INTO units (id, tenant_id, name, abbreviation) VALUES (@id, 'T001', @name, @abbreviation)");
    const info = stmt.run({
      id,
      name: unit.name,
      abbreviation: unit.abbreviation || ''
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'UNIT_CREATE', details: `Unit ${id} created` });
    }
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static update(unit: any) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE units SET name = @name, abbreviation = @abbreviation, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
    const info = stmt.run({
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation || ''
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'UNIT_UPDATE', details: `Unit ${unit.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE units SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'UNIT_DEACTIVATE', details: `Unit ${id} deactivated` });
    }
    return info.changes > 0;
  }
}
