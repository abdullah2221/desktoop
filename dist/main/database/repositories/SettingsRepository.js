"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class SettingsRepository {
    static get() {
        const db = (0, connection_1.getDatabase)();
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    }
    static update(key, value) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, tenant_id, branch_id)
      VALUES (?, ?, 'T001', 'B001')
    `);
        const info = stmt.run(key, value);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'SETTINGS_UPDATE', details: `Setting ${key} updated` });
        }
        return info.changes > 0;
    }
}
exports.SettingsRepository = SettingsRepository;
