import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { CurrencyRepository } from './CurrencyRepository';

export interface ExchangeRatePayload {
  id?: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  manual_override?: boolean | number;
  notes?: string;
}

export class ExchangeRateRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT er.*, fc.symbol as from_symbol, tc.symbol as to_symbol
      FROM exchange_rates er
      LEFT JOIN currencies fc ON fc.code = er.from_currency
      LEFT JOIN currencies tc ON tc.code = er.to_currency
      ORDER BY er.effective_date DESC, er.from_currency ASC
    `).all();
  }

  static create(payload: ExchangeRatePayload, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `FX-${payload.from_currency}-${payload.to_currency}-${payload.effective_date}-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, manual_override, notes)
      VALUES (@id, @from_currency, @to_currency, @rate, @effective_date, @manual_override, @notes)
    `).run({
      id,
      from_currency: payload.from_currency.toUpperCase(),
      to_currency: payload.to_currency.toUpperCase(),
      rate: Number(payload.rate),
      effective_date: payload.effective_date,
      manual_override: payload.manual_override === false ? 0 : 1,
      notes: payload.notes || ''
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'EXCHANGE_RATE_CREATE', user_id: actorId, details: `Exchange rate ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: ExchangeRatePayload & { id: string }, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE exchange_rates
      SET from_currency=@from_currency,
          to_currency=@to_currency,
          rate=@rate,
          effective_date=@effective_date,
          manual_override=@manual_override,
          notes=@notes,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      from_currency: payload.from_currency.toUpperCase(),
      to_currency: payload.to_currency.toUpperCase(),
      rate: Number(payload.rate),
      effective_date: payload.effective_date,
      manual_override: payload.manual_override === false ? 0 : 1,
      notes: payload.notes || ''
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'EXCHANGE_RATE_UPDATE', user_id: actorId, details: `Exchange rate ${payload.id} updated` });
    return info.changes > 0;
  }

  static getRate(fromCurrency: string, toCurrency?: string, effectiveDate = new Date().toISOString().split('T')[0]) {
    const from = fromCurrency.toUpperCase();
    const to = (toCurrency || (CurrencyRepository.getBaseCurrency() as any).code || 'PKR').toUpperCase();
    if (from === to) return 1;
    const db = getDatabase();
    const direct = db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE from_currency=? AND to_currency=? AND effective_date <= ?
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `).get(from, to, effectiveDate) as { rate: number } | undefined;
    if (direct) return Number(direct.rate);
    const reverse = db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE from_currency=? AND to_currency=? AND effective_date <= ?
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `).get(to, from, effectiveDate) as { rate: number } | undefined;
    if (reverse && Number(reverse.rate) !== 0) return 1 / Number(reverse.rate);
    throw new Error(`No exchange rate found for ${from} to ${to} on ${effectiveDate}.`);
  }

  static convert(amount: number, fromCurrency: string, toCurrency?: string, effectiveDate?: string) {
    const rate = this.getRate(fromCurrency, toCurrency, effectiveDate);
    const convertedAmount = Number((Number(amount || 0) * rate).toFixed(4));
    return {
      amount: Number(amount || 0),
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: (toCurrency || (CurrencyRepository.getBaseCurrency() as any).code || 'PKR').toUpperCase(),
      rate,
      convertedAmount
    };
  }

  static gainLossFoundation(originalAmount: number, bookingRate: number, settlementRate: number) {
    const bookedBaseAmount = Number((Number(originalAmount || 0) * Number(bookingRate || 0)).toFixed(4));
    const settlementBaseAmount = Number((Number(originalAmount || 0) * Number(settlementRate || 0)).toFixed(4));
    return {
      originalAmount: Number(originalAmount || 0),
      bookingRate: Number(bookingRate || 0),
      settlementRate: Number(settlementRate || 0),
      bookedBaseAmount,
      settlementBaseAmount,
      realizedGainLossBase: Number((settlementBaseAmount - bookedBaseAmount).toFixed(4)),
      unrealizedGainLossFoundation: true
    };
  }
}
