"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbOps = void 0;
exports.initDatabase = initDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let db;
function initDatabase() {
    const isDev = !electron_1.app.isPackaged;
    // Place the database file in a stable, persistent folder inside the workspace
    const dbDir = isDev
        ? path.join(__dirname, '../../database')
        : path.join(electron_1.app.getPath('userData'), 'database');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'erp.db');
    console.log(`[Database] Initializing SQLite database at: ${dbPath}`);
    db = new better_sqlite3_1.default(dbPath);
    // Enable WAL mode for high performance and concurrency
    db.pragma('journal_mode = WAL');
    // Create tables with full auditing and future-proof multi-tenant columns
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL,
      cost REAL NOT NULL,
      price REAL NOT NULL,
      tenant_id TEXT DEFAULT 'T001',
      branch_id TEXT DEFAULT 'B001',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'U001',
      updated_by TEXT DEFAULT 'U001'
    );

    CREATE TABLE IF NOT EXISTS sales (
      invoiceNo TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      date TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      tenant_id TEXT DEFAULT 'T001',
      branch_id TEXT DEFAULT 'B001',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'U001',
      updated_by TEXT DEFAULT 'U001'
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      paidTo TEXT NOT NULL,
      status TEXT NOT NULL,
      tenant_id TEXT DEFAULT 'T001',
      branch_id TEXT DEFAULT 'B001',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'U001',
      updated_by TEXT DEFAULT 'U001'
    );

    CREATE TABLE IF NOT EXISTS customers (
      name TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      totalPurchases REAL NOT NULL,
      credit REAL NOT NULL,
      lastPayment TEXT NOT NULL,
      tenant_id TEXT DEFAULT 'T001',
      branch_id TEXT DEFAULT 'B001',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'U001',
      updated_by TEXT DEFAULT 'U001'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
    // Seed default values only if tables are completely empty
    seedDatabase();
}
function seedDatabase() {
    // Check if products exist
    const productCount = db.prepare('SELECT count(*) as count FROM products').get();
    if (productCount.count === 0) {
        console.log('[Database] Seeding initial mock products...');
        const insertProduct = db.prepare(`
      INSERT INTO products (id, name, category, stock, cost, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const defaultProducts = [
            ['P001', 'Super Basmati Rice 1kg', 'Grocery', 120, 310, 380],
            ['P002', 'Fine Wheat Flour 10kg', 'Grocery', 8, 1150, 1300],
            ['P003', 'Dal Chana Premium 1kg', 'Grocery', 45, 260, 320],
            ['P004', 'Pakola Club Soda 250ml', 'Beverage', 80, 50, 70],
            ['P005', 'Supreme Tea Blend 400g', 'Beverage', 3, 580, 680],
            ['P006', 'Sugar (White) 1kg', 'Grocery', 250, 130, 155],
            ['P007', 'Banaspati Cooking Oil 1L', 'Grocery', 65, 420, 490]
        ];
        const transaction = db.transaction(() => {
            for (const p of defaultProducts) {
                insertProduct.run(p[0], p[1], p[2], p[3], p[4], p[5]);
            }
        });
        transaction();
    }
    // Check if sales exist
    const salesCount = db.prepare('SELECT count(*) as count FROM sales').get();
    if (salesCount.count === 0) {
        console.log('[Database] Seeding initial mock sales invoice logs...');
        const insertSale = db.prepare(`
      INSERT INTO sales (invoiceNo, customerName, date, total, status)
      VALUES (?, ?, ?, ?, ?)
    `);
        const defaultSales = [
            ['INV-1024', 'Arsalan Khan', '2026-05-20', 1850, 'Paid'],
            ['INV-1023', 'Zainab Bibi', '2026-05-20', 640, 'Credit'],
            ['INV-1022', 'Muhammad Bilal', '2026-05-19', 3250, 'Paid']
        ];
        const transaction = db.transaction(() => {
            for (const s of defaultSales) {
                insertSale.run(s[0], s[1], s[2], s[3], s[4]);
            }
        });
        transaction();
    }
    // Check if expenses exist
    const expenseCount = db.prepare('SELECT count(*) as count FROM expenses').get();
    if (expenseCount.count === 0) {
        console.log('[Database] Seeding initial mock utility overhead logs...');
        const insertExpense = db.prepare(`
      INSERT INTO expenses (id, date, category, amount, paidTo, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const defaultExpenses = [
            ['EXP-001', '2026-05-18', 'Utility Bill', 14500, 'LESCO Electricity', 'Paid'],
            ['EXP-002', '2026-05-15', 'Shop Rent', 35000, 'Malik Anwar (Landlord)', 'Paid'],
            ['EXP-003', '2026-05-12', 'Sundry', 1200, 'Stationery & Receipt Roll', 'Paid']
        ];
        const transaction = db.transaction(() => {
            for (const e of defaultExpenses) {
                insertExpense.run(e[0], e[1], e[2], e[3], e[4], e[5]);
            }
        });
        transaction();
    }
    // Check if customers exist
    const customerCount = db.prepare('SELECT count(*) as count FROM customers').get();
    if (customerCount.count === 0) {
        console.log('[Database] Seeding initial mock customer ledgers...');
        const insertCustomer = db.prepare(`
      INSERT INTO customers (name, phone, totalPurchases, credit, lastPayment)
      VALUES (?, ?, ?, ?, ?)
    `);
        const defaultCustomers = [
            ['Arsalan Khan', '0300-1234567', 18500, 0, '2026-05-20'],
            ['Zainab Bibi', '0312-9876543', 8400, 3400, '2026-05-18'],
            ['Muhammad Bilal', '0333-5551122', 25400, 8900, '2026-05-19'],
            ['Sajid Mehmood', '0345-4448899', 4500, 0, '2026-05-10']
        ];
        const transaction = db.transaction(() => {
            for (const c of defaultCustomers) {
                insertCustomer.run(c[0], c[1], c[2], c[3], c[4]);
            }
        });
        transaction();
    }
    // Check if default settings exist
    const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
        console.log('[Database] Seeding default store metadata...');
        const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        insertSetting.run('storeName', 'Al-Haram Grocery & General Store');
        insertSetting.run('storePhone', '042-35889900');
        insertSetting.run('storeAddress', 'Main Bazaar, DHA Phase 3, Lahore, Pakistan');
        insertSetting.run('storeNTN', 'NTN-5938472-8');
    }
}
// ----------------------------------------------------
// DATABASE OPERATION WRAPPERS (EXPOSED TO IPC THREAD)
// ----------------------------------------------------
exports.dbOps = {
    // PRODUCTS CRUD
    getProducts: () => {
        return db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    },
    addProduct: (product) => {
        const stmt = db.prepare(`
      INSERT INTO products (id, name, category, stock, cost, price)
      VALUES (@id, @name, @category, @stock, @cost, @price)
    `);
        stmt.run(product);
        return true;
    },
    updateProductStock: (id, newStock) => {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, id);
        return true;
    },
    // SALES LOGGING
    getSales: () => {
        return db.prepare('SELECT * FROM sales ORDER BY date DESC, invoiceNo DESC').all();
    },
    addSale: (sale) => {
        const stmt = db.prepare(`
      INSERT INTO sales (invoiceNo, customerName, date, total, status)
      VALUES (@invoiceNo, @customerName, @date, @total, @status)
    `);
        stmt.run(sale);
        return true;
    },
    // EXPENSES JOURNAL
    getExpenses: () => {
        return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
    },
    addExpense: (expense) => {
        const stmt = db.prepare(`
      INSERT INTO expenses (id, date, category, amount, paidTo, status)
      VALUES (@id, @date, @category, @amount, @paidTo, @status)
    `);
        stmt.run(expense);
        return true;
    },
    // CUSTOMERS LEDGER
    getCustomers: () => {
        return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    },
    updateCustomerCredit: (name, additionalCredit, additionalPurchases, paymentDate) => {
        // Perform upsert or standard increment update
        const c = db.prepare('SELECT * FROM customers WHERE name = ?').get(name);
        if (c) {
            db.prepare(`
        UPDATE customers 
        SET credit = credit + ?, totalPurchases = totalPurchases + ?, lastPayment = ?
        WHERE name = ?
      `).run(additionalCredit, additionalPurchases, paymentDate, name);
        }
        else {
            db.prepare(`
        INSERT INTO customers (name, phone, totalPurchases, credit, lastPayment)
        VALUES (?, '0300-0000000', ?, ?, ?)
      `).run(name, additionalPurchases, additionalCredit, paymentDate);
        }
        return true;
    },
    receiveCustomerPayment: (name, payAmt, paymentDate) => {
        db.prepare(`
      UPDATE customers 
      SET credit = MAX(0, credit - ?), lastPayment = ?
      WHERE name = ?
    `).run(payAmt, paymentDate, name);
        return true;
    },
    // SETTINGS KEY/VALUE STORE
    getSettings: () => {
        const rows = db.prepare('SELECT * FROM settings').all();
        const result = {};
        for (const r of rows) {
            result[r.key] = r.value;
        }
        return result;
    },
    saveSetting: (key, value) => {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
        return true;
    }
};
