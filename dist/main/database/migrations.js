"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const connection_1 = require("./connection");
const MIGRATION_VERSION = 1;
function addColumn(table, columnDef) {
    const db = (0, connection_1.getDatabase)();
    try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
        console.log(`[Database Migrations] Added column '${columnDef}' to '${table}'`);
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!message.includes('duplicate column name')) {
            console.error(`[Database Migrations] Error adding column '${columnDef}' to '${table}':`, message);
        }
    }
}
function createIndex(name, table, columns) {
    const db = (0, connection_1.getDatabase)();
    db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${columns})`);
}
function hasColumn(table, column) {
    const db = (0, connection_1.getDatabase)();
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some((r) => r.name === column);
}
function runSchemaBootstrap() {
    const db = (0, connection_1.getDatabase)();
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      ntn TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      role_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0.0,
      price REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      name TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      totalPurchases REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      lastPayment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      supplier_id TEXT,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sales (
      invoiceNo TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customerName TEXT NOT NULL,
      customer_id TEXT,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL,
      discount REAL DEFAULT 0.0,
      tax_rate REAL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      invoiceNo TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoiceNo) REFERENCES sales(invoiceNo) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0.0,
      paidTo TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      tenant_id TEXT DEFAULT 'T001',
      branch_id TEXT DEFAULT 'B001'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      quantity_in INTEGER DEFAULT 0,
      quantity_out INTEGER DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS supplier_ledger (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      debit REAL DEFAULT 0.0,
      credit REAL DEFAULT 0.0,
      balance REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_subtype TEXT,
      parent_account_id TEXT,
      opening_balance REAL DEFAULT 0.0,
      current_balance REAL DEFAULT 0.0,
      is_system_account INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_no TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      description TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      total_debit REAL NOT NULL,
      total_credit REAL NOT NULL,
      status TEXT DEFAULT 'posted',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      description TEXT,
      debit REAL DEFAULT 0.0,
      credit REAL DEFAULT 0.0,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS fiscal_years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_closed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounting_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_no TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      quote_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      subtotal REAL NOT NULL DEFAULT 0.0,
      discount_total REAL NOT NULL DEFAULT 0.0,
      tax_total REAL NOT NULL DEFAULT 0.0,
      grand_total REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 0.0,
      line_total REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_id TEXT,
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      subtotal REAL NOT NULL DEFAULT 0.0,
      discount_total REAL NOT NULL DEFAULT 0.0,
      tax_total REAL NOT NULL DEFAULT 0.0,
      grand_total REAL NOT NULL DEFAULT 0.0,
      amount_paid REAL NOT NULL DEFAULT 0.0,
      balance_due REAL NOT NULL DEFAULT 0.0,
      stock_posted INTEGER NOT NULL DEFAULT 0,
      accounting_posted INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 0.0,
      line_total REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tax_rates (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 0.0,
      type TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'exclusive',
      purchase_account_id TEXT,
      sales_account_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (sales_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tax_groups (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tax_group_items (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      tax_rate_id TEXT NOT NULL,
      sequence_no INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES tax_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tax_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_bank_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      linked_gl_account_id TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0.0,
      current_balance REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (linked_gl_account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS money_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      offset_gl_account_id TEXT,
      reference_no TEXT,
      notes TEXT,
      counter_account_id TEXT,
      is_cleared INTEGER DEFAULT 0,
      cleared_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (counter_account_id) REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (offset_gl_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bank_reconciliations (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      statement_balance REAL NOT NULL DEFAULT 0.0,
      book_balance REAL NOT NULL DEFAULT 0.0,
      difference REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
      id TEXT PRIMARY KEY,
      reconciliation_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      cleared_amount REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES money_transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_method_accounts (
      payment_method TEXT PRIMARY KEY,
      account_id TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES cash_bank_accounts(id) ON DELETE SET NULL
    );
  `);
}
function runBackfillAndAlters() {
    const db = (0, connection_1.getDatabase)();
    addColumn('suppliers', 'contact_person TEXT');
    addColumn('suppliers', 'whatsapp TEXT');
    addColumn('suppliers', 'city TEXT');
    addColumn('suppliers', 'ntn TEXT');
    addColumn('suppliers', 'opening_balance REAL DEFAULT 0.0');
    addColumn('suppliers', 'current_balance REAL DEFAULT 0.0');
    addColumn('suppliers', 'status TEXT DEFAULT "active"');
    addColumn('suppliers', 'notes TEXT');
    addColumn('purchases', 'payment_status TEXT DEFAULT "Paid"');
    addColumn('purchases', 'discount REAL DEFAULT 0.0');
    addColumn('purchases', 'tax REAL DEFAULT 0.0');
    addColumn('purchases', 'grand_total REAL DEFAULT 0.0');
    addColumn('purchases', 'amount_paid REAL DEFAULT 0.0');
    addColumn('purchases', 'remaining_payable REAL DEFAULT 0.0');
    addColumn('purchases', 'notes TEXT');
    addColumn('purchase_items', 'line_total REAL DEFAULT 0.0');
    addColumn('purchase_items', 'unit_cost REAL DEFAULT 0.0');
    addColumn('products', 'barcode TEXT');
    addColumn('products', 'supplier_id TEXT');
    addColumn('products', 'brand_id TEXT');
    addColumn('products', 'unit_id TEXT');
    addColumn('products', 'wholesale_price REAL DEFAULT 0.0');
    addColumn('products', 'opening_stock INTEGER DEFAULT 0');
    addColumn('products', 'min_stock_alert INTEGER DEFAULT 0');
    addColumn('products', 'expiry_date TEXT');
    addColumn('products', 'batch_number TEXT');
    addColumn('products', 'rack_location TEXT');
    addColumn('products', 'status TEXT DEFAULT "active"');
    addColumn('products', 'retail_price REAL DEFAULT 0.0');
    addColumn('sales', 'customer_id TEXT');
    addColumn('invoices', 'customer_id TEXT');
    addColumn('invoices', 'stock_posted INTEGER DEFAULT 0');
    addColumn('invoices', 'accounting_posted INTEGER DEFAULT 0');
    addColumn('sales', 'tax_code TEXT');
    addColumn('sales', 'tax_mode TEXT');
    addColumn('sales', 'tax_amount REAL DEFAULT 0.0');
    addColumn('purchases', 'tax_code TEXT');
    addColumn('purchases', 'tax_mode TEXT');
    addColumn('expenses', 'tax_code TEXT');
    addColumn('expenses', 'tax_mode TEXT');
    addColumn('expenses', 'tax_amount REAL DEFAULT 0.0');
    addColumn('quotes', 'tax_code TEXT');
    addColumn('quotes', 'tax_mode TEXT');
    addColumn('invoices', 'tax_code TEXT');
    addColumn('invoices', 'tax_mode TEXT');
    addColumn('invoices', 'tax_amount REAL DEFAULT 0.0');
    addColumn('categories', 'status TEXT DEFAULT "active"');
    addColumn('units', 'status TEXT DEFAULT "active"');
    addColumn('brands', 'status TEXT DEFAULT "active"');
    if (!hasColumn('products', 'sku')) {
        addColumn('products', 'sku TEXT');
    }
    db.exec(`
    UPDATE products
    SET sku = COALESCE(NULLIF(TRIM(sku), ''), id)
    WHERE sku IS NULL OR TRIM(sku) = '';
  `);
    createIndex('idx_products_sku', 'products', 'sku');
    createIndex('idx_products_barcode', 'products', 'barcode');
    createIndex('idx_suppliers_name', 'suppliers', 'name');
    createIndex('idx_purchases_supplier_id', 'purchases', 'supplier_id');
    createIndex('idx_sales_customer_id', 'sales', 'customer_id');
    createIndex('idx_journal_entries_entry_date', 'journal_entries', 'entry_date');
    createIndex('idx_chart_of_accounts_code', 'chart_of_accounts', 'account_code');
    createIndex('idx_stock_movements_product_id', 'stock_movements', 'product_id');
    createIndex('idx_quotes_status', 'quotes', 'status');
    createIndex('idx_invoices_customer', 'invoices', 'customer_name');
    createIndex('idx_invoices_status', 'invoices', 'status');
    createIndex('idx_invoice_payments_invoice', 'invoice_payments', 'invoice_id');
    createIndex('idx_tax_rates_code', 'tax_rates', 'code');
    createIndex('idx_tax_rates_status', 'tax_rates', 'status');
    createIndex('idx_tax_group_items_group', 'tax_group_items', 'group_id');
    createIndex('idx_money_transactions_account_date', 'money_transactions', 'account_id, transaction_date');
    createIndex('idx_money_transactions_cleared', 'money_transactions', 'is_cleared');
    createIndex('idx_bank_reconciliations_account', 'bank_reconciliations', 'account_id');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique ON products(sku)');
}
function seedDefaults() {
    const db = (0, connection_1.getDatabase)();
    try {
        db.exec(`
      INSERT OR IGNORE INTO tenants (id, name) VALUES ('T001', 'Default Tenant');

      INSERT OR IGNORE INTO units (id, tenant_id, name, abbreviation, status) VALUES
      ('U001', 'T001', 'Pieces', 'pcs', 'active'),
      ('U002', 'T001', 'Kilogram', 'kg', 'active'),
      ('U003', 'T001', 'Gram', 'g', 'active'),
      ('U004', 'T001', 'Liter', 'L', 'active'),
      ('U005', 'T001', 'Milliliter', 'ml', 'active'),
      ('U006', 'T001', 'Packet', 'pkt', 'active'),
      ('U007', 'T001', 'Box', 'box', 'active');

      INSERT OR IGNORE INTO categories (id, name, description, status) VALUES
      ('CAT01', 'Grocery', 'General grocery items', 'active'),
      ('CAT02', 'Beverages', 'Cold drinks and juices', 'active'),
      ('CAT03', 'Snacks', 'Chips, biscuits, and nimko', 'active');

      INSERT OR IGNORE INTO chart_of_accounts (id, account_code, account_name, account_type, is_system_account, current_balance) VALUES
      ('ACC-1000', '1000', 'Cash', 'Asset', 1, 0.0),
      ('ACC-1010', '1010', 'Bank', 'Asset', 1, 0.0),
      ('ACC-1100', '1100', 'Accounts Receivable', 'Asset', 1, 0.0),
      ('ACC-1200', '1200', 'Inventory Asset', 'Asset', 1, 0.0),
      ('ACC-2000', '2000', 'Accounts Payable', 'Liability', 1, 0.0),
      ('ACC-3000', '3000', 'Owner Equity', 'Equity', 1, 0.0),
      ('ACC-4000', '4000', 'Sales Income', 'Income', 1, 0.0),
      ('ACC-5000', '5000', 'Cost of Goods Sold', 'Expense', 1, 0.0),
      ('ACC-6000', '6000', 'Operating Expenses', 'Expense', 1, 0.0),
      ('ACC-6100', '6100', 'Utilities Expense', 'Expense', 1, 0.0),
      ('ACC-6200', '6200', 'Rent Expense', 'Expense', 1, 0.0),
      ('ACC-1300', '1300', 'Input Tax Receivable', 'Asset', 1, 0.0),
      ('ACC-2100', '2100', 'Output Tax Payable', 'Liability', 1, 0.0),
      ('ACC-6300', '6300', 'Bank Charges Expense', 'Expense', 1, 0.0);

      INSERT OR IGNORE INTO tax_settings (key, value) VALUES
      ('default_sales_tax_code', 'GST-17'),
      ('default_purchase_tax_code', 'GST-17'),
      ('default_expense_tax_code', 'GST-17'),
      ('rounding_rule', '2dp');

      INSERT OR IGNORE INTO tax_rates (
        id, code, name, rate, type, mode, purchase_account_id, sales_account_id, status
      ) VALUES
      ('TAX-001', 'GST-17', 'GST Standard 17%', 17.0, 'GST', 'exclusive', 'ACC-1300', 'ACC-2100', 'active');

      INSERT OR IGNORE INTO cash_bank_accounts (
        id, code, name, account_type, linked_gl_account_id, opening_balance, current_balance, status
      ) VALUES
      ('CBA-001', 'CASH-MAIN', 'Main Cash Drawer', 'Cash', 'ACC-1000', 0.0, 0.0, 'active'),
      ('CBA-002', 'BANK-MAIN', 'Primary Bank Account', 'Bank', 'ACC-1010', 0.0, 0.0, 'active');

      INSERT OR IGNORE INTO payment_method_accounts (payment_method, account_id) VALUES
      ('Cash', 'CBA-001'),
      ('Bank', 'CBA-002'),
      ('EasyPaisa', NULL),
      ('JazzCash', NULL),
      ('Card', 'CBA-002'),
      ('Cheque', 'CBA-002');
    `);
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[Database Migrations] Error inserting default data:', message);
    }
}
function runMigrations() {
    const db = (0, connection_1.getDatabase)();
    console.log('[Database Migrations] Executing enterprise schema updates...');
    runSchemaBootstrap();
    runBackfillAndAlters();
    seedDefaults();
    db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(MIGRATION_VERSION);
    console.log('[Database Migrations] Migrations executed successfully.');
}
