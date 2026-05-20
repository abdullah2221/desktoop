"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class BrandRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare("SELECT * FROM brands WHERE status != 'inactive' ORDER BY name ASC").all();
    }
    static create(brand) {
        const db = (0, connection_1.getDatabase)();
        const id = brand.id || `BR-${Math.floor(1000 + Math.random() * 9000)}`;
        const stmt = db.prepare("INSERT INTO brands (id, tenant_id, name) VALUES (@id, 'T001', @name)");
        const info = stmt.run({
            id,
            name: brand.name
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BRAND_CREATE', details: `Brand ${id} created` });
        }
        return info.changes > 0 ? { success: true, id } : { success: false };
    }
    static update(brand) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('UPDATE brands SET name = @name, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
        const info = stmt.run({
            id: brand.id,
            name: brand.name
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BRAND_UPDATE', details: `Brand ${brand.id} updated` });
        }
        return info.changes > 0;
    }
    static deactivate(id) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE brands SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BRAND_DEACTIVATE', details: `Brand ${id} deactivated` });
        }
        return info.changes > 0;
    }
}
exports.BrandRepository = BrandRepository;
