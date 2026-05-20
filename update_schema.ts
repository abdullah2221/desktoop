import { getDatabase } from './src/main/database/connection';

function runPhase1Migration() {
  const db = getDatabase();
  console.log('[Phase 1] Updating schema...');

  const queries = [
    // Units
    `CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );`,

    // Brands
    `CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );`,

    // Stock Movements
    `CREATE TABLE IF NOT EXISTS stock_movements (
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
    );`,

    // Supplier Payments
    `CREATE TABLE IF NOT EXISTS supplier_payments (
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
    );`,

    // Supplier Ledger
    `CREATE TABLE IF NOT EXISTS supplier_ledger (
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
    );`
  ];

  for (const q of queries) {
    db.exec(q);
  }

  const addColumn = (table: string, column: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`);
      console.log(`Added column ${column} to ${table}`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`Error adding column ${column} to ${table}:`, e.message);
      }
    }
  };

  // Alter suppliers
  addColumn('suppliers', 'contact_person TEXT');
  addColumn('suppliers', 'whatsapp TEXT');
  addColumn('suppliers', 'city TEXT');
  addColumn('suppliers', 'ntn TEXT');
  addColumn('suppliers', 'opening_balance REAL DEFAULT 0.0');
  addColumn('suppliers', 'current_balance REAL DEFAULT 0.0');
  addColumn('suppliers', 'status TEXT DEFAULT "active"');
  addColumn('suppliers', 'notes TEXT');

  // Alter purchases
  addColumn('purchases', 'payment_status TEXT DEFAULT "Paid"');
  addColumn('purchases', 'discount REAL DEFAULT 0.0');
  addColumn('purchases', 'tax REAL DEFAULT 0.0');
  addColumn('purchases', 'grand_total REAL DEFAULT 0.0');
  addColumn('purchases', 'amount_paid REAL DEFAULT 0.0');
  addColumn('purchases', 'remaining_payable REAL DEFAULT 0.0');
  addColumn('purchases', 'notes TEXT');

  // Alter purchase_items
  addColumn('purchase_items', 'line_total REAL DEFAULT 0.0');
  addColumn('purchase_items', 'unit_cost REAL DEFAULT 0.0');

  // Alter products (For phase 4 preparation, but good to add now)
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

  console.log('Phase 1 Schema migration done.');
}
runPhase1Migration();
