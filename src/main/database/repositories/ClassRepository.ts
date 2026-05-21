import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class ClassRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM classes ORDER BY class_code ASC').all();
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `CLS-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO classes (id, class_code, class_name, description, status)
      VALUES (@id, @class_code, @class_name, @description, @status)
    `).run({
      id,
      class_code: payload.class_code,
      class_name: payload.class_name,
      description: payload.description || '',
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'CLASS_CREATE', user_id: actorId, details: `Class ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: any, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE classes
      SET class_code=@class_code,
          class_name=@class_name,
          description=@description,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      class_code: payload.class_code,
      class_name: payload.class_name,
      description: payload.description || '',
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'CLASS_UPDATE', user_id: actorId, details: `Class ${payload.id} updated` });
    return info.changes > 0;
  }

  static deactivate(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE classes SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'CLASS_DEACTIVATE', user_id: actorId, details: `Class ${id} deactivated` });
    return info.changes > 0;
  }
}
