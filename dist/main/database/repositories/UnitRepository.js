"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class UnitRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare("SELECT * FROM units WHERE status != 'inactive' ORDER BY name ASC").all();
    }
    static create(unit) {
        const db = (0, connection_1.getDatabase)();
        const id = unit.id || `U-${Math.floor(1000 + Math.random() * 9000)}`;
        const stmt = db.prepare("INSERT INTO units (id, tenant_id, name, abbreviation) VALUES (@id, 'T001', @name, @abbreviation)");
        const info = stmt.run({
            id,
            name: unit.name,
            abbreviation: unit.abbreviation || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'UNIT_CREATE', details: `Unit ${id} created` });
        }
        return info.changes > 0 ? { success: true, id } : { success: false };
    }
    static update(unit) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('UPDATE units SET name = @name, abbreviation = @abbreviation, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
        const info = stmt.run({
            id: unit.id,
            name: unit.name,
            abbreviation: unit.abbreviation || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'UNIT_UPDATE', details: `Unit ${unit.id} updated` });
        }
        return info.changes > 0;
    }
    static deactivate(id) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE units SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'UNIT_DEACTIVATE', details: `Unit ${id} deactivated` });
        }
        return info.changes > 0;
    }
}
exports.UnitRepository = UnitRepository;
