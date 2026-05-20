"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
class SupplierRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    }
    static getById(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    }
    static create(supplier) {
        const db = (0, connection_1.getDatabase)();
        // Auto-generate ID if not provided
        const id = supplier.id || `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
        const stmt = db.prepare(`
      INSERT INTO suppliers (
        id, tenant_id, name, contact_person, phone, whatsapp, email, 
        address, city, ntn, opening_balance, current_balance, status, notes
      ) VALUES (
        @id, 'T001', @name, @contact_person, @phone, @whatsapp, @email,
        @address, @city, @ntn, @opening_balance, @current_balance, @status, @notes
      )
    `);
        const info = stmt.run({
            id,
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            whatsapp: supplier.whatsapp || '',
            email: supplier.email || '',
            address: supplier.address || '',
            city: supplier.city || '',
            ntn: supplier.ntn || '',
            opening_balance: supplier.opening_balance || 0,
            current_balance: supplier.opening_balance || 0,
            status: supplier.status || 'active',
            notes: supplier.notes || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'SUPPLIER_CREATE', details: `Supplier ${id} created` });
        }
        return info.changes > 0 ? { success: true, id } : { success: false };
    }
    static update(supplier) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE suppliers 
      SET 
        name = @name, 
        contact_person = @contact_person, 
        phone = @phone, 
        whatsapp = @whatsapp, 
        email = @email, 
        address = @address, 
        city = @city, 
        ntn = @ntn, 
        status = @status, 
        notes = @notes, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
        const info = stmt.run({
            id: supplier.id,
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            whatsapp: supplier.whatsapp || '',
            email: supplier.email || '',
            address: supplier.address || '',
            city: supplier.city || '',
            ntn: supplier.ntn || '',
            status: supplier.status || 'active',
            notes: supplier.notes || ''
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'SUPPLIER_UPDATE', details: `Supplier ${supplier.id} updated` });
        }
        return info.changes > 0;
    }
    static deactivate(id) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE suppliers SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'SUPPLIER_DEACTIVATE', details: `Supplier ${id} deactivated` });
        }
        return info.changes > 0;
    }
    static getLedger(supplierId) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, created_at DESC').all(supplierId);
    }
}
exports.SupplierRepository = SupplierRepository;
