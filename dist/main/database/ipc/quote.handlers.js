"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQuoteHandlers = registerQuoteHandlers;
const electron_1 = require("electron");
const QuoteRepository_1 = require("../repositories/QuoteRepository");
const InvoiceRepository_1 = require("../repositories/InvoiceRepository");
function registerQuoteHandlers() {
    electron_1.ipcMain.handle('quotes:getAll', () => QuoteRepository_1.QuoteRepository.getAll());
    electron_1.ipcMain.handle('quotes:getById', (_, id) => QuoteRepository_1.QuoteRepository.getById(id));
    electron_1.ipcMain.handle('quotes:create', (_, payload) => QuoteRepository_1.QuoteRepository.create(payload));
    electron_1.ipcMain.handle('quotes:update', (_, payload) => QuoteRepository_1.QuoteRepository.update(payload));
    electron_1.ipcMain.handle('quotes:convertToInvoice', (_, quoteId) => {
        const quote = QuoteRepository_1.QuoteRepository.getById(quoteId);
        if (!quote)
            throw new Error('Quote not found.');
        const invoicePayload = {
            customer_name: quote.customer_name,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: quote.expiry_date,
            status: 'Draft',
            subtotal: quote.subtotal,
            discount_total: quote.discount_total,
            tax_total: quote.tax_total,
            grand_total: quote.grand_total,
            amount_paid: 0,
            notes: quote.notes,
            items: (quote.items || []).map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                tax_rate: item.tax_rate,
                line_total: item.line_total
            }))
        };
        const invoice = InvoiceRepository_1.InvoiceRepository.create(invoicePayload);
        QuoteRepository_1.QuoteRepository.update({ ...quote, status: 'Accepted' });
        return invoice;
    });
}
