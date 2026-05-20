"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseInspector = void 0;
const connection_1 = require("./connection");
class DatabaseInspector {
    static getStats() {
        const db = (0, connection_1.getDatabase)();
        // Query individual counts dynamically
        const products = db.prepare('SELECT count(*) as count FROM products').get().count;
        const customers = db.prepare('SELECT count(*) as count FROM customers').get().count;
        const sales = db.prepare('SELECT count(*) as count FROM sales').get().count;
        const expenses = db.prepare('SELECT count(*) as count FROM expenses').get().count;
        const auditLogs = db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
        return {
            products,
            customers,
            sales,
            expenses,
            auditLogs
        };
    }
}
exports.DatabaseInspector = DatabaseInspector;
