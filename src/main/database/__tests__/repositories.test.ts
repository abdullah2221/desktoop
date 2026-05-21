import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabase } from '../connection';
import { runMigrations } from '../migrations';
import { runSeeds } from '../seed';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { SaleRepository } from '../repositories/SaleRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { BackupService } from '../backup';
import { DatabaseInspector } from '../inspector';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { InvoiceRepository } from '../repositories/InvoiceRepository';
import { InvoicePaymentRepository } from '../repositories/InvoicePaymentRepository';
import { TaxCalculationService } from '../repositories/TaxCalculationService';
import { TaxRepository } from '../repositories/TaxRepository';
import { BankAccountRepository } from '../repositories/BankAccountRepository';
import { MoneyTransactionRepository } from '../repositories/MoneyTransactionRepository';
import { BankReconciliationRepository } from '../repositories/BankReconciliationRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { SupplierRepository } from '../repositories/SupplierRepository';
import { AuthRepository } from '../repositories/AuthRepository';
import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { BackupRepository } from '../repositories/BackupRepository';
import { BranchRepository } from '../repositories/BranchRepository';
import { ClassRepository } from '../repositories/ClassRepository';
import { JournalRepository } from '../repositories/JournalRepository';
import crypto from 'crypto';
import * as fs from 'fs';

