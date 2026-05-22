import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { InvoiceRepository } from './InvoiceRepository';
import { AccountingPostingService } from './AccountingPostingService';
import { CurrencyRepository } from './CurrencyRepository';
import { ExchangeRateRepository } from './ExchangeRateRepository';

export interface InvoicePaymentPayload {
  id?: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  currency_code?: string;
  exchange_rate?: number;
  payment_method: 'Cash' | 'Bank';
  reference_no?: string;
  notes?: string;
}

export class InvoicePaymentRepository {
  static getByInvoice(invoiceId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC').all(invoiceId);
  }

  static create(payload: InvoicePaymentPayload) {
    const db = getDatabase();
    const tx = db.transaction((data: InvoicePaymentPayload) => {
      const id = data.id || `IP-${Date.now()}`;
      const baseCurrency = (CurrencyRepository.getBaseCurrency() as any).code || 'PKR';
      const currencyCode = (data.currency_code || baseCurrency).toUpperCase();
      const exchangeRate = data.exchange_rate || ExchangeRateRepository.getRate(currencyCode, baseCurrency, data.payment_date);
      const originalAmount = Number(data.amount || 0);
      const baseAmount = Number((originalAmount * exchangeRate).toFixed(4));

      db.prepare(`
        INSERT INTO invoice_payments (
          id, tenant_id, branch_id, invoice_id, payment_date, amount, payment_method, reference_no, notes,
          currency_code, exchange_rate, original_amount, base_amount
        ) VALUES (
          @id, 'T001', 'B001', @invoice_id, @payment_date, @amount, @payment_method, @reference_no, @notes,
          @currency_code, @exchange_rate, @original_amount, @base_amount
        )
      `).run({
        id,
        invoice_id: data.invoice_id,
        payment_date: data.payment_date,
        amount: baseAmount,
        payment_method: data.payment_method,
        reference_no: data.reference_no || '',
        notes: data.notes || '',
        currency_code: currencyCode,
        exchange_rate: exchangeRate,
        original_amount: originalAmount,
        base_amount: baseAmount
      });

      const result = InvoiceRepository.applyPayment(data.invoice_id, baseAmount);

      AccountingPostingService.postInvoicePayment({
        invoiceId: data.invoice_id,
        paymentId: id,
        date: data.payment_date,
        amount: baseAmount,
        method: data.payment_method
      });

      AuditLogRepository.write({ action: 'INVOICE_PAYMENT_CREATE', details: `Invoice payment ${id} created for invoice ${data.invoice_id}` });
      return { success: true, id, ...result };
    });

    return tx(payload);
  }
}
