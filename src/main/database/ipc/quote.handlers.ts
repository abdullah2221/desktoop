import { ipcMain } from 'electron';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { InvoiceRepository } from '../repositories/InvoiceRepository';

export function registerQuoteHandlers() {
  ipcMain.handle('quotes:getAll', () => QuoteRepository.getAll());
  ipcMain.handle('quotes:getById', (_, id: string) => QuoteRepository.getById(id));
  ipcMain.handle('quotes:create', (_, payload) => QuoteRepository.create(payload));
  ipcMain.handle('quotes:update', (_, payload) => QuoteRepository.update(payload));
  ipcMain.handle('quotes:convertToInvoice', (_, quoteId: string) => {
    const quote = QuoteRepository.getById(quoteId) as any;
    if (!quote) throw new Error('Quote not found.');

    const invoicePayload = {
      customer_name: quote.customer_name,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: quote.expiry_date,
      status: 'Draft' as const,
      subtotal: quote.subtotal,
      discount_total: quote.discount_total,
      tax_total: quote.tax_total,
      grand_total: quote.grand_total,
      amount_paid: 0,
      notes: quote.notes,
      items: (quote.items || []).map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
        line_total: item.line_total
      }))
    };

    const invoice = InvoiceRepository.create(invoicePayload);
    QuoteRepository.update({ ...quote, status: 'Accepted' });
    return invoice;
  });
}
