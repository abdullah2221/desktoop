import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export interface CurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  decimal_precision?: number;
  is_base?: boolean | number;
  status?: 'active' | 'inactive';
}

export class CurrencyRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM currencies ORDER BY is_base DESC, code ASC').all();
  }

  static getBaseCurrency() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM currencies WHERE is_base=1 LIMIT 1').get() || { code: 'PKR', symbol: 'Rs', decimal_precision: 2 };
  }

  static create(payload: CurrencyPayload, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction((data: CurrencyPayload) => {
      if (data.is_base) db.prepare('UPDATE currencies SET is_base=0').run();
      const code = data.code.toUpperCase();
      const info = db.prepare(`
        INSERT INTO currencies (code, name, symbol, decimal_precision, is_base, status)
        VALUES (@code, @name, @symbol, @decimal_precision, @is_base, @status)
      `).run({
        code,
        name: data.name,
        symbol: data.symbol,
        decimal_precision: Number(data.decimal_precision ?? 2),
        is_base: data.is_base ? 1 : 0,
        status: data.status || 'active'
      });
      if (info.changes > 0) AuditLogRepository.write({ action: 'CURRENCY_CREATE', user_id: actorId, details: `Currency ${code} created` });
      return { success: info.changes > 0, code };
    });
    return tx(payload);
  }

  static update(payload: CurrencyPayload, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction((data: CurrencyPayload) => {
      const code = data.code.toUpperCase();
      if (data.is_base) db.prepare('UPDATE currencies SET is_base=0 WHERE code<>?').run(code);
      const info = db.prepare(`
        UPDATE currencies
        SET name=@name,
            symbol=@symbol,
            decimal_precision=@decimal_precision,
            is_base=@is_base,
            status=@status,
            updated_at=CURRENT_TIMESTAMP
        WHERE code=@code
      `).run({
        code,
        name: data.name,
        symbol: data.symbol,
        decimal_precision: Number(data.decimal_precision ?? 2),
        is_base: data.is_base ? 1 : 0,
        status: data.status || 'active'
      });
      if (info.changes > 0) AuditLogRepository.write({ action: 'CURRENCY_UPDATE', user_id: actorId, details: `Currency ${code} updated` });
      return info.changes > 0;
    });
    return tx(payload);
  }

  static deactivate(code: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE currencies SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE code=? AND is_base=0").run(code.toUpperCase());
    if (info.changes > 0) AuditLogRepository.write({ action: 'CURRENCY_DEACTIVATE', user_id: actorId, details: `Currency ${code} deactivated` });
    return info.changes > 0;
  }
}
