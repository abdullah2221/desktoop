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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const connection_1 = require("../connection");
const migrations_1 = require("../migrations");
const seed_1 = require("../seed");
const ProductRepository_1 = require("../repositories/ProductRepository");
const CustomerRepository_1 = require("../repositories/CustomerRepository");
const SaleRepository_1 = require("../repositories/SaleRepository");
const ExpenseRepository_1 = require("../repositories/ExpenseRepository");
const SettingsRepository_1 = require("../repositories/SettingsRepository");
const backup_1 = require("../backup");
const inspector_1 = require("../inspector");
const fs = __importStar(require("fs"));
(0, vitest_1.describe)('SQLite Database Repositories Integration Tests', () => {
    (0, vitest_1.beforeAll)(() => {
        // 1. Initialize SQLite connection, run migrations, and seed default test data
        const db = (0, connection_1.getDatabase)();
        (0, migrations_1.runMigrations)();
        (0, seed_1.runSeeds)();
    });
    // 1. Verify Seed Data
    (0, vitest_1.it)('should successfully run seeds and populate default catalog', () => {
        const products = ProductRepository_1.ProductRepository.getAll();
        (0, vitest_1.expect)(products.length).toBeGreaterThan(0);
        const basmati = products.find(p => p.id === 'P001');
        (0, vitest_1.expect)(basmati).toBeDefined();
        (0, vitest_1.expect)(basmati.name).toBe('Super Basmati Rice 1kg');
        (0, vitest_1.expect)(basmati.price).toBe(380.0);
    });
    // 2. Product CRUD Operations
    (0, vitest_1.it)('should create, update, delete, and adjust product stock levels', () => {
        // A. Create Product
        const newProduct = {
            id: 'TEST-P999',
            name: 'Pansar Premium Almonds 250g',
            category: 'Grocery',
            stock: 40,
            cost: 450.0,
            price: 550.0
        };
        const created = ProductRepository_1.ProductRepository.create(newProduct);
        (0, vitest_1.expect)(created).toBe(true);
        // B. Read Product
        let products = ProductRepository_1.ProductRepository.getAll();
        let almonds = products.find(p => p.id === 'TEST-P999');
        (0, vitest_1.expect)(almonds).toBeDefined();
        (0, vitest_1.expect)(almonds.stock).toBe(40);
        // C. Update Product
        almonds.price = 580.0;
        almonds.stock = 35;
        const updated = ProductRepository_1.ProductRepository.update(almonds);
        (0, vitest_1.expect)(updated).toBe(true);
        products = ProductRepository_1.ProductRepository.getAll();
        almonds = products.find(p => p.id === 'TEST-P999');
        (0, vitest_1.expect)(almonds.price).toBe(580.0);
        (0, vitest_1.expect)(almonds.stock).toBe(35);
        // D. Update Stock Level directly
        const stockUpdated = ProductRepository_1.ProductRepository.updateStock('TEST-P999', 15);
        (0, vitest_1.expect)(stockUpdated).toBe(true);
        products = ProductRepository_1.ProductRepository.getAll();
        almonds = products.find(p => p.id === 'TEST-P999');
        (0, vitest_1.expect)(almonds.stock).toBe(15);
        // E. Delete Product
        const deleted = ProductRepository_1.ProductRepository.delete('TEST-P999');
        (0, vitest_1.expect)(deleted).toBe(true);
        products = ProductRepository_1.ProductRepository.getAll();
        almonds = products.find(p => p.id === 'TEST-P999');
        (0, vitest_1.expect)(almonds).toBeUndefined();
    });
    // 3. Customer Ledger Credits & Payments
    (0, vitest_1.it)('should increase customer credit lines and log payments correctly', () => {
        // A. Increment Credit (Udhaar) and purchases on new profile
        const dateStr = new Date().toISOString().split('T')[0];
        const customerName = 'TEST-Arif Jamil';
        const credited = CustomerRepository_1.CustomerRepository.createOrIncrementCredit(customerName, 4500.0, 12000.0, dateStr);
        (0, vitest_1.expect)(credited).toBe(true);
        let customers = CustomerRepository_1.CustomerRepository.getAll();
        let arif = customers.find(c => c.name === customerName);
        (0, vitest_1.expect)(arif).toBeDefined();
        (0, vitest_1.expect)(arif.credit).toBe(4500.0);
        (0, vitest_1.expect)(arif.totalPurchases).toBe(12000.0);
        // B. Increment credit on existing profile
        const creditedMore = CustomerRepository_1.CustomerRepository.createOrIncrementCredit(customerName, 2500.0, 5000.0, dateStr);
        (0, vitest_1.expect)(creditedMore).toBe(true);
        customers = CustomerRepository_1.CustomerRepository.getAll();
        arif = customers.find(c => c.name === customerName);
        (0, vitest_1.expect)(arif.credit).toBe(7000.0);
        (0, vitest_1.expect)(arif.totalPurchases).toBe(17000.0);
        // C. Receive Payment
        const paymentReceived = CustomerRepository_1.CustomerRepository.receivePayment(customerName, 3000.0, dateStr);
        (0, vitest_1.expect)(paymentReceived).toBe(true);
        customers = CustomerRepository_1.CustomerRepository.getAll();
        arif = customers.find(c => c.name === customerName);
        (0, vitest_1.expect)(arif.credit).toBe(4000.0); // 7000 - 3000
    });
    // 4. Sales Invoices
    (0, vitest_1.it)('should successfully persist transaction invoices', () => {
        const invoice = {
            invoiceNo: 'TEST-INV-55',
            customerName: 'TEST-Arif Jamil',
            date: new Date().toISOString().split('T')[0],
            total: 3500.0,
            status: 'Paid',
            discount: 200.0,
            tax_rate: 5.0
        };
        const logged = SaleRepository_1.SaleRepository.create(invoice);
        (0, vitest_1.expect)(logged).toBe(true);
        const sales = SaleRepository_1.SaleRepository.getAll();
        const testInv = sales.find(s => s.invoiceNo === 'TEST-INV-55');
        (0, vitest_1.expect)(testInv).toBeDefined();
        (0, vitest_1.expect)(testInv.total).toBe(3500.0);
        (0, vitest_1.expect)(testInv.status).toBe('Paid');
    });
    // 5. Expense Logging
    (0, vitest_1.it)('should successfully log store expenses', () => {
        const expense = {
            id: 'TEST-EXP-77',
            date: new Date().toISOString().split('T')[0],
            category: 'Utility Bill',
            amount: 8500.0,
            paidTo: 'Sui Northern Gas Ltd',
            status: 'Paid'
        };
        const logged = ExpenseRepository_1.ExpenseRepository.create(expense);
        (0, vitest_1.expect)(logged).toBe(true);
        const expenses = ExpenseRepository_1.ExpenseRepository.getAll();
        const testExp = expenses.find(e => e.id === 'TEST-EXP-77');
        (0, vitest_1.expect)(testExp).toBeDefined();
        (0, vitest_1.expect)(testExp.amount).toBe(8500.0);
        (0, vitest_1.expect)(testExp.paidTo).toBe('Sui Northern Gas Ltd');
    });
    // 6. Settings Persistence
    (0, vitest_1.it)('should handle persistent configuration properties', () => {
        // A. Update settings key
        const updated = SettingsRepository_1.SettingsRepository.update('storeName', 'Al-Haram DHA Superstore');
        (0, vitest_1.expect)(updated).toBe(true);
        // B. Get settings object
        const settings = SettingsRepository_1.SettingsRepository.get();
        (0, vitest_1.expect)(settings.storeName).toBe('Al-Haram DHA Superstore');
    });
    // 7. Diagnostics Inspector & Backup Service
    (0, vitest_1.it)('should run database diagnostics and create timestamped local backups', () => {
        // A. Inspector
        const stats = inspector_1.DatabaseInspector.getStats();
        (0, vitest_1.expect)(stats.products).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.customers).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.sales).toBeGreaterThan(0);
        // B. Backup Service
        const backupFilePath = backup_1.BackupService.backup();
        (0, vitest_1.expect)(backupFilePath).toBeDefined();
        (0, vitest_1.expect)(fs.existsSync(backupFilePath)).toBe(true);
        // Clean up backup file created during test run
        if (fs.existsSync(backupFilePath)) {
            fs.unlinkSync(backupFilePath);
        }
    });
});
