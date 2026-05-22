import { getDatabase } from './connection';

const MIGRATION_VERSION = 1;

function addColumn(table: string, columnDef: string) {
  const db = getDatabase();
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`[Database Migrations] Added column '${columnDef}' to '${table}'`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes('duplicate column name')) {
      console.error(`[Database Migrations] Error adding column '${columnDef}' to '${table}':`, message);
    }
  }
}

function createIndex(name: string, table: string, columns: string) {
  const db = getDatabase();
  db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${columns})`);
}

function hasColumn(table: string, column: string): boolean {
  const db = getDatabase();
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function runSchemaBootstrap() {
  const db = getDatabase();

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
      branch_code TEXT UNIQUE,
      name TEXT NOT NULL,
      branch_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      manager_name TEXT,
      tax_number TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      class_code TEXT NOT NULL UNIQUE,
      class_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_branches (
      user_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, branch_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS branch_settings (
      branch_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (branch_id, key),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
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
      full_name TEXT,
      email TEXT,
      password_hash TEXT,
      role_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_login TEXT,
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
      whatsapp TEXT,
      address TEXT,
      opening_balance REAL NOT NULL DEFAULT 0.0,
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
      payment_method TEXT,
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

    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      register_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cashier_shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      register_id TEXT NOT NULL,
      opening_cash REAL NOT NULL DEFAULT 0.0,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      expected_cash REAL NOT NULL DEFAULT 0.0,
      counted_cash REAL,
      difference REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS shift_cash_movements (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES cashier_shifts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      reference_no TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_name) REFERENCES customers(name) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS customer_adjustments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      adjustment_date TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_name) REFERENCES customers(name) ON DELETE RESTRICT
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

    CREATE TABLE IF NOT EXISTS branch_inventory (
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_on_hand REAL NOT NULL DEFAULT 0.0,
      quantity_reserved REAL NOT NULL DEFAULT 0.0,
      reorder_level REAL NOT NULL DEFAULT 0.0,
      average_cost REAL NOT NULL DEFAULT 0.0,
      valuation_method TEXT NOT NULL DEFAULT 'average',
      batch_lot_hint TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (branch_id, product_id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      adjustment_date TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'posted',
      accounting_status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
      id TEXT PRIMARY KEY,
      adjustment_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_change REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0.0,
      value_change REAL NOT NULL DEFAULT 0.0,
      previous_quantity REAL NOT NULL DEFAULT 0.0,
      new_quantity REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id TEXT PRIMARY KEY,
      transfer_no TEXT UNIQUE NOT NULL,
      source_branch_id TEXT NOT NULL,
      destination_branch_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      request_date TEXT NOT NULL,
      approval_date TEXT,
      shipment_date TEXT,
      completion_date TEXT,
      notes TEXT,
      created_by TEXT,
      approved_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (destination_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
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
      branch_id TEXT DEFAULT 'B001',
      class_id TEXT,
      total_debit REAL NOT NULL,
      total_credit REAL NOT NULL,
      status TEXT DEFAULT 'posted',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'monthly',
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      branch_id TEXT,
      class_id TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS budget_lines (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT,
      amount REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_run_date TEXT NOT NULL,
      auto_create INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      branch_id TEXT,
      class_id TEXT,
      payload_json TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_runs (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      run_date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_transaction_type TEXT,
      created_transaction_id TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimal_precision INTEGER NOT NULL DEFAULT 2,
      is_base INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      effective_date TEXT NOT NULL,
      manual_override INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_currency) REFERENCES currencies(code) ON DELETE CASCADE,
      FOREIGN KEY (to_currency) REFERENCES currencies(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT,
      employee_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      designation TEXT,
      hourly_rate REAL NOT NULL DEFAULT 0.0,
      monthly_salary REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      branch_id TEXT,
      work_date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      break_minutes INTEGER NOT NULL DEFAULT 0,
      total_hours REAL NOT NULL DEFAULT 0.0,
      entry_type TEXT NOT NULL DEFAULT 'clock',
      approval_status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_seen_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backup_history (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      backup_type TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'success',
      file_size INTEGER NOT NULL DEFAULT 0,
      integrity_status TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backup_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'T001',
      branch_id TEXT NOT NULL DEFAULT 'B001',
      entity_type TEXT NOT NULL,
      file_name TEXT,
      status TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      processed_rows INTEGER DEFAULT 0,
      failed_rows INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'T001',
      branch_id TEXT NOT NULL DEFAULT 'B001',
      entity_type TEXT NOT NULL,
      format TEXT NOT NULL,
      file_path TEXT,
      status TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS import_job_errors (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      row_number INTEGER,
      error_message TEXT NOT NULL,
      row_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      customer_id TEXT,
      branch_id TEXT NOT NULL,
      shift_id TEXT,
      refund_method TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      return_reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(invoiceNo) ON DELETE RESTRICT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      sales_return_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total REAL NOT NULL,
      FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      return_reason TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id TEXT PRIMARY KEY,
      purchase_return_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total REAL NOT NULL,
      FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      discount_type TEXT NOT NULL,
      value REAL NOT NULL,
      scope TEXT NOT NULL,
      min_quantity INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      target_id TEXT,
      discount_type TEXT NOT NULL,
      value REAL NOT NULL,
      min_qty INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promotion_runs (
      id TEXT PRIMARY KEY,
      discount_id TEXT,
      price_rule_id TEXT,
      transaction_type TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      applied_amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE SET NULL,
      FOREIGN KEY (price_rule_id) REFERENCES price_rules(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      branch_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      read_at TEXT,
      rule_key TEXT,
      dedupe_key TEXT UNIQUE,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_rules (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_dismissals (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      user_id TEXT,
      reason TEXT,
      dismissed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function runBackfillAndAlters() {
  const db = getDatabase();

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
  addColumn('sale_items', 'discount REAL DEFAULT 0.0');
  addColumn('sale_items', 'discount_type TEXT DEFAULT "fixed"');
  addColumn('sale_items', 'discount_value REAL DEFAULT 0.0');
  addColumn('sale_items', 'discount_amount REAL DEFAULT 0.0');
  addColumn('sale_items', 'line_total REAL DEFAULT 0.0');

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
  addColumn('sales', 'customer_type TEXT DEFAULT "WALK_IN"');
  addColumn('sales', 'cashier_id TEXT');
  addColumn('sales', 'cashier_name TEXT');
  addColumn('sales', 'branch_name TEXT');
  addColumn('sales', 'shift_id TEXT');
  addColumn('sales', 'register_id TEXT');
  addColumn('sales', 'sale_time TEXT');
  addColumn('sales', 'payment_method TEXT');
  addColumn('sales', 'subtotal REAL DEFAULT 0.0');
  addColumn('sales', 'discount_type TEXT DEFAULT "fixed"');
  addColumn('sales', 'discount_value REAL DEFAULT 0.0');
  addColumn('sales', 'discount_amount REAL DEFAULT 0.0');
  addColumn('sales', 'total_amount REAL DEFAULT 0.0');
  addColumn('invoices', 'customer_id TEXT');
  addColumn('invoices', 'customer_type TEXT DEFAULT "WALK_IN"');
  addColumn('invoices', 'cashier_id TEXT');
  addColumn('invoices', 'cashier_name TEXT');
  addColumn('invoices', 'branch_name TEXT');
  addColumn('invoices', 'shift_id TEXT');
  addColumn('invoices', 'register_id TEXT');
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
  addColumn('users', 'full_name TEXT');
  addColumn('users', 'email TEXT');
  addColumn('users', 'password_hash TEXT');
  addColumn('users', 'status TEXT DEFAULT "active"');
  addColumn('users', 'last_login TEXT');
  addColumn('customers', 'credit_limit REAL DEFAULT 0.0');
  addColumn('customers', 'due_days INTEGER DEFAULT 0');
  addColumn('customers', 'status TEXT DEFAULT "active"');
  addColumn('customers', 'whatsapp TEXT');
  addColumn('customers', 'address TEXT');
  addColumn('customers', 'opening_balance REAL DEFAULT 0.0');

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_cashier_shifts_open ON cashier_shifts(user_id, branch_id, register_id, status)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_shift_cash_movements_shift ON shift_cash_movements(shift_id, created_at)`).run();

  const hasRegisters = db.prepare(`SELECT COUNT(*) as count FROM cash_registers`).get() as { count: number };
  if (hasRegisters.count === 0) {
    const branches = db.prepare(`SELECT id, branch_name FROM branches ORDER BY id`).all() as Array<{ id: string; branch_name: string }>;
    for (const branch of branches) {
      db.prepare(`
        INSERT INTO cash_registers (id, branch_id, register_name, status)
        VALUES (?, ?, ?, 'active')
      `).run(`REG-${branch.id}`, branch.id, `${branch.branch_name || branch.id} Register`);
    }
  }
  addColumn('branches', 'branch_code TEXT');
  addColumn('branches', 'branch_name TEXT');
  addColumn('branches', 'email TEXT');
  addColumn('branches', 'manager_name TEXT');
  addColumn('branches', 'tax_number TEXT');
  addColumn('branches', 'status TEXT DEFAULT "active"');
  addColumn('branches', 'is_default INTEGER DEFAULT 0');
  addColumn('sales', 'class_id TEXT');
  addColumn('purchases', 'class_id TEXT');
  addColumn('expenses', 'class_id TEXT');
  addColumn('invoices', 'class_id TEXT');
  addColumn('journal_entries', 'branch_id TEXT DEFAULT "B001"');
  addColumn('journal_entries', 'class_id TEXT');
  addColumn('money_transactions', 'class_id TEXT');
  addColumn('stock_movements', 'class_id TEXT');
  addColumn('invoices', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('invoices', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('invoices', 'original_subtotal REAL DEFAULT 0.0');
  addColumn('invoices', 'original_tax_total REAL DEFAULT 0.0');
  addColumn('invoices', 'original_grand_total REAL DEFAULT 0.0');
  addColumn('invoices', 'base_grand_total REAL DEFAULT 0.0');
  addColumn('invoice_payments', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('invoice_payments', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('invoice_payments', 'original_amount REAL DEFAULT 0.0');
  addColumn('invoice_payments', 'base_amount REAL DEFAULT 0.0');
  addColumn('purchases', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('purchases', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('purchases', 'original_grand_total REAL DEFAULT 0.0');
  addColumn('purchases', 'base_grand_total REAL DEFAULT 0.0');
  addColumn('expenses', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('expenses', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('expenses', 'original_amount REAL DEFAULT 0.0');
  addColumn('expenses', 'base_amount REAL DEFAULT 0.0');
  addColumn('cash_bank_accounts', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('money_transactions', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('money_transactions', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('money_transactions', 'original_amount REAL DEFAULT 0.0');
  addColumn('money_transactions', 'base_amount REAL DEFAULT 0.0');
  addColumn('journal_entries', 'currency_code TEXT DEFAULT "PKR"');
  addColumn('journal_entries', 'exchange_rate REAL DEFAULT 1.0');
  addColumn('journal_entries', 'base_total_debit REAL DEFAULT 0.0');
  addColumn('journal_entries', 'base_total_credit REAL DEFAULT 0.0');

  if (!hasColumn('products', 'sku')) {
    addColumn('products', 'sku TEXT');
  }

  db.exec(`
    UPDATE products
    SET sku = COALESCE(NULLIF(TRIM(sku), ''), id)
    WHERE sku IS NULL OR TRIM(sku) = '';
  `);

  db.exec(`
    UPDATE sales
    SET customer_type = CASE
      WHEN customer_id IS NOT NULL AND TRIM(customer_id) != '' THEN 'REGISTERED'
      ELSE 'WALK_IN'
    END
    WHERE customer_type IS NULL OR TRIM(customer_type) = '';

    UPDATE invoices
    SET customer_type = CASE
      WHEN customer_id IS NOT NULL AND TRIM(customer_id) != '' THEN 'REGISTERED'
      ELSE 'WALK_IN'
    END
    WHERE customer_type IS NULL OR TRIM(customer_type) = '';

    UPDATE sales
    SET branch_name = (
      SELECT COALESCE(b.branch_name, b.name)
      FROM branches b
      WHERE b.id = sales.branch_id
    )
    WHERE branch_name IS NULL OR TRIM(branch_name) = '';

    UPDATE invoices
    SET branch_name = (
      SELECT COALESCE(b.branch_name, b.name)
      FROM branches b
      WHERE b.id = invoices.branch_id
    )
    WHERE branch_name IS NULL OR TRIM(branch_name) = '';

    UPDATE sales
    SET cashier_name = COALESCE(cashier_name, 'System Cashier')
    WHERE cashier_name IS NULL OR TRIM(cashier_name) = '';

    UPDATE invoices
    SET cashier_name = COALESCE(cashier_name, 'System Cashier')
    WHERE cashier_name IS NULL OR TRIM(cashier_name) = '';
  `);

  createIndex('idx_products_sku', 'products', 'sku');
  createIndex('idx_products_barcode', 'products', 'barcode');
  createIndex('idx_suppliers_name', 'suppliers', 'name');
  createIndex('idx_purchases_supplier_id', 'purchases', 'supplier_id');
  createIndex('idx_sales_customer_id', 'sales', 'customer_id');
  createIndex('idx_journal_entries_entry_date', 'journal_entries', 'entry_date');
  createIndex('idx_chart_of_accounts_code', 'chart_of_accounts', 'account_code');
  createIndex('idx_stock_movements_product_id', 'stock_movements', 'product_id');
  createIndex('idx_branch_inventory_product', 'branch_inventory', 'product_id');
  createIndex('idx_branch_inventory_low_stock', 'branch_inventory', 'branch_id, reorder_level');
  createIndex('idx_inventory_adjustments_branch_date', 'inventory_adjustments', 'branch_id, adjustment_date');
  createIndex('idx_inventory_adjustment_items_product', 'inventory_adjustment_items', 'product_id');
  createIndex('idx_stock_transfers_status', 'stock_transfers', 'status');
  createIndex('idx_stock_transfers_branches', 'stock_transfers', 'source_branch_id, destination_branch_id');
  createIndex('idx_stock_transfer_items_transfer', 'stock_transfer_items', 'transfer_id');
  createIndex('idx_quotes_status', 'quotes', 'status');
  createIndex('idx_invoices_customer', 'invoices', 'customer_name');
  createIndex('idx_invoices_status', 'invoices', 'status');
  createIndex('idx_invoice_payments_invoice', 'invoice_payments', 'invoice_id');
  createIndex('idx_customer_payments_customer_date', 'customer_payments', 'customer_name, payment_date');
  createIndex('idx_customer_adjustments_customer_date', 'customer_adjustments', 'customer_name, adjustment_date');
  createIndex('idx_tax_rates_code', 'tax_rates', 'code');
  createIndex('idx_tax_rates_status', 'tax_rates', 'status');
  createIndex('idx_tax_group_items_group', 'tax_group_items', 'group_id');
  createIndex('idx_money_transactions_account_date', 'money_transactions', 'account_id, transaction_date');
  createIndex('idx_money_transactions_cleared', 'money_transactions', 'is_cleared');
  createIndex('idx_bank_reconciliations_account', 'bank_reconciliations', 'account_id');
  createIndex('idx_users_role', 'users', 'role_id');
  createIndex('idx_user_sessions_token', 'user_sessions', 'token_hash');
  createIndex('idx_user_sessions_user', 'user_sessions', 'user_id');
  createIndex('idx_backup_history_created', 'backup_history', 'created_at');
  createIndex('idx_budgets_period', 'budgets', 'date_from, date_to');
  createIndex('idx_budgets_branch_class', 'budgets', 'branch_id, class_id');
  createIndex('idx_budget_lines_budget', 'budget_lines', 'budget_id');
  createIndex('idx_recurring_templates_due', 'recurring_templates', 'status, auto_create, next_run_date');
  createIndex('idx_recurring_runs_template_date', 'recurring_runs', 'template_id, run_date');
  createIndex('idx_currencies_status', 'currencies', 'status');
  createIndex('idx_exchange_rates_pair_date', 'exchange_rates', 'from_currency, to_currency, effective_date');
  createIndex('idx_invoices_currency', 'invoices', 'currency_code');
  createIndex('idx_employees_code', 'employees', 'employee_code');
  createIndex('idx_employees_branch', 'employees', 'branch_id');
  createIndex('idx_timesheets_employee_date', 'timesheets', 'employee_id, work_date');
  createIndex('idx_timesheets_branch_date', 'timesheets', 'branch_id, work_date');
  createIndex('idx_timesheets_status', 'timesheets', 'approval_status');
  createIndex('idx_user_branches_user', 'user_branches', 'user_id');
  createIndex('idx_user_branches_branch', 'user_branches', 'branch_id');
  createIndex('idx_journal_entries_branch', 'journal_entries', 'branch_id');
  createIndex('idx_sales_branch', 'sales', 'branch_id');
  createIndex('idx_purchases_branch', 'purchases', 'branch_id');
  createIndex('idx_expenses_branch', 'expenses', 'branch_id');
  createIndex('idx_invoices_branch', 'invoices', 'branch_id');
  createIndex('idx_sales_recent_filters', 'sales', 'date, cashier_id, branch_id');
  createIndex('idx_invoices_recent_filters', 'invoices', 'invoice_date, cashier_id, branch_id');

  createIndex('idx_import_jobs_created', 'import_jobs', 'created_at');
  createIndex('idx_export_jobs_created', 'import_jobs', 'created_at');
  createIndex('idx_import_job_errors_job', 'import_job_errors', 'job_id');
  createIndex('idx_discounts_status', 'discounts', 'status');
  createIndex('idx_price_rules_status', 'price_rules', 'status');
  createIndex('idx_promotion_runs_transaction', 'promotion_runs', 'transaction_id');
  createIndex('idx_notifications_category_status', 'notifications', 'category, status');
  createIndex('idx_notifications_due_date', 'notifications', 'due_date');
  createIndex('idx_notifications_created_at', 'notifications', 'created_at');
  createIndex('idx_notification_dismissals_notification', 'notification_dismissals', 'notification_id');

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique ON products(sku)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
}


function seedDefaults() {
  const db = getDatabase();

  try {
    db.exec(`
      INSERT OR IGNORE INTO tenants (id, name) VALUES ('T001', 'Default Tenant');

      INSERT OR IGNORE INTO branches (id, tenant_id, branch_code, name, branch_name, phone, address, status, is_default)
      VALUES ('B001', 'T001', 'MAIN', 'Main Branch', 'Main Branch', '', '', 'active', 1);

      UPDATE branches
      SET branch_code=COALESCE(branch_code, id),
          branch_name=COALESCE(branch_name, name),
          status=COALESCE(status, 'active'),
          is_default=CASE WHEN id='B001' THEN 1 ELSE COALESCE(is_default, 0) END;

      INSERT OR IGNORE INTO classes (id, class_code, class_name, description, status) VALUES
      ('CLS-GEN', 'GENERAL', 'General Operations', 'Default class for unassigned transactions', 'active');

      INSERT OR IGNORE INTO roles (id, name, description) VALUES
      ('R001', 'Owner/Admin', 'Full system access'),
      ('R002', 'Manager', 'Operational access for inventory, purchasing, suppliers, and POS'),
      ('R003', 'Cashier', 'POS checkout access'),
      ('R004', 'Accountant', 'Accounting, tax, banking, and reporting access');

      INSERT OR IGNORE INTO permissions (id, name, description) VALUES
      ('PERM-POS-SALE-CREATE', 'pos.sale.create', 'Create POS sales'),
      ('PERM-INVENTORY-PRODUCT-EDIT', 'inventory.product.edit', 'Create and edit inventory products'),
      ('PERM-PURCHASE-CREATE', 'purchase.create', 'Create purchase documents'),
      ('PERM-SUPPLIER-EDIT', 'supplier.edit', 'Create and edit suppliers'),
      ('PERM-REPORTS-VIEW', 'reports.view', 'View financial and operating reports'),
      ('PERM-ACCOUNTING-JOURNAL-CREATE', 'accounting.journal.create', 'Create accounting journals'),
      ('PERM-SETTINGS-EDIT', 'settings.edit', 'Edit store settings'),
      ('PERM-USERS-MANAGE', 'users.manage', 'Manage users, roles, and permissions'),
      ('PERM-BANKING-MANAGE', 'banking.manage', 'Manage bank and cash transactions'),
      ('PERM-TAXES-MANAGE', 'taxes.manage', 'Manage tax setup and reports'),
      ('PERM-BACKUP-MANAGE', 'backup.manage', 'Create backups, restore data, and manage retention');
      INSERT OR IGNORE INTO permissions (id, name, description) VALUES
      ('PERM-BRANCH-MANAGE', 'branch.manage', 'Manage branches, classes, and branch access'),
      ('PERM-BUDGET-MANAGE', 'budget.manage', 'Create and manage budgets'),
      ('PERM-AUTOMATION-MANAGE', 'automation.manage', 'Manage recurring transactions and automation rules'),
      ('PERM-EMPLOYEES-MANAGE', 'employees.manage', 'Create and manage employee profiles'),
      ('PERM-TIME-TRACK', 'time.track', 'Clock in, clock out, and enter employee time'),
      ('PERM-TIME-APPROVE', 'time.approve', 'Approve employee timesheets'),
      ('PERM-CURRENCY-MANAGE', 'currency.manage', 'Manage currencies and exchange rates'),
      ('PERM-INVENTORY-TRANSFER', 'inventory.transfer', 'Create and manage stock transfers'),
      ('PERM-INVENTORY-ADJUST', 'inventory.adjust', 'Create inventory adjustments'),
      ('PERM-INVENTORY-VIEW-BRANCH', 'inventory.view.branch', 'View branch-level stock reports');

      INSERT OR IGNORE INTO permissions (id, name, description) VALUES
      ('PERM-DATA-IMPORT', 'data.import', 'Import products, customers, suppliers, and opening stock'),
      ('PERM-DATA-EXPORT', 'data.export', 'Export products, customers, suppliers, sales, purchases, inventory valuation, and reports'),
      ('PERM-RETURNS-CREATE', 'returns.create', 'Create sales and purchase returns'),
      ('PERM-RETURNS-VIEW', 'returns.view', 'View sales and purchase returns history'),
      ('PERM-DISCOUNT-MANAGE', 'discount.manage', 'Manage discounts, price rules, and promotions'),
      ('PERM-DISCOUNT-APPLY', 'discount.apply', 'Apply discounts to sales and invoices'),
      ('PERM-NOTIFICATIONS-VIEW', 'notifications.view', 'View operational notifications and alerts'),
      ('PERM-NOTIFICATIONS-MANAGE', 'notifications.manage', 'Manage notification rules, scans, and dismissals'),
      ('PERM-KHATA-VIEW', 'khata.view', 'View customer khata ledger and statements'),
      ('PERM-KHATA-PAYMENT', 'khata.payment', 'Record khata payments and issue receipts'),
      ('PERM-KHATA-ADJUST', 'khata.adjust', 'Post khata adjustments'),
      ('PERM-SALES-VIEW-OWN', 'sales.view.own', 'View own POS receipts'),
      ('PERM-SALES-VIEW-BRANCH', 'sales.view.branch', 'View branch sales receipts/invoices'),
      ('PERM-SALES-VIEW-ALL', 'sales.view.all', 'View all branch sales receipts/invoices'),
      ('PERM-SALES-REPRINT', 'sales.receipt.reprint', 'Reprint sales receipts'),
      ('PERM-SALES-VOID', 'sales.void', 'Void sales receipts'),
      ('PERM-SALES-DELETE', 'sales.delete', 'Hard delete sales when policy allows'),
      ('PERM-SALES-EDIT-DRAFT', 'sales.edit_draft', 'Edit draft sales invoices'),
      ('PERM-SALES-RETURN', 'sales.return', 'Create sales returns');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
      SELECT 'R001', id FROM permissions;

      INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
      ('R002', 'PERM-POS-SALE-CREATE'),
      ('R002', 'PERM-INVENTORY-PRODUCT-EDIT'),
      ('R002', 'PERM-PURCHASE-CREATE'),
      ('R002', 'PERM-SUPPLIER-EDIT'),
      ('R002', 'PERM-REPORTS-VIEW'),
      ('R002', 'PERM-EMPLOYEES-MANAGE'),
      ('R002', 'PERM-TIME-TRACK'),
      ('R002', 'PERM-TIME-APPROVE'),
      ('R002', 'PERM-INVENTORY-TRANSFER'),
      ('R002', 'PERM-INVENTORY-ADJUST'),
      ('R002', 'PERM-INVENTORY-VIEW-BRANCH'),
      ('R002', 'PERM-DATA-IMPORT'),
      ('R002', 'PERM-DATA-EXPORT'),
      ('R002', 'PERM-RETURNS-CREATE'),
      ('R002', 'PERM-RETURNS-VIEW'),
      ('R002', 'PERM-DISCOUNT-MANAGE'),
      ('R002', 'PERM-DISCOUNT-APPLY'),
      ('R002', 'PERM-NOTIFICATIONS-VIEW'),
      ('R002', 'PERM-NOTIFICATIONS-MANAGE'),
      ('R002', 'PERM-KHATA-VIEW'),
      ('R002', 'PERM-KHATA-PAYMENT'),
      ('R002', 'PERM-SALES-VIEW-BRANCH'),
      ('R002', 'PERM-SALES-REPRINT'),
      ('R002', 'PERM-SALES-VOID'),
      ('R002', 'PERM-SALES-RETURN'),
      ('R003', 'PERM-POS-SALE-CREATE'),
      ('R003', 'PERM-TIME-TRACK'),
      ('R003', 'PERM-DISCOUNT-APPLY'),
      ('R003', 'PERM-NOTIFICATIONS-VIEW'),
      ('R003', 'PERM-KHATA-VIEW'),
      ('R003', 'PERM-SALES-VIEW-OWN'),
      ('R003', 'PERM-SALES-REPRINT'),
      ('R003', 'PERM-SALES-RETURN'),
      ('R004', 'PERM-REPORTS-VIEW'),
      ('R004', 'PERM-ACCOUNTING-JOURNAL-CREATE'),
      ('R004', 'PERM-BUDGET-MANAGE'),
      ('R004', 'PERM-AUTOMATION-MANAGE'),
      ('R004', 'PERM-BANKING-MANAGE'),
      ('R004', 'PERM-TAXES-MANAGE'),
      ('R004', 'PERM-DATA-EXPORT'),
      ('R004', 'PERM-RETURNS-VIEW'),
      ('R004', 'PERM-NOTIFICATIONS-VIEW'),
      ('R004', 'PERM-KHATA-VIEW'),
      ('R004', 'PERM-KHATA-PAYMENT'),
      ('R004', 'PERM-KHATA-ADJUST'),
      ('R004', 'PERM-SALES-VIEW-ALL'),
      ('R004', 'PERM-SALES-REPRINT'),
      ('R004', 'PERM-SALES-VOID');

      INSERT OR IGNORE INTO backup_settings (key, value) VALUES
      ('automatic_backup_enabled', 'false'),
      ('backup_frequency', 'daily'),
      ('retention_count', '10'),
      ('backup_before_migrations', 'true'),
      ('last_backup_path', ''),
      ('last_backup_at', '');

      INSERT OR IGNORE INTO automation_rules (key, value) VALUES
      ('recurring_auto_run_enabled', 'false'),
      ('last_recurring_run_at', '');

      INSERT OR IGNORE INTO notification_rules (key, value) VALUES
      ('low_stock_enabled', 'true'),
      ('near_expiry_days', '30'),
      ('customer_due_grace_days', '0'),
      ('supplier_due_grace_days', '0'),
      ('scan_low_stock_enabled', 'true'),
      ('scan_expiry_enabled', 'true'),
      ('scan_customer_due_enabled', 'true'),
      ('scan_supplier_due_enabled', 'true'),
      ('scan_system_enabled', 'true');

      INSERT OR IGNORE INTO currencies (code, name, symbol, decimal_precision, is_base, status) VALUES
      ('PKR', 'Pakistani Rupee', 'Rs', 2, 1, 'active'),
      ('USD', 'US Dollar', '$', 2, 0, 'active');

      INSERT OR IGNORE INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, manual_override, notes) VALUES
      ('FX-PKR-PKR-BASE', 'PKR', 'PKR', 1, '2000-01-01', 0, 'Base currency parity');

      INSERT OR IGNORE INTO users (
        id, tenant_id, branch_id, username, full_name, email, password_hash, role_id, status
      ) VALUES (
        'U001', 'T001', 'B001', 'admin', 'Kashif Ali', 'admin@example.local',
        'pbkdf2$120000$67f0fa400a81e4e3f3562f6bfe395458$4005b21c659ff66a38ad47d313474e11f4da5cd2d43fdaaaf9abe548e29a1277',
        'R001', 'active'
      );

      UPDATE roles SET name='Owner/Admin', description='Full system access' WHERE id='R001';
      UPDATE roles SET name='Manager', description='Operational access for inventory, purchasing, suppliers, and POS' WHERE id='R002';
      UPDATE roles SET name='Cashier', description='POS checkout access' WHERE id='R003';
      UPDATE users
      SET username='admin',
          full_name=COALESCE(full_name, 'Kashif Ali'),
          email=COALESCE(email, 'admin@example.local'),
          password_hash=COALESCE(password_hash, 'pbkdf2$120000$67f0fa400a81e4e3f3562f6bfe395458$4005b21c659ff66a38ad47d313474e11f4da5cd2d43fdaaaf9abe548e29a1277'),
          role_id='R001',
          status=COALESCE(status, 'active')
      WHERE id='U001';

      INSERT OR IGNORE INTO user_branches (user_id, branch_id, is_default)
      VALUES ('U001', 'B001', 1);

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[Database Migrations] Error inserting default data:', message);
  }
}

export function runMigrations() {
  const db = getDatabase();
  console.log('[Database Migrations] Executing enterprise schema updates...');

  runSchemaBootstrap();
  runBackfillAndAlters();
  seedDefaults();

  db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(MIGRATION_VERSION);
  console.log('[Database Migrations] Migrations executed successfully.');
}
