"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const connection_1 = require("../connection");
class AuditLogRepository {
    static write(payload) {
        const db = (0, connection_1.getDatabase)();
        const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const info = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details)
      VALUES (@id, @user_id, @action, @details)
    `).run({
            id,
            user_id: payload.user_id ?? null,
            action: payload.action,
            details: payload.details
        });
        return info.changes > 0;
    }
}
exports.AuditLogRepository = AuditLogRepository;
