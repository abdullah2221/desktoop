"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class ClassRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM classes ORDER BY class_code ASC').all();
    }
    static create(payload, actorId) {
        const db = (0, connection_1.getDatabase)();
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
        if (info.changes > 0)
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CLASS_CREATE', user_id: actorId, details: `Class ${id} created` });
        return { success: info.changes > 0, id };
    }
    static update(payload, actorId) {
        const db = (0, connection_1.getDatabase)();
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
        if (info.changes > 0)
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CLASS_UPDATE', user_id: actorId, details: `Class ${payload.id} updated` });
        return info.changes > 0;
    }
    static deactivate(id, actorId) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE classes SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
        if (info.changes > 0)
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CLASS_DEACTIVATE', user_id: actorId, details: `Class ${id} deactivated` });
        return info.changes > 0;
    }
}
exports.ClassRepository = ClassRepository;
