"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = void 0;
const connection_1 = require("../connection");
class CustomerRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    }
    static createOrIncrementCredit(name, creditChange, purchasesChange, paymentDate) {
        const db = (0, connection_1.getDatabase)();
        // Check if customer exists first
        const customer = db.prepare('SELECT * FROM customers WHERE name = ?').get(name);
        if (customer) {
            const stmt = db.prepare(`
        UPDATE customers 
        SET credit = credit + ?, totalPurchases = totalPurchases + ?, lastPayment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `);
            const info = stmt.run(creditChange, purchasesChange, paymentDate, name);
            return info.changes > 0;
        }
        else {
            const stmt = db.prepare(`
        INSERT INTO customers (name, tenant_id, branch_id, phone, totalPurchases, credit, lastPayment)
        VALUES (?, 'T001', 'B001', '0300-0000000', ?, ?, ?)
      `);
            const info = stmt.run(name, purchasesChange, creditChange, paymentDate);
            return info.changes > 0;
        }
    }
    static receivePayment(name, payAmt, paymentDate) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE customers 
      SET credit = MAX(0, credit - ?), lastPayment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `);
        const info = stmt.run(payAmt, paymentDate, name);
        return info.changes > 0;
    }
}
exports.CustomerRepository = CustomerRepository;
