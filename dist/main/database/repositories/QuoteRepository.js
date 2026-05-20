"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const TaxRepository_1 = require("./TaxRepository");
class QuoteRepository {
    static enforceExpiry() {
        const db = (0, connection_1.getDatabase)();
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
      UPDATE quotes
      SET status = 'Expired', updated_at = CURRENT_TIMESTAMP
      WHERE expiry_date < ?
        AND status NOT IN ('Accepted', 'Rejected', 'Expired')
    `).run(today);
    }
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        this.enforceExpiry();
        return db.prepare('SELECT * FROM quotes ORDER BY quote_date DESC, created_at DESC').all();
    }
    static getById(id) {
        const db = (0, connection_1.getDatabase)();
        this.enforceExpiry();
        const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
        if (!quote)
            return null;
        const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY rowid ASC').all(id);
        return { ...quote, items };
    }
    static create(payload) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((data) => {
            const id = data.id || `QT-${Date.now()}`;
            const quoteNo = data.quote_no || `QUO-${Date.now()}`;
            db.prepare(`
        INSERT INTO quotes (
          id, quote_no, tenant_id, branch_id, customer_name, quote_date, expiry_date,
          status, subtotal, discount_total, tax_total, grand_total, notes, tax_code, tax_mode
        ) VALUES (
          @id, @quote_no, 'T001', 'B001', @customer_name, @quote_date, @expiry_date,
          @status, @subtotal, @discount_total, @tax_total, @grand_total, @notes, @tax_code, @tax_mode
        )
      `).run({
                id,
                quote_no: quoteNo,
                customer_name: data.customer_name,
                quote_date: data.quote_date,
                expiry_date: data.expiry_date,
                status: data.status || 'Draft',
                subtotal: data.subtotal,
                discount_total: data.discount_total,
                tax_total: data.tax_total,
                grand_total: data.grand_total,
                notes: data.notes || '',
                tax_code: data.tax_code || TaxRepository_1.TaxRepository.getDefaultTaxCode('sales'),
                tax_mode: data.tax_mode || 'exclusive'
            });
            const insertItem = db.prepare(`
        INSERT INTO quote_items (
          id, quote_id, product_id, quantity, unit_price, discount, tax_rate, line_total
        ) VALUES (
          @id, @quote_id, @product_id, @quantity, @unit_price, @discount, @tax_rate, @line_total
        )
      `);
            for (const item of data.items) {
                insertItem.run({
                    id: `QI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    quote_id: id,
                    ...item
                });
            }
            AuditLogRepository_1.AuditLogRepository.write({ action: 'QUOTE_CREATE', details: `Quote ${id} created` });
            return { success: true, id };
        });
        return tx(payload);
    }
    static update(payload) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((data) => {
            const info = db.prepare(`
        UPDATE quotes
        SET customer_name = @customer_name,
            quote_date = @quote_date,
            expiry_date = @expiry_date,
            status = @status,
            subtotal = @subtotal,
            discount_total = @discount_total,
            tax_total = @tax_total,
            grand_total = @grand_total,
            notes = @notes,
            tax_code = @tax_code,
            tax_mode = @tax_mode,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
                id: data.id,
                customer_name: data.customer_name,
                quote_date: data.quote_date,
                expiry_date: data.expiry_date,
                status: data.status || 'Draft',
                subtotal: data.subtotal,
                discount_total: data.discount_total,
                tax_total: data.tax_total,
                grand_total: data.grand_total,
                notes: data.notes || '',
                tax_code: data.tax_code || TaxRepository_1.TaxRepository.getDefaultTaxCode('sales'),
                tax_mode: data.tax_mode || 'exclusive'
            });
            if (info.changes === 0)
                return false;
            db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(data.id);
            const insertItem = db.prepare(`
        INSERT INTO quote_items (
          id, quote_id, product_id, quantity, unit_price, discount, tax_rate, line_total
        ) VALUES (
          @id, @quote_id, @product_id, @quantity, @unit_price, @discount, @tax_rate, @line_total
        )
      `);
            for (const item of data.items) {
                insertItem.run({
                    id: `QI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    quote_id: data.id,
                    ...item
                });
            }
            AuditLogRepository_1.AuditLogRepository.write({ action: 'QUOTE_UPDATE', details: `Quote ${data.id} updated` });
            return true;
        });
        return tx(payload);
    }
}
exports.QuoteRepository = QuoteRepository;
