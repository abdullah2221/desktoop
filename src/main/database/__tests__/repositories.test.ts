import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabase, getDatabasePath } from '../connection';
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
import { PurchaseRepository } from '../repositories/PurchaseRepository';
import { AuthRepository } from '../repositories/AuthRepository';
import { UserRepository } from '../repositories/UserRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { BackupRepository } from '../repositories/BackupRepository';
import { BranchRepository } from '../repositories/BranchRepository';
import { ClassRepository } from '../repositories/ClassRepository';
import { JournalRepository } from '../repositories/JournalRepository';
import { BudgetRepository } from '../repositories/BudgetRepository';
import { RecurringRepository } from '../repositories/RecurringRepository';
import { AutomationRepository } from '../repositories/AutomationRepository';
import { RecurringTransactionService } from '../RecurringTransactionService';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { CurrencyRepository } from '../repositories/CurrencyRepository';
import { ExchangeRateRepository } from '../repositories/ExchangeRateRepository';
import { BranchInventoryRepository } from '../repositories/BranchInventoryRepository';
import { StockTransferRepository } from '../repositories/StockTransferRepository';
import { InventoryAdjustmentRepository } from '../repositories/InventoryAdjustmentRepository';
import { ImportExportRepository } from '../repositories/ImportExportRepository';
import { ImportExportService } from '../repositories/ImportExportService';
import { SalesReturnRepository } from '../repositories/SalesReturnRepository';
import { PurchaseReturnRepository } from '../repositories/PurchaseReturnRepository';
import { DiscountRepository } from '../repositories/DiscountRepository';
import { PriceRuleRepository } from '../repositories/PriceRuleRepository';
import { DiscountCalculationService } from '../repositories/DiscountCalculationService';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationRuleRepository } from '../repositories/NotificationRuleRepository';
import { NotificationService } from '../repositories/NotificationService';
import { ReceiptService } from '../ReceiptService';
import { CashierShiftRepository } from '../repositories/CashierShiftRepository';
import { DashboardRepository } from '../repositories/DashboardRepository';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
      'stock_transfer_items',
      'stock_transfers',
      'inventory_adjustment_items',
      'inventory_adjustments',
      'branch_inventory',
      'exchange_rates',
      'currencies',
      'user_sessions',
      'timesheets',
      'employees',
      'recurring_runs',
      'recurring_templates',
      'automation_rules',
      'budget_lines',
      'budgets',
      'backup_history',
      'backup_settings',
      'shift_cash_movements',
      'cashier_shifts',
      'cash_registers',
      'invoice_payments',
      'customer_adjustments',
      'customer_payments',
      'invoice_items',
      'invoices',
      'quote_items',
      'quotes',
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
      'sales_return_items',
      'sales_returns',
      'purchase_return_items',
      'purchase_returns',
      'customers',
      'discounts',
      'price_rules',
      'promotion_runs',
      'notification_dismissals',
      'notifications',
      'notification_rules',
      'import_job_errors',
      'export_jobs',
      'import_jobs',
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

    let almonds = ProductRepository.getById('TEST-P999') as { stock_quantity: number; sale_price?: number };
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

  it('should support product lookup by barcode and SKU, and manage settings persistence', () => {
    // 1. Create a product with a unique barcode
    const barcodeProduct = {
      id: 'TEST-BC-111',
      sku: 'SKU-BC-111',
      name: 'Barcode Test Product',
      category_id: 'CAT01',
      category_name: 'Grocery',
      purchase_cost: 100,
      sale_price: 150,
      stock_quantity: 50,
      minimum_stock: 5,
      barcode: '888899991111',
      status: 'active'
    };

    const created = ProductRepository.create(barcodeProduct);
    expect(created.success).toBe(true);

    // 2. Query exact match by barcode
    const foundByBc = ProductRepository.getByBarcode('888899991111') as { id: string; name: string } | undefined;
    expect(foundByBc).toBeDefined();
    expect(foundByBc?.id).toBe('TEST-BC-111');
    expect(foundByBc?.name).toBe('Barcode Test Product');

    // 3. Query SKU fallback search
    const foundBySku = ProductRepository.searchByBarcodeOrSku('SKU-BC-111') as Array<{ id: string }>;
    expect(foundBySku.length).toBeGreaterThan(0);
    expect(foundBySku[0].id).toBe('TEST-BC-111');

    // 4. Settings Repository test
    SettingsRepository.update('test_settings_key', 'test_settings_val');
    const settings = SettingsRepository.get();
    expect(settings['test_settings_key']).toBe('test_settings_val');
  });

  it('should increase customer credit lines and log payments correctly', () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const customerName = 'TEST-Arif Jamil';

    const credited = CustomerRepository.createOrIncrementCredit(customerName, 4500, 12000, dateStr);
    expect(credited).toBe(true);

    let customers = CustomerRepository.getAll() as Array<{ name: string; credit: number; totalPurchases?: number }>;
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

  it('should support customer create/edit/deactivate/reactivate lifecycle', () => {
    const name = `TEST-CUST-LIFE-${Date.now()}`;
    expect(CustomerRepository.create({
      customer_code: `C-${Date.now()}`,
      name,
      phone: '03001112222',
      whatsapp: '03001112222',
      email: 'life@test.local',
      city: 'Lahore',
      credit_limit: 5000,
      due_days: 15,
      status: 'active'
    })).toBe(true);
    let row = CustomerRepository.getByName(name) as any;
    expect(row).toBeTruthy();
    expect(row.email).toBe('life@test.local');

    expect(CustomerRepository.update({
      name,
      customer_code: row.customer_code,
      phone: '03009998888',
      whatsapp: '03009998888',
      email: 'updated@test.local',
      city: 'Karachi',
      credit_limit: 7000,
      due_days: 21,
      status: 'active'
    })).toBe(true);
    row = CustomerRepository.getByName(name) as any;
    expect(row.phone).toBe('03009998888');
    expect(row.city).toBe('Karachi');

    expect(CustomerRepository.deactivate(name)).toBe(true);
    row = CustomerRepository.getByName(name) as any;
    expect(row.status).toBe('inactive');

    expect(CustomerRepository.reactivate(name)).toBe(true);
    row = CustomerRepository.getByName(name) as any;
    expect(row.status).toBe('active');
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
    const quoteData = QuoteRepository.getById(quoteId) as unknown as { items: Array<{ product_id: string; quantity: number; unit_price: number; discount: number; tax_rate: number; line_total: number }>; customer_name: string };
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

    const invoice = InvoiceRepository.getById(invoiceId) as unknown as { status: string; balance_due: number };
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

    const byId = QuoteRepository.getById(quoteId) as unknown as { status: string };
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

  it('should produce advanced operational reports for cashier, shift, discounts, returns, and drawer control', () => {
    const today = new Date().toISOString().split('T')[0];
    const rangeFrom = '2000-01-01';

    const dailySales = ReportRepository.dailySalesSummaryReport(rangeFrom, today);
    expect(Array.isArray(dailySales.rows)).toBe(true);

    const productSales = ReportRepository.productSalesReport(rangeFrom, today);
    expect(Array.isArray(productSales.rows)).toBe(true);

    const discountSummary = ReportRepository.discountSummaryReport(rangeFrom, today);
    expect(Array.isArray(discountSummary.byInvoice)).toBe(true);
    expect(Array.isArray(discountSummary.byProduct)).toBe(true);

    const returnSummary = ReportRepository.returnSummaryReport(rangeFrom, today);
    expect(Array.isArray(returnSummary.rows)).toBe(true);
    expect(returnSummary.totals.total_returns).toBeGreaterThanOrEqual(0);

    const voidSummary = ReportRepository.voidSummaryReport(rangeFrom, today);
    expect(Array.isArray(voidSummary.rows)).toBe(true);

    const paymentMethod = ReportRepository.paymentMethodReport(rangeFrom, today);
    expect(Array.isArray(paymentMethod.rows)).toBe(true);

    const drawer = ReportRepository.cashDrawerReconciliationReport(rangeFrom, today);
    expect(Array.isArray(drawer.rows)).toBe(true);

    const branchPerf = ReportRepository.branchPerformanceReport(rangeFrom, today);
    expect(Array.isArray(branchPerf.rows)).toBe(true);

    const cashierSales = ReportRepository.cashierSalesReport(rangeFrom, today);
    expect(Array.isArray(cashierSales.rows)).toBe(true);

    const hourlySales = ReportRepository.hourlySalesReport(rangeFrom, today);
    expect(Array.isArray(hourlySales.rows)).toBe(true);
  });

  it('should provide dashboard overview, trends, and date drilldown with filters', () => {
    const today = new Date().toISOString().slice(0, 10);
    const filters = { date_from: '2000-01-01', date_to: today, branch_id: 'B001' };

    const overview = DashboardRepository.getOverview(filters);
    expect(overview).toBeDefined();
    expect(overview.metrics).toBeDefined();
    expect(typeof overview.metrics.today_pos_sales).toBe('number');

    const trend = DashboardRepository.getSalesTrend(filters);
    expect(Array.isArray(trend.rows)).toBe(true);

    const payment = DashboardRepository.getPaymentBreakdown(filters);
    expect(Array.isArray(payment.rows)).toBe(true);

    const topProducts = DashboardRepository.getTopProducts(filters);
    expect(Array.isArray(topProducts.rows)).toBe(true);

    const shiftSummary = DashboardRepository.getShiftSummary(filters);
    expect(Array.isArray(shiftSummary.rows)).toBe(true);

    const detail = DashboardRepository.getDateDetail(today, filters);
    expect(detail.date).toBe(today);
    expect(Array.isArray(detail.sales)).toBe(true);
    expect(Array.isArray(detail.expenses)).toBe(true);
    expect(Array.isArray(detail.shifts)).toBe(true);
  });

  it('should provide metric-specific dashboard details for cards', () => {
    const today = new Date().toISOString().slice(0, 10);
    const filters = { date_from: '2000-01-01', date_to: today, branch_id: 'B001' };

    const posDetail = DashboardRepository.getMetricDetail('pos_sales', filters);
    expect(posDetail.title).toContain('POS');
    expect(Array.isArray(posDetail.rows)).toBe(true);
    expect(posDetail.columns.length).toBeGreaterThan(0);

    const lowStockDetail = DashboardRepository.getMetricDetail('low_stock', filters);
    expect(lowStockDetail.title).toContain('Low Stock');
    expect(Array.isArray(lowStockDetail.rows)).toBe(true);

    const khataDetail = DashboardRepository.getMetricDetail('khata_due', filters);
    expect(khataDetail.title).toContain('Khata');
    expect(Array.isArray(khataDetail.rows)).toBe(true);

    const topProductsDetail = DashboardRepository.getMetricDetail('top_products', filters);
    expect(topProductsDetail.title).toContain('Top Products');
    expect(Array.isArray(topProductsDetail.rows)).toBe(true);
  });

  it('should authenticate users, hash passwords, assign roles, and enforce permissions', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    expect(adminLogin.token).toBeTruthy();
    expect(adminLogin.user!.username).toBe('admin');
    expect(adminLogin.user!.permissions).toContain('users.manage');
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
    }, adminLogin.user!.id);
    expect(cashier.success).toBe(true);

    const db = getDatabase();
    const stored = db.prepare('SELECT password_hash, role_id FROM users WHERE id=?').get('TEST-CASHIER-USER') as { password_hash: string; role_id: string };
    expect(stored.password_hash).not.toBe('cashier123');
    expect(stored.password_hash.startsWith('pbkdf2$')).toBe(true);
    expect(stored.role_id).toBe('R003');

    const cashierLogin = AuthRepository.login('testcashier', 'cashier123');
    expect(cashierLogin.user!.permissions).toContain('pos.sale.create');
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
    }, adminLogin.user!.id)).toBe(true);
    const refreshedAdmin = AuthRepository.getCurrentUser(adminLogin.token);
    expect(refreshedAdmin?.full_name).toBe('Updated Admin Header');
    expect(refreshedAdmin?.email).toBe('updated-admin@example.local');

    const tempRole = RoleRepository.create({
      id: 'TEST-REFRESH-ROLE',
      name: 'Test Refresh Role',
      description: 'Used for active permission refresh tests',
      permission_ids: ['PERM-POS-SALE-CREATE']
    }, adminLogin.user!.id);
    expect(tempRole.success).toBe(true);
    UserRepository.create({
      id: 'TEST-REFRESH-USER',
      username: 'refreshuser',
      full_name: 'Refresh User',
      password: 'refresh123',
      role_id: 'TEST-REFRESH-ROLE',
      status: 'active',
      branch_id: 'B001'
    }, adminLogin.user!.id);
    const refreshLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(refreshLogin.token, 'reports.view')).toBe(false);
    expect(RoleRepository.update({
      id: 'TEST-REFRESH-ROLE',
      name: 'Test Refresh Role',
      description: 'Updated permission set',
      permission_ids: ['PERM-POS-SALE-CREATE', 'PERM-REPORTS-VIEW']
    }, adminLogin.user!.id)).toBe(true);
    expect(AuthRepository.getCurrentUser(refreshLogin.token)?.permissions).toContain('reports.view');

    const refreshTokenHash = crypto.createHash('sha256').update(refreshLogin.token).digest('hex');
    db.prepare("UPDATE user_sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE token_hash = ?").run(refreshTokenHash);
    expect(AuthRepository.getCurrentUser(refreshLogin.token)).toBeNull();

    expect(UserRepository.resetPassword('TEST-CASHIER-USER', 'newCashier123', adminLogin.user!.id)).toBe(true);
    expect(() => AuthRepository.login('testcashier', 'cashier123')).toThrow('Invalid username or password.');
    expect(AuthRepository.login('testcashier', 'newCashier123').user!.username).toBe('testcashier');

    expect(() => UserRepository.deactivate('U001', 'U001')).toThrow('Users cannot deactivate their own account.');
    expect(UserRepository.deactivate('TEST-CASHIER-USER', adminLogin.user!.id)).toBe(true);
    expect(() => AuthRepository.login('testcashier', 'newCashier123')).toThrow('Invalid username or password.');
    expect(AuthRepository.logout(adminLogin.token)).toBe(true);
    expect(AuthRepository.getCurrentUser(adminLogin.token)).toBeNull();
  });

  it('should create backup history, validate backups, pass integrity checks, and enforce retention', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    expect(AuthRepository.hasPermission(adminLogin.token, 'backup.manage')).toBe(true);

    BackupRepository.updateSettings({ retention_count: '1' });
    const first = BackupRepository.create('manual', adminLogin.user!.id);
    expect(first.success).toBe(true);
    expect(fs.existsSync(first.file_path)).toBe(true);

    const validation = BackupRepository.validate(first.file_path);
    expect(validation.valid).toBe(true);
    expect(validation.integrity).toBe('ok');

    const second = BackupRepository.create('manual', adminLogin.user!.id);
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

  it('should run automatic backup when enabled and due, then skip when not due', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    BackupRepository.updateSettings({
      automatic_backup_enabled: 'true',
      auto_backup_interval_minutes: '5',
      last_backup_at: '2000-01-01T00:00:00.000Z'
    });

    const first = BackupRepository.runAutomaticBackupIfDue('startup') as any;
    expect(first.ran).toBe(true);
    expect(first.backup?.success).toBe(true);

    const second = BackupRepository.runAutomaticBackupIfDue('interval') as any;
    expect(second.ran).toBe(false);
    expect(second.reason).toBe('not_due');

    BackupRepository.updateSettings({ automatic_backup_enabled: 'false' });
    AuthRepository.logout(adminLogin.token);
  });

  it('should create full .erpbackup with manifest/checksum and require password for encrypted backups', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const full = BackupRepository.createFull({
      actorId: adminLogin.user!.id,
      notes: 'Professional full backup test',
      password: 'secure123',
      storeName: 'Test Store',
      appVersion: '1.0.0'
    }) as any;
    expect(full.success).toBe(true);
    expect(String(full.file_path).endsWith('.erpbackup')).toBe(true);

    const noPass = BackupRepository.validateFile(full.file_path);
    expect(noPass.requiresPassword).toBe(true);

    const withPass = BackupRepository.validateFile(full.file_path, 'secure123');
    expect(withPass.valid).toBe(true);
    expect(withPass.manifest).toBeDefined();
    expect(withPass.manifest?.checksum_sha256).toBeDefined();
  });

  it('should reject tampered .erpbackup files', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const full = BackupRepository.createFull({
      actorId: adminLogin.user!.id,
      notes: 'Tamper test',
      storeName: 'Test Store',
      appVersion: '1.0.0'
    }) as any;

    const raw = fs.readFileSync(full.file_path, 'utf-8');
    const tampered = raw.replace('ERPBACKUP_V1', 'ERPBACKUP_TAMPERED');
    fs.writeFileSync(full.file_path, tampered);

    const result = BackupRepository.validateFile(full.file_path);
    expect(result.valid).toBe(false);
  });

  it('should manage branches, branch access, branch-filtered reports, and class assignments', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const today = new Date().toISOString().split('T')[0];
    const db = getDatabase();

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
    }, adminLogin.user!.id);
    expect(branch.success).toBe(true);

    const cls = ClassRepository.create({
      id: 'TEST-CLS-ONLINE',
      class_code: 'ONLINE',
      class_name: 'Online Sales',
      description: 'Digital commerce department',
      status: 'active'
    }, adminLogin.user!.id);
    expect(cls.success).toBe(true);

    const role = RoleRepository.create({
      id: 'TEST-BRANCH-REPORTER',
      name: 'Branch Reporter',
      description: 'Reports access limited by branch assignment',
      permission_ids: ['PERM-REPORTS-VIEW']
    }, adminLogin.user!.id);
    expect(role.success).toBe(true);

    const user = UserRepository.create({
      id: 'TEST-BRANCH-USER',
      username: 'branchreporter',
      full_name: 'Branch Reporter',
      password: 'branch123',
      role_id: 'TEST-BRANCH-REPORTER',
      status: 'active',
      branch_id: 'TEST-BR-002'
    }, adminLogin.user!.id);
    expect(user.success).toBe(true);
    expect(BranchRepository.assignUserBranches('TEST-BRANCH-USER', ['TEST-BR-002'], 'TEST-BR-002')).toBe(true);

    const branchLogin = AuthRepository.login('branchreporter', 'branch123');
    expect(branchLogin.user!.branches?.map((row: any) => row.id)).toContain('TEST-BR-002');
    expect(BranchRepository.userCanAccessBranch('TEST-BRANCH-USER', 'TEST-BR-002')).toBe(true);
    expect(BranchRepository.userCanAccessBranch('TEST-BRANCH-USER', 'B001')).toBe(false);
    expect(() => AuthRepository.requireBranchAccess(branchLogin.token, 'B001')).toThrow('Unauthorized');
    expect(AuthRepository.requireBranchAccess(branchLogin.token, 'TEST-BR-002').id).toBe('TEST-BRANCH-USER');

    const saleCreated = SaleRepository.create({
      invoiceNo: 'TEST-BRANCH-SALE',
      customerName: 'Branch Walk-in',
      date: today,
      total: 321,
      status: 'Paid',
      discount: 0,
      tax_rate: 0,
      branch_id: 'TEST-BR-002',
      items: [{ product_id: 'P001', quantity: 1, price: 321 }]
    });
    expect(saleCreated).toBe(true);

    const expenseCreated = ExpenseRepository.create({
      id: 'TEST-BRANCH-EXPENSE',
      branch_id: 'TEST-BR-002',
      date: today,
      category: 'Branch Rent',
      amount: 111,
      paidTo: 'Branch Landlord',
      status: 'Paid'
    });
    expect(expenseCreated).toBe(true);

    SupplierRepository.create({ id: 'TEST-BRANCH-SUPPLIER', name: 'TEST Branch Supplier', opening_balance: 0, status: 'active' });
    const purchaseCreated = PurchaseRepository.create({
      id: 'TEST-BRANCH-PURCHASE',
      branch_id: 'TEST-BR-002',
      supplier_id: 'TEST-BRANCH-SUPPLIER',
      date: today,
      subtotal: 50,
      total: 50,
      grand_total: 50,
      amount_paid: 50,
      remaining_payable: 0,
      payment_status: 'Paid',
      items: [{ product_id: 'P001', quantity: 1, unit_cost: 50, line_total: 50 }]
    });
    expect(purchaseCreated.success).toBe(true);

    const persistedBranchRows = {
      sales: (db.prepare('SELECT COUNT(*) as count FROM sales WHERE invoiceNo=? AND branch_id=?').get('TEST-BRANCH-SALE', 'TEST-BR-002') as { count: number }).count,
      expenses: (db.prepare('SELECT COUNT(*) as count FROM expenses WHERE id=? AND branch_id=?').get('TEST-BRANCH-EXPENSE', 'TEST-BR-002') as { count: number }).count,
      purchases: (db.prepare('SELECT COUNT(*) as count FROM purchases WHERE id=? AND branch_id=?').get('TEST-BRANCH-PURCHASE', 'TEST-BR-002') as { count: number }).count
    };
    expect(persistedBranchRows).toEqual({ sales: 1, expenses: 1, purchases: 1 });

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

  it('should manage budgets and calculate budget variance plus class P&L', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const today = new Date().toISOString().split('T')[0];

    const branch = BranchRepository.create({
      id: 'TEST-BUDGET-BRANCH',
      branch_code: 'BUD01',
      branch_name: 'Budget Test Branch',
      status: 'active'
    }, adminLogin.user!.id);
    expect(branch.success).toBe(true);

    const cls = ClassRepository.create({
      id: 'TEST-BUDGET-CLASS',
      class_code: 'BUDCLS',
      class_name: 'Budget Class',
      status: 'active'
    }, adminLogin.user!.id);
    expect(cls.success).toBe(true);

    const budget = BudgetRepository.create({
      id: 'TEST-BUDGET-001',
      name: 'Budget QA',
      period_type: 'monthly',
      date_from: '2000-01-01',
      date_to: today,
      branch_id: 'TEST-BUDGET-BRANCH',
      class_id: 'TEST-BUDGET-CLASS',
      status: 'Active',
      lines: [
        { account_id: 'ACC-4000', amount: 1000 },
        { account_id: 'ACC-6000', amount: 300 }
      ]
    }, adminLogin.user!.id);
    expect(budget.success).toBe(true);

    const savedBudget = BudgetRepository.getById('TEST-BUDGET-001') as { lines: Array<{ account_id: string; amount: number }> };
    expect(savedBudget.lines.length).toBe(2);
    expect(savedBudget.lines.find((line) => line.account_id === 'ACC-4000')?.amount).toBe(1000);

    JournalRepository.createJournal({
      id: 'TEST-BUDGET-JOURNAL',
      entry_no: 'TEST-BUDGET-JOURNAL',
      entry_date: today,
      description: 'Budget variance probe',
      reference_type: 'TEST_BUDGET',
      reference_id: 'TEST-BUDGET-001',
      branch_id: 'TEST-BUDGET-BRANCH',
      class_id: 'TEST-BUDGET-CLASS',
      lines: [
        { account_id: 'ACC-1000', description: 'Cash', debit: 1200, credit: 0 },
        { account_id: 'ACC-4000', description: 'Budget sales income', debit: 0, credit: 1200 }
      ]
    });
    JournalRepository.createJournal({
      id: 'TEST-BUDGET-EXP-JOURNAL',
      entry_no: 'TEST-BUDGET-EXP-JOURNAL',
      entry_date: today,
      description: 'Budget expense probe',
      reference_type: 'TEST_BUDGET',
      reference_id: 'TEST-BUDGET-001',
      branch_id: 'TEST-BUDGET-BRANCH',
      class_id: 'TEST-BUDGET-CLASS',
      lines: [
        { account_id: 'ACC-6000', description: 'Budget operating expense', debit: 225, credit: 0 },
        { account_id: 'ACC-1000', description: 'Cash', debit: 0, credit: 225 }
      ]
    });

    const variance = ReportRepository.budgetVsActual({
      dateFrom: '2000-01-01',
      dateTo: today,
      budgetId: 'TEST-BUDGET-001',
      branchId: 'TEST-BUDGET-BRANCH',
      classId: 'TEST-BUDGET-CLASS'
    });
    const incomeVariance = variance.rows.find((row: any) => row.account_id === 'ACC-4000');
    const expenseVariance = variance.rows.find((row: any) => row.account_id === 'ACC-6000');
    expect(incomeVariance).toBeDefined();
    expect(expenseVariance).toBeDefined();
    expect(incomeVariance!.actual_amount).toBe(1200);
    expect(incomeVariance!.variance_amount).toBe(200);
    expect(expenseVariance!.actual_amount).toBe(225);
    expect(expenseVariance!.variance_amount).toBe(-75);

    const wrongBranchVariance = ReportRepository.budgetVsActual({
      dateFrom: '2000-01-01',
      dateTo: today,
      budgetId: 'TEST-BUDGET-001',
      branchId: 'B001',
      classId: 'TEST-BUDGET-CLASS'
    });
    expect(wrongBranchVariance.rows.length).toBe(0);

    const classPnl = ReportRepository.classProfitAndLoss({
      dateFrom: '2000-01-01',
      dateTo: today,
      branchId: 'TEST-BUDGET-BRANCH',
      classId: 'TEST-BUDGET-CLASS'
    });
    expect(classPnl.totals.income).toBe(1200);
    expect(classPnl.totals.expenses).toBe(225);
    expect(classPnl.totals.netProfit).toBe(975);

    expect(AuthRepository.hasPermission(adminLogin.token, 'budget.manage')).toBe(true);
    const cashierLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'budget.manage')).toBe(false);
  });

  it('should run recurring automation safely with logs and permission checks', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const runDate = new Date().toISOString().split('T')[0];

    const branch = BranchRepository.create({
      id: 'TEST-AUTO-BRANCH',
      branch_code: 'AUTO01',
      branch_name: 'Automation Test Branch',
      status: 'active'
    }, adminLogin.user!.id);
    expect(branch.success).toBe(true);

    const cls = ClassRepository.create({
      id: 'TEST-AUTO-CLASS',
      class_code: 'AUTOCLS',
      class_name: 'Automation Class',
      status: 'active'
    }, adminLogin.user!.id);
    expect(cls.success).toBe(true);

    const template = RecurringRepository.create({
      id: 'TEST-REC-EXP',
      name: 'Monthly Shop Rent',
      template_type: 'expense',
      frequency: 'monthly',
      start_date: runDate,
      next_run_date: runDate,
      auto_create: true,
      status: 'active',
      branch_id: 'TEST-AUTO-BRANCH',
      class_id: 'TEST-AUTO-CLASS',
      payload: {
        category: 'Rent',
        paidTo: 'Recurring Landlord',
        amount: 444,
        status: 'Paid'
      }
    }, adminLogin.user!.id);
    expect(template.success).toBe(true);

    const saved = RecurringRepository.getById('TEST-REC-EXP') as { payload: { amount: number }; next_run_date: string };
    expect(saved.payload.amount).toBe(444);
    expect(saved.next_run_date).toBe(runDate);

    const firstRun = RecurringTransactionService.runDue(runDate);
    expect(firstRun.success).toBe(1);
    expect(firstRun.failed).toBe(0);

    const createdExpenseId = firstRun.results[0].createdTransactionId;
    const expenses = ExpenseRepository.getAll() as Array<{ id: string; amount: number; branch_id: string; class_id: string }>;
    const recurringExpense = expenses.find((expense) => expense.id === createdExpenseId);
    expect(recurringExpense?.amount).toBe(444);
    expect(recurringExpense?.branch_id).toBe('TEST-AUTO-BRANCH');
    expect(recurringExpense?.class_id).toBe('TEST-AUTO-CLASS');

    const journal = JournalRepository.getAllJournals() as Array<{ reference_type: string; reference_id: string; branch_id: string; class_id: string }>;
    const expenseJournal = journal.find((entry) => entry.reference_type === 'EXPENSE' && entry.reference_id === createdExpenseId);
    expect(expenseJournal?.branch_id).toBe('TEST-AUTO-BRANCH');
    expect(expenseJournal?.class_id).toBe('TEST-AUTO-CLASS');

    const runsAfterSuccess = RecurringRepository.getRuns('TEST-REC-EXP') as Array<{ status: string; created_transaction_id: string }>;
    expect(runsAfterSuccess.filter((run) => run.status === 'success')).toHaveLength(1);
    expect(runsAfterSuccess[0].created_transaction_id).toBe(createdExpenseId);

    const duplicateRun = RecurringTransactionService.runDue(runDate);
    expect(duplicateRun.success).toBe(0);
    const successRunsAfterDuplicate = RecurringRepository.getRuns('TEST-REC-EXP') as Array<{ status: string }>;
    expect(successRunsAfterDuplicate.filter((run) => run.status === 'success')).toHaveLength(1);

    RecurringRepository.create({
      id: 'TEST-REC-BAD',
      name: 'Broken recurring expense',
      template_type: 'expense',
      frequency: 'weekly',
      start_date: runDate,
      next_run_date: runDate,
      auto_create: true,
      status: 'active',
      payload: {
        category: 'Broken Expense',
        amount: 55,
        status: 'Paid'
      }
    }, adminLogin.user!.id);

    const failureRun = RecurringTransactionService.runDue(runDate);
    expect(failureRun.failed).toBe(1);
    const failedRuns = RecurringRepository.getRuns('TEST-REC-BAD') as Array<{ status: string; error_message: string }>;
    expect(failedRuns[0].status).toBe('failed');
    expect(failedRuns[0].error_message).toBeTruthy();

    const updatedRules = AutomationRepository.updateRules({ recurring_auto_run_enabled: 'true' });
    expect(updatedRules.recurring_auto_run_enabled).toBe('true');
    expect(AuthRepository.hasPermission(adminLogin.token, 'automation.manage')).toBe(true);
    const cashierLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'automation.manage')).toBe(false);
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'automation.manage')).toThrow('Unauthorized');
  });

  it('should manage employees, timesheets, approvals, and payroll summaries', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const workDate = new Date().toISOString().split('T')[0];

    const branch = BranchRepository.create({
      id: 'TEST-TIME-BRANCH',
      branch_code: 'TIME01',
      branch_name: 'Time Test Branch',
      status: 'active'
    }, adminLogin.user!.id);
    expect(branch.success).toBe(true);

    const employee = EmployeeRepository.create({
      id: 'TEST-EMP-001',
      employee_code: 'EMP001',
      name: 'Test Timekeeper',
      phone: '03000000000',
      email: 'timekeeper@example.local',
      designation: 'Cashier',
      branch_id: 'TEST-TIME-BRANCH',
      hourly_rate: 500,
      monthly_salary: 60000,
      status: 'active'
    }, adminLogin.user!.id);
    expect(employee.success).toBe(true);

    const savedEmployee = EmployeeRepository.getById('TEST-EMP-001') as { hourly_rate: number; monthly_salary: number; branch_id: string };
    expect(savedEmployee.hourly_rate).toBe(500);
    expect(savedEmployee.monthly_salary).toBe(60000);
    expect(savedEmployee.branch_id).toBe('TEST-TIME-BRANCH');

    const clocked = TimesheetRepository.clockIn({
      employee_id: 'TEST-EMP-001',
      branch_id: 'TEST-TIME-BRANCH',
      clock_in: `${workDate}T09:00:00.000Z`
    }, adminLogin.user!.id);
    expect(clocked.success).toBe(true);

    const clockedOut = TimesheetRepository.clockOut(clocked.id, {
      clock_out: `${workDate}T17:30:00.000Z`,
      break_minutes: 30
    }, adminLogin.user!.id);
    expect(clockedOut).toBe(true);

    const manual = TimesheetRepository.createManual({
      id: 'TEST-TS-MANUAL',
      employee_id: 'TEST-EMP-001',
      branch_id: 'TEST-TIME-BRANCH',
      work_date: workDate,
      total_hours: 2.5,
      break_minutes: 0,
      notes: 'Manual overtime'
    }, adminLogin.user!.id);
    expect(manual.success).toBe(true);

    expect(TimesheetRepository.approve(clocked.id, adminLogin.user!.id)).toBe(true);
    expect(TimesheetRepository.approve('TEST-TS-MANUAL', adminLogin.user!.id)).toBe(true);

    const entries = TimesheetRepository.getAll({ dateFrom: workDate, dateTo: workDate, branchId: 'TEST-TIME-BRANCH' }) as Array<{ id: string; total_hours: number; approval_status: string }>;
    expect(entries.find((entry) => entry.id === clocked.id)?.total_hours).toBe(8);
    expect(entries.find((entry) => entry.id === 'TEST-TS-MANUAL')?.total_hours).toBe(2.5);
    expect(entries.every((entry) => entry.approval_status === 'approved')).toBe(true);

    const summary = TimesheetRepository.summary({ dateFrom: workDate, dateTo: workDate, branchId: 'TEST-TIME-BRANCH' }) as {
      totals: { totalHours: number; estimatedPay: number };
      byEmployee: Array<{ employee_id: string }>;
      byBranch: Array<{ branch_id: string }>;
      payrollPlaceholder: boolean;
    };
    expect(summary.totals.totalHours).toBe(10.5);
    expect(summary.totals.estimatedPay).toBe(5250);
    expect(summary.byEmployee[0].employee_id).toBe('TEST-EMP-001');
    expect(summary.byBranch[0].branch_id).toBe('TEST-TIME-BRANCH');
    expect(summary.payrollPlaceholder).toBe(true);

    expect(AuthRepository.hasPermission(adminLogin.token, 'employees.manage')).toBe(true);
    expect(AuthRepository.hasPermission(adminLogin.token, 'time.track')).toBe(true);
    expect(AuthRepository.hasPermission(adminLogin.token, 'time.approve')).toBe(true);
    const cashierLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'employees.manage')).toBe(false);
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'time.approve')).toThrow('Unauthorized');
  });

  it('should manage currencies, exchange rates, conversions, and foreign currency invoices', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const today = new Date().toISOString().split('T')[0];

    const currency = CurrencyRepository.create({
      code: 'AED',
      name: 'UAE Dirham',
      symbol: 'AED',
      decimal_precision: 2,
      status: 'active'
    }, adminLogin.user!.id);
    expect(currency.success).toBe(true);

    const currencies = CurrencyRepository.getAll() as Array<{ code: string; is_base: number }>;
    expect(currencies.find((row) => row.code === 'PKR')?.is_base).toBe(1);
    expect(currencies.some((row) => row.code === 'AED')).toBe(true);

    const rate = ExchangeRateRepository.create({
      id: 'TEST-FX-AED-PKR',
      from_currency: 'AED',
      to_currency: 'PKR',
      rate: 76.5,
      effective_date: today,
      manual_override: true,
      notes: 'QA rate'
    }, adminLogin.user!.id);
    expect(rate.success).toBe(true);

    const converted = ExchangeRateRepository.convert(100, 'AED', 'PKR', today);
    expect(converted.rate).toBe(76.5);
    expect(converted.convertedAmount).toBe(7650);

    const gainLoss = ExchangeRateRepository.gainLossFoundation(100, 76.5, 78);
    expect(gainLoss.bookedBaseAmount).toBe(7650);
    expect(gainLoss.settlementBaseAmount).toBe(7800);
    expect(gainLoss.realizedGainLossBase).toBe(150);
    expect(gainLoss.unrealizedGainLossFoundation).toBe(true);

    const invoice = InvoiceRepository.create({
      id: 'TEST-FX-INVOICE',
      invoice_no: 'TEST-FX-INVOICE',
      customer_name: 'Foreign Currency Customer',
      invoice_date: today,
      due_date: today,
      status: 'Draft',
      subtotal: 100,
      discount_total: 0,
      tax_total: 5,
      tax_amount: 5,
      grand_total: 105,
      currency_code: 'AED',
      items: [
        { product_id: 'P001', quantity: 1, unit_price: 100, discount: 0, tax_rate: 5, line_total: 105 }
      ]
    });
    expect(invoice.success).toBe(true);

    const savedInvoice = InvoiceRepository.getById('TEST-FX-INVOICE') as any;
    expect(savedInvoice.currency_code).toBe('AED');
    expect(savedInvoice.exchange_rate).toBe(76.5);
    expect(savedInvoice.original_grand_total).toBe(105);
    expect(savedInvoice.grand_total).toBe(8032.5);
    expect(savedInvoice.base_grand_total).toBe(8032.5);

    const db = getDatabase();
    const baseReportAmount = (db.prepare('SELECT SUM(grand_total) as total FROM invoices WHERE id=?').get('TEST-FX-INVOICE') as { total: number }).total;
    expect(baseReportAmount).toBe(8032.5);

    expect(AuthRepository.hasPermission(adminLogin.token, 'currency.manage')).toBe(true);
    const cashierLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'currency.manage')).toBe(false);
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'currency.manage')).toThrow('Unauthorized');
  });

  it('should manage branch stock, transfers, adjustments, reports, and inventory permissions', () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');
    const today = new Date().toISOString().split('T')[0];

    const source = BranchRepository.create({
      id: 'TEST-WH-SOURCE',
      branch_code: 'WHSRC',
      branch_name: 'Warehouse Source',
      status: 'active'
    }, adminLogin.user!.id);
    const destination = BranchRepository.create({
      id: 'TEST-WH-DEST',
      branch_code: 'WHDST',
      branch_name: 'Warehouse Destination',
      status: 'active'
    }, adminLogin.user!.id);
    expect(source.success).toBe(true);
    expect(destination.success).toBe(true);

    expect(BranchInventoryRepository.upsert({
      branch_id: 'TEST-WH-SOURCE',
      product_id: 'P001',
      quantity_on_hand: 20,
      quantity_reserved: 0,
      reorder_level: 5,
      average_cost: 100
    })).toBe(true);
    expect(BranchInventoryRepository.upsert({
      branch_id: 'TEST-WH-DEST',
      product_id: 'P001',
      quantity_on_hand: 2,
      quantity_reserved: 0,
      reorder_level: 5,
      average_cost: 100
    })).toBe(true);

    const sourceStock = BranchInventoryRepository.getByBranchProduct('TEST-WH-SOURCE', 'P001') as { quantity_on_hand: number };
    expect(sourceStock.quantity_on_hand).toBe(20);

    const transfer = StockTransferRepository.create({
      id: 'TEST-TRANSFER-001',
      transfer_no: 'TEST-TRANSFER-001',
      source_branch_id: 'TEST-WH-SOURCE',
      destination_branch_id: 'TEST-WH-DEST',
      request_date: today,
      notes: 'QA transfer',
      items: [{ product_id: 'P001', quantity: 7, unit_cost: 100 }]
    }, adminLogin.user!.id);
    expect(transfer.success).toBe(true);

    expect(StockTransferRepository.approve('TEST-TRANSFER-001', adminLogin.user!.id)).toBe(true);
    expect((BranchInventoryRepository.getByBranchProduct('TEST-WH-SOURCE', 'P001') as { quantity_on_hand: number }).quantity_on_hand).toBe(13);
    expect((BranchInventoryRepository.getByBranchProduct('TEST-WH-DEST', 'P001') as { quantity_on_hand: number }).quantity_on_hand).toBe(2);

    expect(StockTransferRepository.complete('TEST-TRANSFER-001', adminLogin.user!.id)).toBe(true);
    expect((BranchInventoryRepository.getByBranchProduct('TEST-WH-DEST', 'P001') as { quantity_on_hand: number }).quantity_on_hand).toBe(9);

    const tooLargeTransfer = StockTransferRepository.create({
      id: 'TEST-TRANSFER-NEGATIVE',
      transfer_no: 'TEST-TRANSFER-NEGATIVE',
      source_branch_id: 'TEST-WH-SOURCE',
      destination_branch_id: 'TEST-WH-DEST',
      request_date: today,
      items: [{ product_id: 'P001', quantity: 99, unit_cost: 100 }]
    }, adminLogin.user!.id);
    expect(tooLargeTransfer.success).toBe(true);
    expect(() => StockTransferRepository.approve('TEST-TRANSFER-NEGATIVE', adminLogin.user!.id)).toThrow('Negative stock');

    const adjustment = InventoryAdjustmentRepository.create({
      id: 'TEST-ADJ-001',
      branch_id: 'TEST-WH-DEST',
      adjustment_date: today,
      adjustment_type: 'Shrinkage',
      reason: 'Cycle count shrinkage',
      notes: 'QA shrinkage',
      items: [{ product_id: 'P001', quantity_change: -2, unit_cost: 100 }]
    }, adminLogin.user!.id);
    expect(adjustment.success).toBe(true);
    expect((BranchInventoryRepository.getByBranchProduct('TEST-WH-DEST', 'P001') as { quantity_on_hand: number }).quantity_on_hand).toBe(7);

    const accountingFoundation = InventoryAdjustmentRepository.accountingFoundation('TEST-ADJ-001');
    expect(accountingFoundation.totalLoss).toBe(200);
    expect(accountingFoundation.journalPostingReady).toBe(true);

    const branchReport = BranchInventoryRepository.getBranchStock('TEST-WH-DEST') as Array<{ product_id: string; quantity_on_hand: number; inventory_value: number }>;
    expect(branchReport.find((row) => row.product_id === 'P001')?.quantity_on_hand).toBe(7);
    expect(BranchInventoryRepository.lowStock('TEST-WH-DEST').some((row: any) => row.product_id === 'P001')).toBe(false);
    const valuation = BranchInventoryRepository.valuation('TEST-WH-DEST');
    expect(valuation.fifoFoundation).toBe(true);
    expect(valuation.batchLotReady).toBe(true);
    expect(valuation.totalValue).toBe(700);

    const movementCount = (getDatabase().prepare("SELECT COUNT(*) as count FROM stock_movements WHERE reference_type IN ('TRANSFER', 'ADJUSTMENT') AND product_id='P001'").get() as { count: number }).count;
    expect(movementCount).toBeGreaterThanOrEqual(3);

    const transfers = StockTransferRepository.getAll() as Array<{ id: string; status: string }>;
    expect(transfers.find((row) => row.id === 'TEST-TRANSFER-001')?.status).toBe('Completed');
    const adjustments = InventoryAdjustmentRepository.getAll() as Array<{ id: string; accounting_status: string }>;
    expect(adjustments.find((row) => row.id === 'TEST-ADJ-001')?.accounting_status).toBe('pending');

    expect(AuthRepository.hasPermission(adminLogin.token, 'inventory.transfer')).toBe(true);
    expect(AuthRepository.hasPermission(adminLogin.token, 'inventory.adjust')).toBe(true);
    expect(AuthRepository.hasPermission(adminLogin.token, 'inventory.view.branch')).toBe(true);
    const cashierLogin = AuthRepository.login('refreshuser', 'refresh123');
    expect(AuthRepository.hasPermission(cashierLogin.token, 'inventory.transfer')).toBe(false);
    expect(() => AuthRepository.requirePermission(cashierLogin.token, 'inventory.adjust')).toThrow('Unauthorized');
  });

  it('should run excel/csv templates, import data with validation, track jobs, and run exports', async () => {
    const adminLogin = AuthRepository.login('admin', 'admin123');

    // 1. Get templates
    const productCsvTemplate = ImportExportService.getTemplate('products', 'csv');
    expect(Buffer.isBuffer(productCsvTemplate)).toBe(true);

    const customersXlsxTemplate = ImportExportService.getTemplate('customers', 'xlsx');
    expect(Buffer.isBuffer(customersXlsxTemplate)).toBe(true);

    // 2. Prepare test data file
    const tempDir = path.join(__dirname, 'temp_test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, 'products_import_test.csv');

    // Headers and rows
    // Row 2: valid new product
    // Row 3: valid another new product
    // Row 4: invalid product (missing name)
    const csvContent = [
      'sku,barcode,name,category,supplier,brand,unit,cost,price,wholesale_price,retail_price,stock,min_stock_alert,rack_location,expiry_date,batch_number,status',
      'IMP-SKU-901,111122223333,Imported Rice 1,Grains,Al-Rehman Traders,National Foods,kg,100,120,110,120,50,5,Rack A,2028-12-31,BATCH-IMP-01,active',
      'IMP-SKU-902,444455556666,Imported Rice 2,Grains,Al-Rehman Traders,National Foods,kg,200,240,220,240,80,10,Rack B,,BATCH-IMP-02,active',
      ',777788889999,,Grains,Al-Rehman Traders,National Foods,kg,300,360,330,360,100,15,Rack C,,BATCH-IMP-03,active'
    ].join('\n');

    fs.writeFileSync(tempFilePath, csvContent, 'utf8');

    // 3. Run Preview
    const preview = await ImportExportService.previewImport(tempFilePath, 'products');
    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(2);
    expect(preview.invalidRows).toBe(1);
    expect(preview.previewRows[0].isValid).toBe(true);
    expect(preview.previewRows[1].isValid).toBe(true);
    expect(preview.previewRows[2].isValid).toBe(false);
    expect(preview.previewRows[2].errors).toContain('SKU is required');
    expect(preview.previewRows[2].errors).toContain('Product name is required');

    // 4. Test atomic commit rollback
    const atomicCommit = ImportExportService.commitImport(preview.jobId, preview.previewRows, true);
    expect(atomicCommit.success).toBe(false);
    expect(atomicCommit.processed).toBe(0);
    expect(atomicCommit.failed).toBe(3);

    // Verify no product was inserted in db
    const db = getDatabase();
    const checkedProduct1 = db.prepare('SELECT id FROM products WHERE sku = ?').get('IMP-SKU-901');
    expect(checkedProduct1).toBeUndefined();

    // Verify import job is tracked as failed
    const importJobs = ImportExportRepository.getImportJobs();
    expect(importJobs.length).toBeGreaterThan(0);
    const trackedJob = importJobs.find((j: any) => j.id === preview.jobId) as any;
    expect(trackedJob).toBeDefined();
    expect(trackedJob.status).toBe('failed');

    const jobErrors = ImportExportRepository.getJobErrors(preview.jobId);
    expect(jobErrors.length).toBeGreaterThan(0);

    // 5. Test partial commit (atomic: false)
    const partialCommit = ImportExportService.commitImport(preview.jobId, preview.previewRows, false);
    expect(partialCommit.processed).toBe(2);
    expect(partialCommit.failed).toBe(1);

    // Verify products were inserted in db
    const checkedProduct2 = db.prepare('SELECT name, stock, cost FROM products WHERE sku = ?').get('IMP-SKU-901') as any;
    expect(checkedProduct2).toBeDefined();
    expect(checkedProduct2.name).toBe('Imported Rice 1');
    expect(checkedProduct2.stock).toBe(50);
    expect(checkedProduct2.cost).toBe(100);

    // Verify branch inventory was created
    const branchStockDirect = db.prepare('SELECT quantity_on_hand FROM branch_inventory WHERE product_id IN (SELECT id FROM products WHERE sku=?)').get('IMP-SKU-901') as any;
    expect(branchStockDirect).toBeDefined();
    expect(branchStockDirect.quantity_on_hand).toBe(50);

    // 6. Test Data Export
    const exportFilePath = path.join(tempDir, 'products_export_test.xlsx');
    const exportJobId = ImportExportService.exportData('products', 'xlsx', exportFilePath);
    expect(exportJobId).toBeDefined();
    expect(fs.existsSync(exportFilePath)).toBe(true);

    const exportJobs = ImportExportRepository.getExportJobs();
    expect(exportJobs.length).toBeGreaterThan(0);
    const trackedExportJob = exportJobs.find((j: any) => j.id === exportJobId) as any;
    expect(trackedExportJob).toBeDefined();
    expect(trackedExportJob.status).toBe('completed');

    // Clean up files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should verify production path resolver, system diagnostics, DB integrity, and required directories', () => {
    // 1. Database connection resolves correctly
    const db = getDatabase();
    expect(db).toBeDefined();

    // 2. DB path points to a real .db file (test uses test.db in VITEST mode)
    const dbPath = getDatabasePath();
    expect(dbPath).toMatch(/\.db$/);
    expect(fs.existsSync(dbPath)).toBe(true);

    // 3. SQLite integrity check passes (simple: true returns scalar string)
    const integrityResult = db.pragma('integrity_check', { simple: true }) as string;
    expect(integrityResult).toBe('ok');

    // 4. WAL mode is active (simple: true returns scalar string)
    const journalStr = db.pragma('journal_mode', { simple: true }) as string;
    expect(journalStr.toLowerCase()).toBe('wal');

    // 5. Foreign keys are enforced (simple: true returns scalar number 1 or 0)
    const fkValue = db.pragma('foreign_keys', { simple: true }) as number;
    expect(fkValue).toBe(1);

    // 6. Backup directory exists and is accessible
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    expect(fs.existsSync(backupDir)).toBe(true);

    // 7. Database inspector (diagnostics) returns correct stats
    const stats = DatabaseInspector.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.products).toBe('number');
    expect(typeof stats.customers).toBe('number');
    expect(typeof stats.sales).toBe('number');
    expect(typeof stats.expenses).toBe('number');
    expect(typeof stats.auditLogs).toBe('number');

    // 8. DB file size is non-zero (data exists)
    const dbStats = fs.statSync(dbPath);
    expect(dbStats.size).toBeGreaterThan(0);
  });

  describe('Sales and Purchase Returns Integration Tests', () => {
    it('should successfully process a sales return and reverse stock, cashier shift, and ledger entries', () => {
      // 1. Setup sample product
      const product = ProductRepository.getAll()[0] as any;
      const initialStock = product.stock_quantity;

      // 2. Setup sale
      const invoiceNo = `INV-RET-TEST-${Date.now()}`;
      const salePayload = {
        invoiceNo,
        customerName: 'Return Test Customer',
        date: new Date().toISOString().split('T')[0],
        total: 500,
        status: 'Paid' as const,
        branch_id: 'B001',
        items: [
          {
            product_id: product.id,
            quantity: 5,
            price: 100
          }
        ]
      };

      const saleCreated = SaleRepository.create(salePayload);
      expect(saleCreated).toBe(true);

      const afterSaleProduct = ProductRepository.getAll().find((p: any) => p.id === product.id) as any;
      expect(afterSaleProduct.stock_quantity).toBe(initialStock - 5);

      // 3. Process return (full)
      const returnPayload = {
        sale_id: invoiceNo,
        customer_id: 'Return Test Customer',
        branch_id: 'B001',
        refund_method: 'Cash' as const,
        subtotal: 500,
        tax_amount: 0,
        total_amount: 500,
        notes: 'Customer returned all items',
        return_reason: 'Defective product',
        created_by: 'U001',
        items: [
          {
            product_id: product.id,
            quantity: 5,
            unit_price: 100,
            total: 500
          }
        ]
      };

      const result = SalesReturnRepository.create(returnPayload);
      expect(result.success).toBe(true);
      expect(result.returnId).toBeDefined();

      // 4. Verify stock restored
      const afterReturnProduct = ProductRepository.getAll().find((p: any) => p.id === product.id) as any;
      expect(afterReturnProduct.stock_quantity).toBe(initialStock);

      // 5. Verify cannot return more items than sold
      const invalidReturnResult = SalesReturnRepository.create({
        ...returnPayload,
        items: [
          {
            product_id: product.id,
            quantity: 1,
            unit_price: 100,
            total: 100
          }
        ]
      });
      expect(invalidReturnResult.success).toBe(false);
      expect(invalidReturnResult.error).toContain('Maximum allowed return quantity is 0');
    });

    it('should successfully process a purchase return and reduce stock, supplier balance, and ledgers', () => {
      // 1. Setup supplier and product
      const supplier = SupplierRepository.getAll()[0] as any;
      const product = ProductRepository.getAll()[0] as any;
      const initialStock = product.stock_quantity;
      const initialBalance = supplier.current_balance;

      // 2. Setup purchase
      const purchaseId = `PUR-RET-TEST-${Date.now()}`;
      const purchasePayload = {
        id: purchaseId,
        supplier_id: supplier.id,
        date: new Date().toISOString().split('T')[0],
        subtotal: 1000,
        grand_total: 1000,
        amount_paid: 0,
        remaining_payable: 1000,
        status: 'Completed',
        payment_status: 'Unpaid',
        items: [
          {
            product_id: product.id,
            quantity: 10,
            unit_cost: 100,
            line_total: 1000
          }
        ]
      };

      const purchaseCreated = PurchaseRepository.create(purchasePayload);
      expect(purchaseCreated.success).toBe(true);

      const afterPurchaseProduct = ProductRepository.getAll().find((p: any) => p.id === product.id) as any;
      expect(afterPurchaseProduct.stock_quantity).toBe(initialStock + 10);

      const afterPurchaseSupplier = SupplierRepository.getById(supplier.id) as any;
      expect(afterPurchaseSupplier.current_balance).toBe(initialBalance + 1000);

      // 3. Process purchase return (partial)
      const returnPayload = {
        purchase_id: purchaseId,
        supplier_id: supplier.id,
        branch_id: 'B001',
        subtotal: 400,
        tax_amount: 0,
        total_amount: 400,
        notes: 'Returned 4 bad items',
        return_reason: 'Damaged during transit',
        created_by: 'U001',
        items: [
          {
            product_id: product.id,
            quantity: 4,
            unit_cost: 100,
            total: 400
          }
        ]
      };

      const result = PurchaseReturnRepository.create(returnPayload);
      expect(result.success).toBe(true);

      // 4. Verify stock reduced
      const afterReturnProduct = ProductRepository.getAll().find((p: any) => p.id === product.id) as any;
      expect(afterReturnProduct.stock_quantity).toBe(initialStock + 6); // 10 bought - 4 returned = 6 net increase

      // 5. Verify supplier balance reduced
      const afterReturnSupplier = SupplierRepository.getById(supplier.id) as any;
      expect(afterReturnSupplier.current_balance).toBe(initialBalance + 600); // 1000 unpaid - 400 return credit = 600 net balance
    });
  });

  describe('Discounts, Promotions & Price Rules Engine Tests', () => {
    it('should successfully create, get, and deactivate discounts', () => {
      // 1. Create a percentage product discount
      const discountPayload = {
        name: 'Summer Sale 10%',
        description: 'Get 10% off',
        discount_type: 'percentage' as const,
        value: 10,
        scope: 'product' as const,
        min_quantity: 0,
        start_date: '2026-05-01',
        end_date: '2026-08-31',
        status: 'active'
      };

      const result = DiscountRepository.create(discountPayload);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const discountId = result.id!;

      // 2. Get all and find it
      const all = DiscountRepository.getAll();
      const found = all.find((d: any) => d.id === discountId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Summer Sale 10%');
      expect(found.value).toBe(10);
      expect(found.discount_type).toBe('percentage');

      // 3. Deactivate it
      const deactivated = DiscountRepository.deactivate(discountId);
      expect(deactivated).toBe(true);

      const allPost = DiscountRepository.getAll();
      const foundPost = allPost.find((d: any) => d.id === discountId);
      expect(foundPost).toBeUndefined(); // getAll filters out status != 'inactive', so it shouldn't be found
    });

    it('should successfully create, get, and deactivate price rules', () => {
      // 1. Create a price rule for customer/product tier pricing
      const rulePayload = {
        name: 'VIP Bulk Buy Basmati',
        rule_type: 'product' as const,
        target_id: 'P001',
        discount_type: 'fixed' as const,
        value: 15,
        min_qty: 5,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'active'
      };

      const result = PriceRuleRepository.create(rulePayload);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const ruleId = result.id!;

      // 2. Get all and find it
      const all = PriceRuleRepository.getAll();
      const found = all.find((r: any) => r.id === ruleId);
      expect(found).toBeDefined();
      expect(found.name).toBe('VIP Bulk Buy Basmati');
      expect(found.target_id).toBe('P001');
      expect(found.min_qty).toBe(5);

      // 3. Deactivate it
      const deactivated = PriceRuleRepository.deactivate(ruleId);
      expect(deactivated).toBe(true);

      const allPost = PriceRuleRepository.getAll();
      const foundPost = allPost.find((r: any) => r.id === ruleId);
      expect(foundPost).toBeUndefined(); // getAll filters out inactive
    });

    it('should correctly calculate line discounts based on active price rules', () => {
      // 1. Clean up active price rules by deactivating everything, then create specific rules
      const allRules = PriceRuleRepository.getAll();
      for (const rule of allRules) {
        PriceRuleRepository.deactivate(rule.id);
      }

      // Rule A: VIP discount for CUST-VIP customer - 10% off
      const vipBasmatiRule = PriceRuleRepository.create({
        name: 'VIP Discount 10%',
        rule_type: 'customer',
        target_id: 'CUST-VIP',
        discount_type: 'percentage',
        value: 10,
        min_qty: 0,
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        status: 'active'
      });
      expect(vipBasmatiRule.success).toBe(true);
      const vipBasmatiRuleId = vipBasmatiRule.id!;

      // Rule B: Bulk discount on Grocery category (CAT01) - $5 off for min Qty 3
      const bulkGroceryRule = PriceRuleRepository.create({
        name: 'Bulk Grocery Fixed $5',
        rule_type: 'category',
        target_id: 'CAT01',
        discount_type: 'fixed',
        value: 5,
        min_qty: 3,
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        status: 'active'
      });
      expect(bulkGroceryRule.success).toBe(true);
      const bulkGroceryRuleId = bulkGroceryRule.id!;

      // 2. Perform discount calculations with mock cart items and context
      // Case 1: Basmati Rice (P001, category CAT01, normal price 150) - VIP customer buying 2 items
      // Should trigger VIP Discount 10% (10% of 300 = 30 discount)
      const itemsCase1 = [
        {
          product_id: 'P001',
          category_id: 'CAT01',
          quantity: 2,
          price: 150
        }
      ];
      const contextCase1 = {
        customerId: 'CUST-VIP',
        date: '2026-05-15'
      };

      const resultCase1 = DiscountCalculationService.calculateLineDiscounts(itemsCase1, contextCase1);
      expect(resultCase1[0].applied_rule_id).toBe(vipBasmatiRuleId);
      expect(resultCase1[0].discount).toBe(30);
      expect(resultCase1[0].line_total).toBe(270);

      // Case 2: Basmati Rice (P001) - Non-VIP customer buying 4 items
      // Non-VIP means Rule A (VIP) doesn't apply. But bulk CAT01 applies because Qty >= 3.
      // Should trigger CAT01 Bulk $5 off per item (total 5 for the line)
      const itemsCase2 = [
        {
          product_id: 'P001',
          category_id: 'CAT01',
          quantity: 4,
          price: 150
        }
      ];
      const contextCase2 = {
        customerId: 'CUST-REGULAR',
        date: '2026-05-15'
      };

      const resultCase2 = DiscountCalculationService.calculateLineDiscounts(itemsCase2, contextCase2);
      expect(resultCase2[0].applied_rule_id).toBe(bulkGroceryRuleId);
      expect(resultCase2[0].discount).toBe(5);
      expect(resultCase2[0].line_total).toBe(595);

      // Case 3: Basmati Rice (P001) - VIP customer buying 4 items
      // Both Rule A (value 10% of 600 = 60) and Rule B (value 5) apply.
      // Highest discount wins. So VIP Discount 10% should be applied.
      const itemsCase3 = [
        {
          product_id: 'P001',
          category_id: 'CAT01',
          quantity: 4,
          price: 150
        }
      ];
      const contextCase3 = {
        customerId: 'CUST-VIP',
        date: '2026-05-15'
      };

      const resultCase3 = DiscountCalculationService.calculateLineDiscounts(itemsCase3, contextCase3);
      expect(resultCase3[0].applied_rule_id).toBe(vipBasmatiRuleId);
      expect(resultCase3[0].discount).toBe(60);
      expect(resultCase3[0].line_total).toBe(540);
    });

    it('should correctly calculate invoice-level discounts and support recording promotion runs', () => {
      // 1. Percentage invoice discount
      // Subtotal 1000, 15% off = 150 discount
      const pctDiscount = DiscountCalculationService.calculateInvoiceDiscount(1000, 'percentage', 15);
      expect(pctDiscount).toBe(150);

      // 2. Fixed invoice discount
      // Subtotal 1000, $80 off = 80 discount
      const fixedDiscount = DiscountCalculationService.calculateInvoiceDiscount(1000, 'fixed', 80);
      expect(fixedDiscount).toBe(80);

      // 3. Fixed invoice discount exceeding subtotal should cap at subtotal
      const cappedDiscount = DiscountCalculationService.calculateInvoiceDiscount(50, 'fixed', 100);
      expect(cappedDiscount).toBe(50);

      // 4. Create a valid rule to satisfy the FOREIGN KEY constraint
      const rule = PriceRuleRepository.create({
        name: 'Promo Test Rule',
        rule_type: 'product',
        target_id: 'P001',
        discount_type: 'fixed',
        value: 10,
        status: 'active'
      });
      expect(rule.success).toBe(true);
      const promoRuleId = rule.id!;

      // 5. Record promotion run
      const runId = PriceRuleRepository.logPromotionRun({
        discount_id: null,
        price_rule_id: promoRuleId,
        transaction_type: 'sale',
        transaction_id: 'SALE-12345',
        applied_amount: 60.00
      });
      expect(runId).toBeDefined();

      // 6. Verify promotion run recorded in database
      const runHistory = PriceRuleRepository.getPromotionHistory();
      const matchingRun = runHistory.find((r: any) => r.transaction_id === 'SALE-12345' && r.price_rule_id === promoRuleId);
      expect(matchingRun).toBeDefined();
      expect(matchingRun.applied_amount).toBe(60.00);
    });
  });

  describe('Alerts, Notifications & Due Reminders Tests', () => {
    it('should generate low stock, expiry, and customer due notifications', () => {
      ProductRepository.create({
        id: 'TEST-LOW-001',
        sku: 'TEST-LOW-001',
        name: 'Low Stock Product',
        category_id: 'CAT01',
        category_name: 'Grocery',
        purchase_cost: 100,
        sale_price: 120,
        stock_quantity: 2,
        minimum_stock: 5,
        expiry_date: '2026-05-25',
        status: 'active'
      });
      BranchInventoryRepository.upsert({
        branch_id: 'B001',
        product_id: 'TEST-LOW-001',
        quantity_on_hand: 2,
        reorder_level: 5,
        average_cost: 100
      });

      InvoiceRepository.create({
        id: 'TEST-NTF-INV-001',
        invoice_no: 'TEST-NTF-INV-001',
        customer_name: 'Reminder Customer',
        invoice_date: '2026-04-01',
        due_date: '2026-04-10',
        status: 'Unpaid',
        subtotal: 5000,
        discount_total: 0,
        tax_total: 0,
        grand_total: 5000,
        amount_paid: 0,
        balance_due: 5000,
        items: [{ product_id: 'P001', quantity: 1, unit_price: 5000, discount: 0, tax_rate: 0, line_total: 5000 }]
      });

      const scan = NotificationService.scanAndGenerate('2026-05-22');
      expect(scan.success).toBe(true);
      expect(scan.generated).toBeGreaterThan(0);

      const inventoryRows = NotificationRepository.getAll({ tab: 'inventory' }) as any[];
      const customerRows = NotificationRepository.getAll({ tab: 'customers' }) as any[];

      expect(inventoryRows.some((row) => row.type === 'inventory.low_stock')).toBe(true);
      expect(inventoryRows.some((row) => row.type === 'inventory.near_expiry')).toBe(true);
      expect(customerRows.some((row) => row.type === 'customers.due_overdue')).toBe(true);
    });

    it('should support dismiss and mark read flows', () => {
      const created = NotificationRepository.create({
        type: 'system.manual_test',
        category: 'system',
        severity: 'warning',
        title: 'Manual Test Alert',
        message: 'Testing read and dismiss'
      });
      expect(created.success).toBe(true);

      const id = created.id as string;
      const marked = NotificationRepository.markRead(id);
      expect(marked).toBe(true);

      const dismissed = NotificationRepository.dismiss(id, 'U001');
      expect(dismissed).toBe(true);

      const allRows = NotificationRepository.getAll({ tab: 'dismissed', includeDismissed: true }) as any[];
      const found = allRows.find((row) => row.id === id);
      expect(found).toBeDefined();
      expect(found.status).toBe('dismissed');
    });

    it('should enforce notification permissions in auth repository', () => {
      const rules = NotificationRuleRepository.getRules();
      expect(rules.near_expiry_days).toBeDefined();

      const cashierUser = UserRepository.create({
        username: 'notif_cashier',
        full_name: 'Notification Cashier',
        password: 'notif123',
        role_id: 'R003',
        branch_id: 'B001'
      });
      expect(cashierUser.success).toBe(true);

      const cashierLogin = AuthRepository.login('notif_cashier', 'notif123');
      expect(cashierLogin.token).toBeDefined();
      expect(() => AuthRepository.requirePermission(cashierLogin.token, 'notifications.manage')).toThrow('Unauthorized');

      const managerUser = UserRepository.create({
        username: 'notif_manager',
        full_name: 'Notification Manager',
        password: 'notif123',
        role_id: 'R002',
        branch_id: 'B001'
      });
      expect(managerUser.success).toBe(true);

      const managerLogin = AuthRepository.login('notif_manager', 'notif123');
      expect(AuthRepository.hasPermission(managerLogin.token, 'notifications.view')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'notifications.manage')).toBe(true);
    });
  });

  describe('POS Workflow Hardening Tests', () => {
    it('should block POS sale without active shift when cashier/register metadata is provided', () => {
      expect(() => SaleRepository.create({
        invoiceNo: `TEST-NOSHIFT-${Date.now()}`,
        customerName: 'Walk-in Customer',
        customer_id: null,
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        cashier_name: 'Test Cashier',
        branch_id: 'B001',
        register_id: 'REG-B001',
        shift_id: 'SHIFT-MISSING',
        date: '2026-05-22',
        total: 100,
        status: 'Paid',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 100 }]
      })).toThrow('No active shift found. Start your day before creating POS sales.');
    });

    it('should open shift, prevent duplicate open shift, and allow sale with active shift', () => {
      const first = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 5000
      });
      expect(first.success).toBe(true);
      expect(first.shift?.status).toBe('OPEN');
      const activeShift = first.shift;
      expect(activeShift).toBeDefined();

      const second = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 2000
      });
      expect(second.reused).toBe(true);
      expect(second.shift?.id).toBe(first.shift?.id);

      const invoiceNo = `TEST-SHIFT-OK-${Date.now()}`;
      const ok = SaleRepository.create({
        invoiceNo,
        customerName: 'Walk-in Customer',
        customer_id: null,
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        branch_name: 'Main Branch',
        shift_id: activeShift!.id,
        register_id: 'REG-B001',
        payment_method: 'Cash',
        date: '2026-05-22',
        total: 250,
        status: 'Paid',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 250 }]
      });
      expect(ok).toBe(true);
    });

    it('should calculate day end over/short and close shift', () => {
      const active = CashierShiftRepository.getActiveShift('U001', 'B001', 'REG-B001') as any;
      expect(active).toBeDefined();
      const summary = CashierShiftRepository.getShiftSummary(active.id);
      expect(summary.expected_cash).toBeGreaterThan(0);
      const closed = CashierShiftRepository.closeShift({
        shift_id: active.id,
        counted_cash: summary.expected_cash + 100,
        notes: 'Counted extra cash'
      });
      expect(closed.success).toBe(true);
      expect(closed.closing_status).toBe('OVER');
      expect(Number(closed.difference)).toBe(100);
    });

    it('should support suspend/resume and force close with audit trail', () => {
      const opened = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1500
      });
      const shift = opened.shift as any;
      expect(shift.status).toBe('OPEN');

      expect(CashierShiftRepository.suspendShift(shift.id, 'U001', 'Kashif Ali', 'Lunch break')).toBe(true);
      const suspended = CashierShiftRepository.getActiveShift('U001', 'B001', 'REG-B001') as any;
      expect(suspended.status).toBe('SUSPENDED');

      expect(CashierShiftRepository.resumeShift(shift.id, 'U001', 'Kashif Ali', 'Back to counter')).toBe(true);
      const resumed = CashierShiftRepository.getActiveShift('U001', 'B001', 'REG-B001') as any;
      expect(resumed.status).toBe('OPEN');

      const forced = CashierShiftRepository.forceCloseShift({
        shift_id: shift.id,
        actor_user_id: 'U001',
        actor_name: 'Kashif Ali',
        counted_cash: 1400,
        notes: 'Register left unattended'
      });
      expect(forced.success).toBe(true);
      expect(forced.forced).toBe(true);

      const db = getDatabase();
      const row = db.prepare('SELECT status, counted_cash FROM cashier_shifts WHERE id=?').get(shift.id) as any;
      expect(row.status).toBe('FORCE_CLOSED');
      expect(Number(row.counted_cash)).toBe(1400);

      const audit = db.prepare("SELECT action FROM audit_logs WHERE action='SHIFT_FORCE_CLOSE' AND details LIKE ?").all(`%${shift.id}%`) as any[];
      expect(audit.length).toBeGreaterThan(0);
    });

    it('should allow walk-in cash sale and persist cashier/branch metadata', () => {
      const shift = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1000
      }).shift as any;
      const invoiceNo = `TEST-WALKIN-${Date.now()}`;
      const ok = SaleRepository.create({
        invoiceNo,
        customerName: 'Walk-in Customer',
        customer_id: null,
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        branch_name: 'Main Branch',
        shift_id: shift.id,
        register_id: 'REG-B001',
        payment_method: 'Cash',
        date: '2026-05-22',
        sale_time: '2026-05-22T12:00:00.000Z',
        total: 250,
        status: 'Paid',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 250 }]
      });
      expect(ok).toBe(true);
      const row = (SaleRepository.getAll() as any[]).find((s) => s.invoiceNo === invoiceNo);
      expect(row).toBeDefined();
      expect(row.customer_type).toBe('WALK_IN');
      expect(row.cashier_name).toBe('Kashif Ali');
      expect(row.branch_name).toBe('Main Branch');
      expect(row.shift_id).toBe(shift.id);
      expect(row.register_id).toBe('REG-B001');
      const walkInCustomerProfile = CustomerRepository.getByName('Walk-in Customer');
      expect(walkInCustomerProfile).toBeUndefined();
    });

    it('should enforce registered customer for khata/credit sale', () => {
      expect(() => SaleRepository.create({
        invoiceNo: `TEST-CREDIT-${Date.now()}`,
        customerName: 'Walk-in Customer',
        customer_id: null,
        customer_type: 'WALK_IN',
        date: '2026-05-22',
        total: 100,
        status: 'Credit',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 100 }]
      })).toThrow('Credit/khata sale requires a registered customer.');
    });

    it('should block inactive customer for new khata/credit sale', () => {
      const customerName = `TEST-INACTIVE-KHATA-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03004445555',
        status: 'inactive'
      })).toBe(true);

      expect(() => SaleRepository.create({
        invoiceNo: `TEST-INACTIVE-CREDIT-${Date.now()}`,
        customerName,
        customer_id: customerName,
        customer_type: 'REGISTERED',
        date: '2026-05-22',
        total: 100,
        status: 'Credit',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 100 }]
      })).toThrow('Inactive customer cannot be used for new khata sale.');
    });

    it('should return recent sales ordered latest first', () => {
      const rows = SaleRepository.getRecent({ limit: 10 }) as any[];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(10);
    });

    it('should support POS sales history and item lookups', () => {
      const shift = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1000
      }).shift as any;
      const invoiceNo = `TEST-POS-HIST-${Date.now()}`;
      const ok = SaleRepository.create({
        invoiceNo,
        customerName: 'Walk-in Customer',
        customer_id: null,
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        branch_id: 'B001',
        register_id: 'REG-B001',
        shift_id: shift.id,
        date: '2026-05-22',
        total: 200,
        status: 'Paid',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 200 }]
      });
      expect(ok).toBe(true);

      const sale = SaleRepository.getById(invoiceNo) as any;
      expect(sale).toBeDefined();
      expect(sale.invoiceNo).toBe(invoiceNo);

      const items = SaleRepository.getItems(invoiceNo) as any[];
      expect(items.length).toBeGreaterThan(0);

      const byBranch = SaleRepository.getByBranch('B001') as any[];
      expect(byBranch.some((row) => row.invoiceNo === invoiceNo)).toBe(true);

      const byHistory = SaleRepository.getHistory({ customer: 'Walk-in Customer', limit: 200 }) as any[];
      expect(byHistory.some((row) => row.invoiceNo === invoiceNo)).toBe(true);
    });

    it('should store item and invoice discount metadata correctly', () => {
      const shift = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1000
      }).shift as any;
      const invoiceNo = `TEST-DISCOUNT-${Date.now()}`;
      const ok = SaleRepository.create({
        invoiceNo,
        customerName: 'Walk-in Customer',
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        branch_id: 'B001',
        register_id: 'REG-B001',
        shift_id: shift.id,
        date: '2026-05-22',
        subtotal: 200,
        discount_type: 'percentage',
        discount_value: 10,
        discount_amount: 20,
        discount: 20,
        total: 180,
        status: 'Paid',
        tax_rate: 0,
        items: [{
          product_id: 'P001',
          quantity: 1,
          price: 200,
          discount_type: 'fixed',
          discount_value: 25,
          discount_amount: 25,
          line_total: 175
        }]
      });
      expect(ok).toBe(true);
      const row = SaleRepository.getById(invoiceNo) as any;
      expect(row.discount_type).toBe('percentage');
      expect(Number(row.discount_value)).toBe(10);
      const item = (SaleRepository.getItems(invoiceNo) as any[])[0];
      expect(item.discount_type).toBe('fixed');
      expect(Number(item.discount_amount)).toBe(25);
      expect(Number(item.line_total)).toBe(175);
    });

    it('should block excess discounts and prevent negative totals', () => {
      const shift = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1000
      }).shift as any;
      expect(() => SaleRepository.create({
        invoiceNo: `TEST-DISCOUNT-OVER-${Date.now()}`,
        customerName: 'Walk-in Customer',
        customer_type: 'WALK_IN',
        cashier_id: 'U001',
        branch_id: 'B001',
        register_id: 'REG-B001',
        shift_id: shift.id,
        date: '2026-05-22',
        subtotal: 100,
        discount_type: 'percentage',
        discount_value: 150,
        discount_amount: 150,
        discount: 150,
        total: -50,
        status: 'Paid',
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 100 }]
      })).toThrow();
    });

    it('should support role-scoped sales visibility helpers', () => {
      const allRows = SaleRepository.getHistory({ limit: 1000 }) as any[];
      expect(allRows.length).toBeGreaterThan(0);
      const ownRows = SaleRepository.getByCashier('U001', { limit: 1000 }) as any[];
      expect(ownRows.length).toBeGreaterThan(0);
      expect(ownRows.every((row) => row.cashier_id === 'U001')).toBe(true);
    });

    it('should void sale safely and reverse stock, khata, shift cash, and audit trail', () => {
      const customerName = `VOID-CUST-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03001234567',
        status: 'active'
      })).toBe(true);

      const shift = CashierShiftRepository.openShift({
        user_id: 'U001',
        cashier_name: 'Kashif Ali',
        branch_id: 'B001',
        register_id: 'REG-B001',
        opening_cash: 1000
      }).shift as any;

      const beforeProduct = ProductRepository.getById('P001') as any;
      const beforeCustomer = CustomerRepository.getByName(customerName) as any;
      const invoiceNo = `TEST-VOID-${Date.now()}`;
      expect(SaleRepository.create({
        invoiceNo,
        customerName,
        customer_id: customerName,
        customer_type: 'REGISTERED',
        cashier_id: 'U001',
        branch_id: 'B001',
        register_id: 'REG-B001',
        shift_id: shift.id,
        payment_method: 'Cash',
        date: '2026-05-22',
        subtotal: 200,
        discount: 0,
        total: 200,
        status: 'Credit',
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 200 }]
      })).toBe(true);

      const afterSaleProduct = ProductRepository.getById('P001') as any;
      expect(afterSaleProduct.stock_quantity).toBe(beforeProduct.stock_quantity - 1);

      const voided = SaleRepository.voidSale(invoiceNo, 'test void', { user_id: 'U001', name: 'Tester' });
      expect(voided.success).toBe(true);

      const voidedRow = SaleRepository.getById(invoiceNo) as any;
      expect(voidedRow.status).toBe('VOIDED');

      const afterVoidProduct = ProductRepository.getById('P001') as any;
      expect(afterVoidProduct.stock_quantity).toBe(beforeProduct.stock_quantity);

      const afterVoidCustomer = CustomerRepository.getByName(customerName) as any;
      expect(Number(afterVoidCustomer.totalPurchases || 0)).toBeLessThanOrEqual(Number(beforeCustomer.totalPurchases || 0));

      const shiftSummary = CashierShiftRepository.getShiftSummary(shift.id);
      expect(shiftSummary.refunds).toBeGreaterThanOrEqual(0);

      const trail = SaleRepository.getAuditTrail(invoiceNo) as any[];
      expect(trail.some((row) => row.action === 'SALE_VOID')).toBe(true);
    });

    it('should provide customer statement including POS and invoices', () => {
      const customerName = `TEST-CUST-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03001234567',
        status: 'active'
      })).toBe(true);

      expect(SaleRepository.create({
        invoiceNo: `TEST-CUST-SALE-${Date.now()}`,
        customerName,
        customer_id: customerName,
        customer_type: 'REGISTERED',
        date: '2026-05-22',
        total: 300,
        status: 'Paid',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 300 }]
      })).toBe(true);

      const invoice = InvoiceRepository.create({
        customer_name: customerName,
        customer_id: customerName,
        customer_type: 'REGISTERED',
        invoice_date: '2026-05-22',
        due_date: '2026-05-29',
        status: 'Unpaid',
        subtotal: 500,
        discount_total: 0,
        tax_total: 0,
        grand_total: 500,
        amount_paid: 0,
        balance_due: 500,
        items: [{ product_id: 'P001', quantity: 1, unit_price: 500, discount: 0, tax_rate: 0, line_total: 500 }]
      }) as any;
      expect(invoice.success).toBe(true);

      const statement = CustomerRepository.getStatement(customerName) as any;
      expect(statement.customer?.name).toBe(customerName);
      expect(statement.sales.length).toBeGreaterThan(0);
      expect(statement.invoices.length).toBeGreaterThan(0);
      expect(statement.summary.total_sales).toBeGreaterThan(0);
    });

    it('should support khata payment, adjustment, and running balance entries', () => {
      const customerName = `TEST-KHATA-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03001234567',
        opening_balance: 1000,
        credit_limit: 50000,
        due_days: 15,
        status: 'active'
      })).toBe(true);

      expect(SaleRepository.create({
        invoiceNo: `TEST-KHATA-SALE-${Date.now()}`,
        customerName,
        customer_id: customerName,
        customer_type: 'REGISTERED',
        date: '2026-05-22',
        total: 600,
        status: 'Credit',
        discount: 0,
        tax_rate: 0,
        items: [{ product_id: 'P001', quantity: 1, price: 600 }]
      })).toBe(true);

      const payRes = CustomerRepository.recordPayment({
        customer_name: customerName,
        payment_date: '2026-05-22',
        amount: 250,
        payment_method: 'Cash',
        notes: 'Khata payment test'
      }) as any;
      expect(payRes.success).toBe(true);

      const adjRes = CustomerRepository.createAdjustment({
        customer_name: customerName,
        adjustment_date: '2026-05-22',
        adjustment_type: 'CREDIT',
        amount: 50,
        notes: 'Discount adjustment'
      }) as any;
      expect(adjRes.success).toBe(true);

      const statement = CustomerRepository.getStatement(customerName) as any;
      expect(statement.entries.some((e: any) => e.type === 'OPENING')).toBe(true);
      expect(statement.entries.some((e: any) => e.type === 'POS_CREDIT_SALE')).toBe(true);
      expect(statement.entries.some((e: any) => e.type === 'KHATA_PAYMENT')).toBe(true);
      expect(statement.entries.some((e: any) => e.type === 'ADJUST_CREDIT')).toBe(true);
      const finalBalance = statement.entries[statement.entries.length - 1]?.balance || 0;
      expect(finalBalance).toBeGreaterThan(0);
    });

    it('should calculate overdue aging for khata customers', () => {
      const customerName = `TEST-KHATA-OVERDUE-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03001239999',
        due_days: 5,
        credit: 1200,
        lastPayment: '2026-05-01',
        status: 'active'
      })).toBe(true);
      const overdueRows = CustomerRepository.getOverdue('2026-05-22') as any[];
      const row = overdueRows.find((r) => r.customer_name === customerName);
      expect(row).toBeDefined();
      expect(row.overdue_days).toBeGreaterThan(0);
      expect(['0-30', '31-60', '61-90', '90+']).toContain(row.aging_bucket);
    });

    it('should expose khata permissions by role', () => {
      const cashierUsername = `khata_cashier_${Date.now()}`;
      const cashierUser = UserRepository.create({
        username: cashierUsername,
        full_name: 'Khata Cashier',
        password: 'khata123',
        role_id: 'R003',
        branch_id: 'B001'
      });
      expect(cashierUser.success).toBe(true);
      const cashierLogin = AuthRepository.login(cashierUsername, 'khata123');
      expect(AuthRepository.hasPermission(cashierLogin.token, 'khata.view')).toBe(true);
      expect(AuthRepository.hasPermission(cashierLogin.token, 'khata.statement')).toBe(true);
      expect(AuthRepository.hasPermission(cashierLogin.token, 'khata.adjust')).toBe(false);
      expect(AuthRepository.hasPermission(cashierLogin.token, 'customers.view')).toBe(true);
      expect(AuthRepository.hasPermission(cashierLogin.token, 'customers.create')).toBe(true);
      expect(AuthRepository.hasPermission(cashierLogin.token, 'customers.deactivate')).toBe(false);

      const managerUsername = `khata_manager_${Date.now()}`;
      const managerUser = UserRepository.create({
        username: managerUsername,
        full_name: 'Khata Manager',
        password: 'khata123',
        role_id: 'R002',
        branch_id: 'B001'
      });
      expect(managerUser.success).toBe(true);
      const managerLogin = AuthRepository.login(managerUsername, 'khata123');
      expect(AuthRepository.hasPermission(managerLogin.token, 'khata.view')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'khata.statement')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'khata.payment')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'customers.view')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'customers.create')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'customers.edit')).toBe(true);
      expect(AuthRepository.hasPermission(managerLogin.token, 'customers.deactivate')).toBe(true);
    });

    it('should provide credit limit warning rows for over-limit customers', () => {
      const customerName = `TEST-KHATA-LIMIT-${Date.now()}`;
      expect(CustomerRepository.create({
        name: customerName,
        phone: '03007777777',
        opening_balance: 0,
        credit: 12500,
        credit_limit: 10000,
        due_days: 30,
        status: 'active'
      })).toBe(true);
      const warnings = CustomerRepository.getCreditLimitWarnings() as any[];
      const row = warnings.find((w) => w.customer_name === customerName);
      expect(row).toBeTruthy();
      expect(Number(row.exceeded_by || 0)).toBeGreaterThan(0);
    });

    it('should include cashier, branch, and customer in receipt payload html', () => {
      const html = ReceiptService.generateHtml({
        invoiceNo: 'TEST-RCP-1',
        date: '2026-05-22',
        sale_time: '2026-05-22T13:00:00.000Z',
        cashierName: 'Kashif Ali',
        branch_name: 'Main Branch',
        register_id: 'REG-1',
        shift_id: 'SHIFT-2026-05-22',
        payment_method: 'Cash',
        customerName: 'Walk-in Customer',
        subtotal: 100,
        total: 100,
        paidAmount: 100,
        items: [{ name: 'Item A', quantity: 1, price: 100 }]
      }, ReceiptService.getSettings(), false);
      expect(html).toContain('Kashif Ali');
      expect(html).toContain('Main Branch');
      expect(html).toContain('Walk-in Customer');
    });

    it('should generate customer statement preview html with running balance data', () => {
      const html = ReceiptService.generateCustomerStatementHtml({
        customer: { name: 'TEST-KHATA-CUSTOMER', branch_id: 'B001' },
        summary: { opening_balance: 500, outstanding_balance: 350 },
        entries: [
          { date: '2026-05-22', type: 'OPENING', debit: 500, credit: 0, balance: 500 },
          { date: '2026-05-23', type: 'KHATA_PAYMENT', debit: 0, credit: 150, balance: 350 }
        ]
      }, ReceiptService.getSettings());
      expect(html).toContain('Customer Statement (Preview)');
      expect(html).toContain('TEST-KHATA-CUSTOMER');
      expect(html).toContain('350.00');
    });

    it('should not use alert/confirm in renderer code', () => {
      const rendererRoot = path.resolve(__dirname, '../../../renderer');
      const scan = (dir: string): string[] => {
        const rows: string[] = [];
        for (const item of fs.readdirSync(dir)) {
          const full = path.join(dir, item);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            rows.push(...scan(full));
            continue;
          }
          if (!full.endsWith('.tsx') && !full.endsWith('.ts')) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('alert(') || content.includes('confirm(')) rows.push(full);
        }
        return rows;
      };
      expect(scan(rendererRoot)).toEqual([]);
    });
  });
});