describe('SQLite Database Repositories Integration Tests', () => {
  beforeAll(() => {
    const db = getDatabase();
    db.pragma('foreign_keys = OFF');

    const tables = [
      'bank_reconciliation_items',
      'bank_reconciliations',
      'money_transactions',
      'payment_method_accounts',
      'cash_bank_accounts',
      'user_sessions',
      'backup_history',
      'backup_settings',
      'journal_entry_lines',
      'journal_entries',
      'chart_of_accounts',
      'role_permissions',
      'permissions',
      'roles',
      'branch_settings',
      'user_branches',
      'classes',
      'supplier_ledger',
      'supplier_payments',
      'stock_movements',
      'purchase_items',
      'purchases',
      'sale_items',
      'sales',
      'products',
      'categories',
      'brands',
      'units',
      'suppliers',
      'customers',
      'audit_logs',
      'settings',
      'expenses',
      'users',
      'branches',
      'tenants',
      'schema_migrations'
    ];

    for (const table of tables) {
      db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    db.pragma('foreign_keys = ON');
    runMigrations();
    runSeeds();
  });

  it('should successfully run seeds and populate default catalog', () => {
    const products = ProductRepository.getAll() as Array<{ id: string; name: string; sale_price: number }>;
    expect(products.length).toBeGreaterThan(0);

    const basmati = products.find((p) => p.id === 'P001');
    expect(basmati).toBeDefined();
    expect(basmati?.name).toBe('Super Basmati Rice 1kg');
  });

  it('should create, update, deactivate, and adjust product stock levels', () => {
    const newProduct = {
      id: 'TEST-P999',
      sku: 'TEST-P999',
      name: 'Pansar Premium Almonds 250g',
      category_id: 'CAT01',
      category_name: 'Grocery',
      supplier_id: null,
      brand_id: null,
      unit_id: null,
      purchase_cost: 450,
      sale_price: 550,
      stock_quantity: 40,
      minimum_stock: 5,
      status: 'active'
    };

    const created = ProductRepository.create(newProduct);
    expect(created.success).toBe(true);

    let almonds = ProductRepository.getById('TEST-P999') as { stock_quantity: number; sale_price: number };
    expect(almonds).toBeDefined();
    expect(almonds.stock_quantity).toBe(40);

    const updated = ProductRepository.update({ ...newProduct, sale_price: 580, stock_quantity: 35 });
    expect(updated).toBe(true);

    almonds = ProductRepository.getById('TEST-P999') as { stock_quantity: number; sale_price: number };
    expect(almonds.sale_price).toBe(580);
    expect(almonds.stock_quantity).toBe(35);

    const stockUpdated = ProductRepository.updateStock('TEST-P999', 15);
    expect(stockUpdated).toBe(true);

    almonds = ProductRepository.getById('TEST-P999') as { stock_quantity: number };
    expect(almonds.stock_quantity).toBe(15);

    const deactivated = ProductRepository.deactivate('TEST-P999');
    expect(deactivated).toBe(true);
  });

  it('should increase customer credit lines and log payments correctly', () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const customerName = 'TEST-Arif Jamil';

    const credited = CustomerRepository.createOrIncrementCredit(customerName, 4500, 12000, dateStr);
    expect(credited).toBe(true);

    let customers = CustomerRepository.getAll() as Array<{ name: string; credit: number; totalPurchases: number }>;
    let arif = customers.find((c) => c.name === customerName);
    expect(arif?.credit).toBe(4500);
    expect(arif?.totalPurchases).toBe(12000);

    const creditedMore = CustomerRepository.createOrIncrementCredit(customerName, 2500, 5000, dateStr);
    expect(creditedMore).toBe(true);

    customers = CustomerRepository.getAll() as Array<{ name: string; credit: number; totalPurchases: number }>;
    arif = customers.find((c) => c.name === customerName);
    expect(arif?.credit).toBe(7000);
    expect(arif?.totalPurchases).toBe(17000);

    const paymentReceived = CustomerRepository.receivePayment(customerName, 3000, dateStr);
    expect(paymentReceived).toBe(true);

    customers = CustomerRepository.getAll() as Array<{ name: string; credit: number }>;
    arif = customers.find((c) => c.name === customerName);
    expect(arif?.credit).toBe(4000);
  });

  it('should persist sale invoice with sale items and stock movements', () => {
    const invoiceNo = 'TEST-INV-55';
    const beforeProduct = ProductRepository.getById('P001') as { stock_quantity: number; sale_price: number };

    const logged = SaleRepository.create({
      invoiceNo,
      customerName: 'TEST-Arif Jamil',
      date: new Date().toISOString().split('T')[0],
      total: 3500,
      status: 'Paid',
      discount: 200,
      tax_rate: 5,
      items: [{ product_id: 'P001', quantity: 2, price: beforeProduct.sale_price }]
    });

    expect(logged).toBe(true);

    const db = getDatabase();
    const saleItemCount = (db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE invoiceNo = ?').get(invoiceNo) as { count: number }).count;
    const stockMovementCount = (db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE reference_type = 'SALE' AND reference_id = ?").get(invoiceNo) as { count: number }).count;

    expect(saleItemCount).toBe(1);
    expect(stockMovementCount).toBe(1);

    const afterProduct = ProductRepository.getById('P001') as { stock_quantity: number };
    expect(afterProduct.stock_quantity).toBe(beforeProduct.stock_quantity - 2);
  });

  it('should successfully log store expenses', () => {
    const expense = {
      id: 'TEST-EXP-77',
      date: new Date().toISOString().split('T')[0],
      category: 'Utility Bill',
      amount: 8500,
      paidTo: 'Sui Northern Gas Ltd',
      status: 'Paid'
    };

    const logged = ExpenseRepository.create(expense);
    expect(logged).toBe(true);

    const expenses = ExpenseRepository.getAll() as Array<{ id: string; amount: number; paidTo: string }>;
    const testExp = expenses.find((e) => e.id === 'TEST-EXP-77');
    expect(testExp?.amount).toBe(8500);
    expect(testExp?.paidTo).toBe('Sui Northern Gas Ltd');
  });

  it('should handle persistent configuration properties', () => {
    const updated = SettingsRepository.update('storeName', 'Al-Haram DHA Superstore');
    expect(updated).toBe(true);

    const settings = SettingsRepository.get();
    expect(settings.storeName).toBe('Al-Haram DHA Superstore');
  });

  it('should run database diagnostics and create timestamped local backups', () => {
    const stats = DatabaseInspector.getStats();
    expect(stats.products).toBeGreaterThan(0);
    expect(stats.customers).toBeGreaterThan(0);
    expect(stats.sales).toBeGreaterThan(0);

    const backupFilePath = BackupService.backup();
    expect(fs.existsSync(backupFilePath)).toBe(true);

    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
  });

  it('should create quote, convert/finalize invoice, and record payment with accounting + stock movement', () => {
    const today = new Date().toISOString().split('T')[0];
    const quote = QuoteRepository.create({
      customer_name: 'Arsalan Khan',
      quote_date: today,
      expiry_date: today,
      status: 'Sent',
      subtotal: 1000,
      discount_total: 0,
      tax_total: 0,
      grand_total: 1000,
      items: [
        { product_id: 'P001', quantity: 2, unit_price: 500, discount: 0, tax_rate: 0, line_total: 1000 }
      ]
    });
    expect(quote.success).toBe(true);

    const quoteId = quote.id as string;
    const quoteData = QuoteRepository.getById(quoteId) as { items: Array<{ product_id: string; quantity: number; unit_price: number; discount: number; tax_rate: number; line_total: number }>; customer_name: string };
    const beforeProduct = ProductRepository.getById('P001') as { stock_quantity: number };

    const inv = InvoiceRepository.create({
      customer_name: quoteData.customer_name,
      invoice_date: today,
      due_date: today,
      status: 'Draft',
      subtotal: 1000,
      discount_total: 0,
      tax_total: 0,
      grand_total: 1000,
      amount_paid: 0,
      items: quoteData.items
    });
    expect(inv.success).toBe(true);
    const invoiceId = inv.id as string;

    const finalized = InvoiceRepository.finalize(invoiceId);
    expect(finalized).toBe(true);

    const afterProduct = ProductRepository.getById('P001') as { stock_quantity: number };
    expect(afterProduct.stock_quantity).toBe(beforeProduct.stock_quantity - 2);

    const payment = InvoicePaymentRepository.create({
      invoice_id: invoiceId,
      payment_date: today,
      amount: 1000,
      payment_method: 'Cash',
      reference_no: 'PMT-1'
    });
    expect(payment.success).toBe(true);
    expect(payment.newBalance).toBe(0);

    const invoice = InvoiceRepository.getById(invoiceId) as { status: string; balance_due: number };
    expect(invoice.status).toBe('Paid');
    expect(invoice.balance_due).toBe(0);

    const db = getDatabase();
    const invoiceStockMovements = (db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE reference_type='INVOICE' AND reference_id=?").get(invoiceId) as { count: number }).count;
    expect(invoiceStockMovements).toBeGreaterThan(0);

    const invoiceJournals = (db.prepare("SELECT COUNT(*) as count FROM journal_entries WHERE reference_type='INVOICE' AND reference_id=?").get(invoiceId) as { count: number }).count;
    const paymentJournals = (db.prepare("SELECT COUNT(*) as count FROM journal_entries WHERE reference_type='INVOICE_PAYMENT'").get() as { count: number }).count;
    expect(invoiceJournals).toBeGreaterThan(0);
    expect(paymentJournals).toBeGreaterThan(0);
  });

  it('should auto-mark quote as expired when expiry date is in the past', () => {
    const pastDate = '2020-01-01';
    const quote = QuoteRepository.create({
      customer_name: 'Zainab Bibi',
      quote_date: pastDate,
      expiry_date: pastDate,
      status: 'Sent',
      subtotal: 500,
      discount_total: 0,
      tax_total: 0,
      grand_total: 500,
      items: [{ product_id: 'P001', quantity: 1, unit_price: 500, discount: 0, tax_rate: 0, line_total: 500 }]
    });
    expect(quote.success).toBe(true);
    const quoteId = quote.id as string;

    const byId = QuoteRepository.getById(quoteId) as { status: string };
    expect(byId.status).toBe('Expired');

    const all = QuoteRepository.getAll() as Array<{ id: string; status: string }>;
    expect(all.find((q) => q.id === quoteId)?.status).toBe('Expired');
  });

  it('should calculate inclusive and exclusive tax correctly', () => {
    const exclusive = TaxCalculationService.calculate({ amount: 1000, rate: 17, mode: 'exclusive' });
    expect(exclusive.netAmount).toBe(1000);
    expect(exclusive.taxAmount).toBe(170);
    expect(exclusive.grossAmount).toBe(1170);

    const inclusive = TaxCalculationService.calculate({ amount: 1170, rate: 17, mode: 'inclusive' });
    expect(inclusive.netAmount).toBe(1000);
    expect(inclusive.taxAmount).toBe(170);
    expect(inclusive.grossAmount).toBe(1170);
  });

  it('should produce accurate output/input tax report summary', () => {
    const today = new Date().toISOString().split('T')[0];
    const saleId = `TAXINV-${Date.now()}`;
    const purchaseId = `TAXPUR-${Date.now()}`;
    const db = getDatabase();

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_no, tenant_id, branch_id, customer_name, invoice_date, due_date, status,
        subtotal, discount_total, tax_total, grand_total, amount_paid, balance_due,
        stock_posted, accounting_posted, notes, tax_code, tax_mode, tax_amount
      ) VALUES (
        ?, ?, 'T001', 'B001', 'Arsalan Khan', ?, ?, 'Paid',
        1000, 0, 170, 1170, 1170, 0,
        1, 1, '', 'GST-17', 'exclusive', 170
      )
    `).run(saleId, `INV-${saleId}`, today, today);

    db.prepare(`
      INSERT INTO purchases (
        id, tenant_id, branch_id, supplier_id, date, total, status, payment_status, discount, tax,
        grand_total, amount_paid, remaining_payable, notes, tax_code, tax_mode
      ) VALUES (
        ?, 'T001', 'B001', NULL, ?, 1000, 'Completed', 'Paid', 0, 170,
        1170, 1170, 0, '', 'GST-17', 'exclusive'
      )
    `).run(purchaseId, today);

    const output = TaxRepository.getOutputTaxReport(today, today) as Array<{ tax_code: string; tax_amount: number }>;
    const input = TaxRepository.getInputTaxReport(today, today) as Array<{ tax_code: string; tax_amount: number }>;
    const summary = TaxRepository.getTaxSummary(today, today);

    expect(output.some((r) => r.tax_code === 'GST-17' && Number(r.tax_amount) >= 170)).toBe(true);
    expect(input.some((r) => r.tax_code === 'GST-17' && Number(r.tax_amount) >= 170)).toBe(true);
    expect(summary.outputTax).toBeGreaterThan(0);
    expect(summary.inputTax).toBeGreaterThan(0);
  });

  it('should manage bank accounts, money movement, reconciliation, and accounting postings', () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const bank = BankAccountRepository.create({
      id: 'TEST-CBA-BANK',
      code: 'TEST-BANK',
      name: 'Test Operating Bank',
      account_type: 'Bank',
      linked_gl_account_id: 'ACC-1010',
      opening_balance: 10000,
      status: 'active'
    });
    expect(bank.success).toBe(true);

    const cash = BankAccountRepository.create({
      id: 'TEST-CBA-CASH',
      code: 'TEST-CASH',
      name: 'Test Petty Cash',
      account_type: 'Cash',
      linked_gl_account_id: 'ACC-1000',
      opening_balance: 0,
      status: 'active'
    });
    expect(cash.success).toBe(true);

    const deposit = MoneyTransactionRepository.createDeposit({
      account_id: 'TEST-CBA-BANK',
      transaction_date: today,
      amount: 2000,
      offset_gl_account_id: 'ACC-3000',
      reference_no: 'DEP-1'
    });
    expect(deposit.success).toBe(true);

    const withdrawal = MoneyTransactionRepository.createWithdrawal({
      account_id: 'TEST-CBA-BANK',
      transaction_date: today,
      amount: 500,
      offset_gl_account_id: 'ACC-3000',
      reference_no: 'WDL-1'
    });
    expect(withdrawal.success).toBe(true);

    const transfer = MoneyTransactionRepository.createTransfer({
      from_account_id: 'TEST-CBA-BANK',
      to_account_id: 'TEST-CBA-CASH',
      transaction_date: today,
      amount: 1000,
      reference_no: 'TRF-1'
    });
    expect(transfer.success).toBe(true);

    const bankCharge = MoneyTransactionRepository.createBankCharge({
      account_id: 'TEST-CBA-BANK',
      transaction_date: today,
      amount: 50,
      reference_no: 'CHG-1'
    });
    expect(bankCharge.success).toBe(true);

    const balances = BankAccountRepository.getAll() as Array<{ id: string; current_balance: number }>;
    expect(balances.find((a) => a.id === 'TEST-CBA-BANK')?.current_balance).toBe(10450);
    expect(balances.find((a) => a.id === 'TEST-CBA-CASH')?.current_balance).toBe(1000);

    const worksheet = BankReconciliationRepository.createWorksheet({
      account_id: 'TEST-CBA-BANK',
      start_date: today,
      end_date: today,
      statement_balance: 10425
    });
    expect(worksheet.success).toBe(true);
    expect(worksheet.book_balance).toBe(10450);
    expect(worksheet.difference).toBe(-25);

    const items = BankReconciliationRepository.getItems(worksheet.id as string) as Array<{ transaction_id: string }>;
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(BankReconciliationRepository.markItemsCleared(worksheet.id as string, items.map((item) => item.transaction_id))).toBe(true);

    const clearedCount = (db.prepare('SELECT COUNT(*) as count FROM money_transactions WHERE account_id = ? AND is_cleared = 1').get('TEST-CBA-BANK') as { count: number }).count;
    expect(clearedCount).toBeGreaterThanOrEqual(4);

    const bankChargeExpenseLine = db.prepare(`
      SELECT COUNT(*) as count
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.reference_type = 'MONEY_TRANSACTION'
        AND je.reference_id = ?
        AND jl.account_id = 'ACC-6300'
        AND jl.debit = 50
    `).get(bankCharge.id) as { count: number };
    expect(bankChargeExpenseLine.count).toBe(1);

    const transferJournal = (db.prepare("SELECT COUNT(*) as count FROM journal_entries WHERE reference_type = 'TRANSFER' AND reference_id = ?").get(transfer.id) as { count: number }).count;
    const openingJournal = (db.prepare("SELECT COUNT(*) as count FROM journal_entries WHERE reference_type = 'BANK_ACCOUNT_OPENING' AND reference_id = 'TEST-CBA-BANK'").get() as { count: number }).count;
    expect(transferJournal).toBe(1);
    expect(openingJournal).toBe(1);

    expect(BankAccountRepository.mapPaymentMethod('EasyPaisa', 'TEST-CBA-BANK')).toBe(true);
    const mappings = BankAccountRepository.getPaymentMethodMappings() as Array<{ payment_method: string; account_id: string | null }>;
    expect(mappings.find((m) => m.payment_method === 'EasyPaisa')?.account_id).toBe('TEST-CBA-BANK');
  });

  it('should produce financial reports from ledger and operating balances', () => {
    const today = new Date().toISOString().split('T')[0];

    const profitAndLoss = ReportRepository.profitAndLoss({ dateFrom: '2000-01-01', dateTo: today });
    expect(profitAndLoss.totalIncome).toBeGreaterThan(0);
    expect(profitAndLoss.totalExpenses).toBeGreaterThan(0);
    expect(profitAndLoss.netIncome).toBeCloseTo(profitAndLoss.totalIncome - profitAndLoss.totalExpenses, 2);

    const balanceSheet = ReportRepository.balanceSheet(today);
    expect(balanceSheet.totalAssets).toBeGreaterThan(0);
    expect(balanceSheet.totalLiabilitiesAndEquity).toBeGreaterThan(0);
    expect(balanceSheet.difference).toBeCloseTo(0, 2);

    const trialBalance = ReportRepository.trialBalance({ dateFrom: '2000-01-01', dateTo: today });
    expect(trialBalance.totalDebit).toBeGreaterThan(0);
    expect(trialBalance.totalCredit).toBeGreaterThan(0);
    expect(trialBalance.totalDebit).toBeCloseTo(trialBalance.totalCredit, 2);

    const inventory = ReportRepository.inventoryValuation();
    expect(inventory.totalQuantity).toBeGreaterThan(0);
    expect(inventory.totalValue).toBeGreaterThan(0);

    CustomerRepository.createOrIncrementCredit('TEST-Report AR Customer', 900, 900, today);
    SupplierRepository.create({ id: 'TEST-REPORT-AP', name: 'TEST Report AP Supplier', opening_balance: 700, status: 'active' });

    const arAging = ReportRepository.arAging(today);
    const apAging = ReportRepository.apAging(today);
    expect(arAging.totals.total).toBeGreaterThanOrEqual(900);
    expect(apAging.totals.total).toBeGreaterThanOrEqual(700);

    const taxSummary = ReportRepository.taxSummary({ dateFrom: '2000-01-01', dateTo: today });
    expect(taxSummary.summary.outputTax).toBeGreaterThan(0);
    expect(taxSummary.summary.inputTax).toBeGreaterThan(0);
  });

  it('should authenticate users, hash passwords, assign roles, and enforce permissions', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    expect(adminLogin.token).toBeTruthy();
    expect(adminLogin.user.username).toBe('admin');
    expect(adminLogin.user.permissions).toContain('users.manage');
    expect(AuthRepository.getCurrentUser(adminLogin.token)?.username).toBe('admin');

    expect(() => AuthRepository.login('admin', 'wrong-password')).toThrow('Invalid username or password.');

    const cashier = UserRepository.create({
      id: 'TEST-CASHIER-USER',
      username: 'testcashier',
      full_name: 'Test Cashier',
      email: 'cashier@example.local',
      password: 'cashier123',
      role_id: 'R003',
      status: 'active',
      branch_id: 'B001'
    }, adminLogin.user.id);
    expect(cashier.success).toBe(true);

    const db = getDatabase();
    const stored = db.prepare('SELECT password_hash, role_id FROM users WHERE id=?').get('TEST-CASHIER-USER') as { password_hash: string; role_id: string };
    expect(stored.password_hash).not.toBe('cashier123');
    expect(stored.password_hash.startsWith('pbkdf2$')).toBe(true);
    expect(stored.role_id).toBe('R003');

    const cashierLogin = AuthRepository.login('testcashier', 'cashier123');
    expect(cashierLogin.user.permissions).toContain('pos.sale.create');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'pos.sale.create')).toBe(true);
    expect(AuthRepository.hasPermission(adminLogin.token, 'backup.manage')).toBe(true);
    expect(AuthRepository.hasPermission(cashierLogin.token, 'backup.manage')).toBe(false);
    expect(AuthRepository.hasPermission(cashierLogin.token, 'reports.view')).toBe(false);
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'reports.view')).toThrow('Unauthorized');
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'accounting.journal.create')).toThrow('Unauthorized');
    expect(() => AuthRepository.requirePermission(null, 'users.manage')).toThrow('Unauthorized');

    expect(UserRepository.update({
      id: 'U001',
      username: 'admin',
      full_name: 'Updated Admin Header',
      email: 'updated-admin@example.local',
      role_id: 'R001',
      branch_id: 'B001',
      status: 'active'
    }, adminLogin.user.id)).toBe(true);
    const refreshedAdmin = AuthRepository.getCurrentUser(adminLogin.token);
    expect(refreshedAdmin?.full_name).toBe('Updated Admin Header');
    expect(refreshedAdmin?.email).toBe('updated-admin@example.local');

    const tempRole = RoleRepository.create({
      id: 'TEST-REFRESH-ROLE',
      name: 'Test Refresh Role',
      description: 'Used for active permission refresh tests',
      permission_ids: ['PERM-POS-SALE-CREATE']
    }, adminLogin.user.id);
    expect(tempRole.success).toBe(true);
    UserRepository.create({
      id: 'TEST-REFRESH-USER',
      username: 'refreshuser',
      full_name: 'Refresh User',
      password: 'refresh123',
      role_id: 'TEST-REFRESH-ROLE',
      status: 'active',
      branch_id: 'B001'
    }, adminLogin.user.id);
    const refreshLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(refreshLogin.token, 'reports.view')).toBe(false);
    expect(RoleRepository.update({
      id: 'TEST-REFRESH-ROLE',
      name: 'Test Refresh Role',
      description: 'Updated permission set',
      permission_ids: ['PERM-POS-SALE-CREATE', 'PERM-REPORTS-VIEW']
    }, adminLogin.user.id)).toBe(true);
    expect(AuthRepository.getCurrentUser(refreshLogin.token)?.permissions).toContain('reports.view');

    const refreshTokenHash = crypto.createHash('sha256').update(refreshLogin.token).digest('hex');
    db.prepare("UPDATE user_sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE token_hash = ?").run(refreshTokenHash);
    expect(AuthRepository.getCurrentUser(refreshLogin.token)).toBeNull();

    expect(UserRepository.resetPassword('TEST-CASHIER-USER', 'newCashier123', adminLogin.user.id)).toBe(true);
    expect(() => AuthRepository.login('testcashier', 'cashier123')).toThrow('Invalid username or password.');
    expect(AuthRepository.login('testcashier', 'newCashier123').user.username).toBe('testcashier');

    expect(() => UserRepository.deactivate('U001', 'U001')).toThrow('Users cannot deactivate their own account.');
    expect(UserRepository.deactivate('TEST-CASHIER-USER', adminLogin.user.id)).toBe(true);
    expect(() => AuthRepository.login('testcashier', 'newCashier123')).toThrow('Invalid username or password.');
    expect(AuthRepository.logout(adminLogin.token)).toBe(true);
    expect(AuthRepository.getCurrentUser(adminLogin.token)).toBeNull();
  });

  it('should create backup history, validate backups, pass integrity checks, and enforce retention', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    expect(AuthRepository.hasPermission(adminLogin.token, 'backup.manage')).toBe(true);

    BackupRepository.updateSettings({ retention_count: '1' });
    const first = BackupRepository.create('manual', adminLogin.user.id);
    expect(first.success).toBe(true);
    expect(fs.existsSync(first.file_path)).toBe(true);

    const validation = BackupRepository.validate(first.file_path);
    expect(validation.valid).toBe(true);
    expect(validation.integrity).toBe('ok');

    const second = BackupRepository.create('manual', adminLogin.user.id);
    expect(second.success).toBe(true);
    expect(fs.existsSync(second.file_path)).toBe(true);

    const history = BackupRepository.list() as Array<{ id: string; status: string; file_path: string }>;
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((row) => row.status === 'success')).toBe(true);
    expect(history.some((row) => row.status === 'pruned')).toBe(true);

    const integrity = BackupRepository.integrityCheck();
    expect(integrity.ok).toBe(true);
    expect(integrity.integrity).toBe('ok');
    expect(integrity.databaseSize).toBeGreaterThan(0);

    const invalid = BackupRepository.validate('/tmp/does-not-exist-swiftpos.db');
    expect(invalid.valid).toBe(false);

    for (const row of history) {
      if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
    }
  });

  it('should manage branches, branch access, branch-filtered reports, and class assignments', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const today = new Date().toISOString().split('T')[0];

    const branch = BranchRepository.create({
      id: 'TEST-BR-002',
      branch_code: 'BR002',
      branch_name: 'Second Test Branch',
      address: 'Model Town, Lahore',
      phone: '042-000000',
      email: 'branch2@example.local',
      manager_name: 'Branch Manager',
      tax_number: 'NTN-BR002',
      status: 'active'
    }, adminLogin.user.id);
    expect(branch.success).toBe(true);

    const cls = ClassRepository.create({
      id: 'TEST-CLS-ONLINE',
      class_code: 'ONLINE',
      class_name: 'Online Sales',
      description: 'Digital commerce department',
      status: 'active'
    }, adminLogin.user.id);
    expect(cls.success).toBe(true);

    const role = RoleRepository.create({
      id: 'TEST-BRANCH-REPORTER',
      name: 'Branch Reporter',
      description: 'Reports access limited by branch assignment',
      permission_ids: ['PERM-REPORTS-VIEW']
    }, adminLogin.user.id);
    expect(role.success).toBe(true);

    const user = UserRepository.create({
      id: 'TEST-BRANCH-USER',
      username: 'branchreporter',
      full_name: 'Branch Reporter',
      password: 'branch123',
      role_id: 'TEST-BRANCH-REPORTER',
      status: 'active',
      branch_id: 'TEST-BR-002'
    }, adminLogin.user.id);
    expect(user.success).toBe(true);
    expect(BranchRepository.assignUserBranches('TEST-BRANCH-USER', ['TEST-BR-002'], 'TEST-BR-002')).toBe(true);

    const branchLogin = AuthRepository.login('branchreporter', 'branch123');
    expect(branchLogin.user.branches?.map((row: any) => row.id)).toContain('TEST-BR-002');
    expect(BranchRepository.userCanAccessBranch('TEST-BRANCH-USER', 'TEST-BR-002')).toBe(true);
    expect(BranchRepository.userCanAccessBranch('TEST-BRANCH-USER', 'B001')).toBe(false);
    expect(() => AuthRepository.requireBranchAccess(branchLogin.token, 'B001')).toThrow('Unauthorized');
    expect(AuthRepository.requireBranchAccess(branchLogin.token, 'TEST-BR-002').id).toBe('TEST-BRANCH-USER');

    const journal = JournalRepository.createJournal({
      id: 'TEST-BRANCH-JOURNAL',
      entry_no: 'TEST-BRANCH-JOURNAL',
      entry_date: today,
      description: 'Branch/class reporting probe',
      reference_type: 'TEST_BRANCH',
      reference_id: 'TEST-BR-002',
      branch_id: 'TEST-BR-002',
      class_id: 'TEST-CLS-ONLINE',
      lines: [
        { account_id: 'ACC-1000', description: 'Cash received', debit: 1234, credit: 0 },
        { account_id: 'ACC-4000', description: 'Branch income', debit: 0, credit: 1234 }
      ]
    });
    expect(journal.success).toBe(true);

    const branchPnL = ReportRepository.profitAndLoss({ dateFrom: '2000-01-01', dateTo: today, branchId: 'TEST-BR-002' });
    const classPnL = ReportRepository.profitAndLoss({ dateFrom: '2000-01-01', dateTo: today, branchId: 'TEST-BR-002', classId: 'TEST-CLS-ONLINE' });
    const mainBranchPnL = ReportRepository.profitAndLoss({ dateFrom: '2000-01-01', dateTo: today, branchId: 'B001', classId: 'TEST-CLS-ONLINE' });

    expect(branchPnL.totalIncome).toBeGreaterThanOrEqual(1234);
    expect(classPnL.totalIncome).toBe(1234);
    expect(mainBranchPnL.totalIncome).toBe(0);

    const trial = ReportRepository.trialBalance({ dateFrom: '2000-01-01', dateTo: today, branchId: 'TEST-BR-002', classId: 'TEST-CLS-ONLINE' });
    expect(trial.totalDebit).toBeCloseTo(trial.totalCredit, 2);
    expect(trial.totalDebit).toBe(1234);

    expect(BranchRepository.setDefault('TEST-BR-002')).toBe(true);
    expect((BranchRepository.getAll() as Array<{ id: string; is_default: number }>).find((row) => row.id === 'TEST-BR-002')?.is_default).toBe(1);
    expect(BranchRepository.setDefault('B001')).toBe(true);
  });
});
