"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeeds = runSeeds;
const connection_1 = require("./connection");
function runSeeds() {
    const db = (0, connection_1.getDatabase)();
    console.log('[Database Seed] Checking seeding pre-requisites...');
    // 1. Seed Tenant
    const tenantCount = db.prepare('SELECT count(*) as count FROM tenants').get();
    if (tenantCount.count === 0) {
        console.log('[Database Seed] Seeding Default Tenant...');
        db.prepare(`
      INSERT INTO tenants (id, name, phone, address, ntn)
      VALUES ('T001', 'Al-Haram Grocery Enterprise', '042-35889900', 'Main Bazaar, DHA Phase 3, Lahore', '5938472-8')
    `).run();
    }
    // 2. Seed Branch
    const branchCount = db.prepare('SELECT count(*) as count FROM branches').get();
    if (branchCount.count === 0) {
        console.log('[Database Seed] Seeding Default Branch...');
        db.prepare(`
      INSERT INTO branches (id, tenant_id, name, phone, address)
      VALUES ('B001', 'T001', 'Al-Haram Grocery - DHA Branch', '042-35889900', 'Main Bazaar, DHA Phase 3, Lahore')
    `).run();
    }
    // 3. Seed Roles
    const rolesCount = db.prepare('SELECT count(*) as count FROM roles').get();
    if (rolesCount.count === 0) {
        console.log('[Database Seed] Seeding System Roles...');
        const insertRole = db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
        insertRole.run('R001', 'ADMIN', 'Full Enterprise Access');
        insertRole.run('R002', 'MANAGER', 'Store Inventory & Expense Access');
        insertRole.run('R003', 'CASHIER', 'POS Checkout Terminal Access');
    }
    // 4. Seed Permissions
    const permissionsCount = db.prepare('SELECT count(*) as count FROM permissions').get();
    if (permissionsCount.count === 0) {
        console.log('[Database Seed] Seeding System Permissions...');
        const insertPermission = db.prepare('INSERT INTO permissions (id, name, description) VALUES (?, ?, ?)');
        insertPermission.run('P_ALL', 'ENTERPRISE_FULL', 'All Operations');
        insertPermission.run('P_BILL', 'POS_BILLING', 'Execute POS Checkout');
        insertPermission.run('P_INV', 'INVENTORY_MANAGE', 'Manage Store Products');
    }
    // 5. Seed Users
    const userCount = db.prepare('SELECT count(*) as count FROM users').get();
    if (userCount.count === 0) {
        console.log('[Database Seed] Seeding Default Admin User...');
        db.prepare(`
      INSERT INTO users (id, tenant_id, branch_id, username, role_id)
      VALUES ('U001', 'T001', 'B001', 'Kashif Ali', 'R001')
    `).run();
    }
    // 6. Seed Categories
    const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get();
    if (categoryCount.count === 0) {
        console.log('[Database Seed] Seeding Default Categories...');
        const insertCategory = db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)');
        insertCategory.run('CAT01', 'Grocery', 'Dry Goods and Sundries');
        insertCategory.run('CAT02', 'Beverage', 'Cold drinks and beverages');
    }
    // 7. Seed Products
    const productCount = db.prepare('SELECT count(*) as count FROM products').get();
    if (productCount.count === 0) {
        console.log('[Database Seed] Seeding Initial Products Catalog...');
        const insertProduct = db.prepare(`
      INSERT INTO products (id, tenant_id, branch_id, category_id, name, category, stock, cost, price)
      VALUES (?, 'T001', 'B001', ?, ?, ?, ?, ?, ?)
    `);
        const defaultProducts = [
            ['P001', 'CAT01', 'Super Basmati Rice 1kg', 'Grocery', 120, 310.0, 380.0],
            ['P002', 'CAT01', 'Fine Wheat Flour 10kg', 'Grocery', 8, 1150.0, 1300.0],
            ['P003', 'CAT01', 'Dal Chana Premium 1kg', 'Grocery', 45, 260.0, 320.0],
            ['P004', 'CAT02', 'Pakola Club Soda 250ml', 'Beverage', 80, 50.0, 70.0],
            ['P005', 'CAT02', 'Supreme Tea Blend 400g', 'Beverage', 3, 580.0, 680.0],
            ['P006', 'CAT01', 'Sugar (White) 1kg', 'Grocery', 250, 130.0, 155.0],
            ['P007', 'CAT01', 'Banaspati Cooking Oil 1L', 'Grocery', 65, 420.0, 490.0]
        ];
        const transaction = db.transaction(() => {
            for (const p of defaultProducts) {
                insertProduct.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
            }
        });
        transaction();
    }
    // 8. Seed Sales
    const salesCount = db.prepare('SELECT count(*) as count FROM sales').get();
    if (salesCount.count === 0) {
        console.log('[Database Seed] Seeding Initial Transaction Logs...');
        const insertSale = db.prepare(`
      INSERT INTO sales (invoiceNo, tenant_id, branch_id, customerName, date, total, status, discount, tax_rate)
      VALUES (?, 'T001', 'B001', ?, ?, ?, ?, 0.0, 0.0)
    `);
        const defaultSales = [
            ['INV-1024', 'Arsalan Khan', '2026-05-20', 1850.0, 'Paid'],
            ['INV-1023', 'Zainab Bibi', '2026-05-20', 640.0, 'Credit'],
            ['INV-1022', 'Muhammad Bilal', '2026-05-19', 3250.0, 'Paid']
        ];
        const transaction = db.transaction(() => {
            for (const s of defaultSales) {
                insertSale.run(s[0], s[1], s[2], s[3], s[4]);
            }
        });
        transaction();
    }
    // 9. Seed Expenses
    const expenseCount = db.prepare('SELECT count(*) as count FROM expenses').get();
    if (expenseCount.count === 0) {
        console.log('[Database Seed] Seeding Initial Shop Expenses...');
        const insertExpense = db.prepare(`
      INSERT INTO expenses (id, tenant_id, branch_id, date, category, amount, paidTo, status)
      VALUES (?, 'T001', 'B001', ?, ?, ?, ?, ?)
    `);
        const defaultExpenses = [
            ['EXP-001', '2026-05-18', 'Utility Bill', 14500.0, 'LESCO Electricity', 'Paid'],
            ['EXP-002', '2026-05-15', 'Shop Rent', 35000.0, 'Malik Anwar (Landlord)', 'Paid'],
            ['EXP-003', '2026-05-12', 'Sundry', 1200.0, 'Stationery & Receipt Roll', 'Paid']
        ];
        const transaction = db.transaction(() => {
            for (const e of defaultExpenses) {
                insertExpense.run(e[0], e[1], e[2], e[3], e[4], e[5]);
            }
        });
        transaction();
    }
    // 10. Seed Customers
    const customerCount = db.prepare('SELECT count(*) as count FROM customers').get();
    if (customerCount.count === 0) {
        console.log('[Database Seed] Seeding Initial Customer Udhaar Profiles...');
        const insertCustomer = db.prepare(`
      INSERT INTO customers (name, tenant_id, branch_id, phone, totalPurchases, credit, lastPayment)
      VALUES (?, 'T001', 'B001', ?, ?, ?, ?)
    `);
        const defaultCustomers = [
            ['Arsalan Khan', '0300-1234567', 18500.0, 0.0, '2026-05-20'],
            ['Zainab Bibi', '0312-9876543', 8400.0, 3400.0, '2026-05-18'],
            ['Muhammad Bilal', '0333-5551122', 25400.0, 8900.0, '2026-05-19'],
            ['Sajid Mehmood', '0345-4448899', 4500.0, 0.0, '2026-05-10']
        ];
        const transaction = db.transaction(() => {
            for (const c of defaultCustomers) {
                insertCustomer.run(c[0], c[1], c[2], c[3], c[4]);
            }
        });
        transaction();
    }
    // 11. Seed Settings
    const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
        console.log('[Database Seed] Seeding Default Store Configuration...');
        const insertSetting = db.prepare("INSERT INTO settings (key, value, tenant_id, branch_id) VALUES (?, ?, 'T001', 'B001')");
        insertSetting.run('storeName', 'Al-Haram Grocery & General Store');
        insertSetting.run('storePhone', '042-35889900');
        insertSetting.run('storeAddress', 'Main Bazaar, DHA Phase 3, Lahore, Pakistan');
        insertSetting.run('storeNTN', 'NTN-5938472-8');
    }
    console.log('[Database Seed] Database Seeding process complete.');
}
