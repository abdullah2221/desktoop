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
import * as fs from 'fs';

describe('SQLite Database Repositories Integration Tests', () => {
  beforeAll(() => {
    const db = getDatabase();
    db.pragma('foreign_keys = OFF');

    const tables = [
      'journal_entry_lines',
      'journal_entries',
      'chart_of_accounts',
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
});
