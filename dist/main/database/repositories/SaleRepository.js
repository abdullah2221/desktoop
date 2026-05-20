"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const AccountingPostingService_1 = require("./AccountingPostingService");
const TaxCalculationService_1 = require("./TaxCalculationService");
const TaxRepository_1 = require("./TaxRepository");
class SaleRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM sales ORDER BY date DESC, invoiceNo DESC').all();
    }
    static create(sale) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((payload) => {
            const stmt = db.prepare(`
        INSERT INTO sales (invoiceNo, tenant_id, branch_id, customerName, customer_id, date, total, status, discount, tax_rate, tax_code, tax_mode, tax_amount)
        VALUES (@invoiceNo, 'T001', 'B001', @customerName, @customer_id, @date, @total, @status, @discount, @tax_rate, @tax_code, @tax_mode, @tax_amount)
      `);
            const taxCode = payload.tax_code || TaxRepository_1.TaxRepository.getDefaultTaxCode('sales');
            const configuredTax = taxCode ? TaxRepository_1.TaxRepository.getTaxRateByCode(taxCode) : null;
            const effectiveRate = configuredTax?.rate ?? (payload.tax_rate ?? 0);
            const effectiveMode = payload.tax_mode || configuredTax?.mode || 'exclusive';
            const taxableBase = Math.max(0, payload.total - (payload.tax_rate ? payload.total * (payload.tax_rate / (100 + payload.tax_rate)) : 0));
            const taxCalc = TaxCalculationService_1.TaxCalculationService.calculate({ amount: taxableBase, rate: effectiveRate, mode: effectiveMode });
            const info = stmt.run({
                ...payload,
                customer_id: payload.customer_id ?? null,
                discount: payload.discount ?? 0,
                tax_rate: effectiveRate,
                tax_code: taxCode || configuredTax?.code || null,
                tax_mode: effectiveMode,
                tax_amount: taxCalc.taxAmount
            });
            const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (id, invoiceNo, product_id, quantity, price)
        VALUES (@id, @invoiceNo, @product_id, @quantity, @price)
      `);
            const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, tenant_id, branch_id, product_id, movement_type,
          quantity_in, quantity_out, reference_type, reference_id,
          previous_stock, new_stock, date, notes
        ) VALUES (
          @id, 'T001', 'B001', @product_id, 'SALE',
          0, @quantity_out, 'SALE', @reference_id,
          @previous_stock, @new_stock, @date, @notes
        )
      `);
            const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            const getStock = db.prepare('SELECT stock FROM products WHERE id = ?');
            const getCost = db.prepare('SELECT cost FROM products WHERE id = ?');
            let cogsAmount = 0;
            for (const item of payload.items) {
                insertSaleItem.run({
                    id: `SI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    invoiceNo: payload.invoiceNo,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price
                });
                const product = getStock.get(item.product_id);
                if (!product) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }
                const previousStock = product.stock;
                const newStock = Math.max(0, previousStock - item.quantity);
                updateStock.run(newStock, item.product_id);
                const productCost = getCost.get(item.product_id)?.cost ?? 0;
                cogsAmount += productCost * item.quantity;
                insertStockMovement.run({
                    id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    product_id: item.product_id,
                    quantity_out: item.quantity,
                    reference_id: payload.invoiceNo,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    date: payload.date,
                    notes: `Sold via Invoice ${payload.invoiceNo}`
                });
            }
            AuditLogRepository_1.AuditLogRepository.write({
                action: 'SALE_CREATE',
                details: `Sale ${payload.invoiceNo} created with ${payload.items.length} items`
            });
            try {
                AccountingPostingService_1.AccountingPostingService.postSale({
                    invoiceNo: payload.invoiceNo,
                    date: payload.date,
                    total: payload.total,
                    status: payload.status,
                    cogsAmount,
                    taxAmount: taxCalc.taxAmount
                });
            }
            catch (err) {
                console.error('[SaleRepository] Accounting auto-post failed:', err);
            }
            return info.changes > 0;
        });
        return tx(sale);
    }
}
exports.SaleRepository = SaleRepository;
