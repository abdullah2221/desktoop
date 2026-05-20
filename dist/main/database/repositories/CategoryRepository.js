"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class CategoryRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare("SELECT * FROM categories WHERE status != 'inactive' ORDER BY name ASC").all();
    }
    static create(category) {
        const db = (0, connection_1.getDatabase)();
        const id = category.id || `CAT-${Math.floor(1000 + Math.random() * 9000)}`;
        const stmt = db.prepare('INSERT INTO categories (id, name, description) VALUES (@id, @name, @description)');
        const info = stmt.run({
            id,
            name: category.name,
            description: category.description || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CATEGORY_CREATE', details: `Category ${id} created` });
        }
        return info.changes > 0 ? { success: true, id } : { success: false };
    }
    static update(category) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('UPDATE categories SET name = @name, description = @description, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
        const info = stmt.run({
            id: category.id,
            name: category.name,
            description: category.description || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CATEGORY_UPDATE', details: `Category ${category.id} updated` });
        }
        return info.changes > 0;
    }
    static deactivate(id) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE categories SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'CATEGORY_DEACTIVATE', details: `Category ${id} deactivated` });
        }
        return info.changes > 0;
    }
}
exports.CategoryRepository = CategoryRepository;
