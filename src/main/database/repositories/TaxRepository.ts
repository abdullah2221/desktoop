import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export interface TaxRatePayload {
  id?: string;
  code: string;
  name: string;
  rate: number;
  type: 'GST' | 'VAT' | 'Sales Tax' | 'Withholding';
  mode: 'inclusive' | 'exclusive';
  purchase_account_id?: string | null;
  sales_account_id?: string | null;
  status?: 'active' | 'inactive';
}

export class TaxRepository {
  static getRates() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tax_rates ORDER BY code ASC').all();
  }

  static createRate(payload: TaxRatePayload) {
    const db = getDatabase();
    const id = payload.id || `TAX-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO tax_rates (
        id, code, name, rate, type, mode, purchase_account_id, sales_account_id, status
      ) VALUES (
        @id, @code, @name, @rate, @type, @mode, @purchase_account_id, @sales_account_id, @status
      )
    `).run({
      id,
      code: payload.code,
      name: payload.name,
      rate: payload.rate,
      type: payload.type,
      mode: payload.mode,
      purchase_account_id: payload.purchase_account_id || null,
      sales_account_id: payload.sales_account_id || null,
      status: payload.status || 'active'
    });

    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'TAX_RATE_CREATE', details: `Tax rate ${id} created` });
    }
    return { success: info.changes > 0, id };
  }

  static updateRate(payload: TaxRatePayload & { id: string }) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE tax_rates
      SET code=@code,
          name=@name,
          rate=@rate,
          type=@type,
          mode=@mode,
          purchase_account_id=@purchase_account_id,
          sales_account_id=@sales_account_id,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      ...payload,
      purchase_account_id: payload.purchase_account_id || null,
      sales_account_id: payload.sales_account_id || null,
      status: payload.status || 'active'
    });

    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'TAX_RATE_UPDATE', details: `Tax rate ${payload.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivateRate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE tax_rates SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'TAX_RATE_DEACTIVATE', details: `Tax rate ${id} deactivated` });
    }
    return info.changes > 0;
  }

  static getSettings() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM tax_settings').all() as Array<{ key: string; value: string }>;
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  static updateSetting(key: string, value: string) {
    const db = getDatabase();
    const info = db.prepare('INSERT OR REPLACE INTO tax_settings (key, value) VALUES (?, ?)').run(key, value);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'TAX_SETTING_UPDATE', details: `Tax setting ${key} updated` });
    }
    return info.changes > 0;
  }

  static getTaxRateByCode(code: string) {
    const db = getDatabase();
    return db.prepare("SELECT * FROM tax_rates WHERE code = ? AND status = 'active'").get(code) as any;
  }

  static getDefaultTaxCode(context: 'sales' | 'purchase' | 'expense') {
    const db = getDatabase();
    const keyMap = {
      sales: 'default_sales_tax_code',
      purchase: 'default_purchase_tax_code',
      expense: 'default_expense_tax_code'
    } as const;
    const row = db.prepare('SELECT value FROM tax_settings WHERE key = ?').get(keyMap[context]) as { value: string } | undefined;
    return row?.value || null;
  }

  static getOutputTaxReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT COALESCE(tax_code, 'UNMAPPED') as tax_code,
             COUNT(*) as docs,
             SUM(COALESCE(tax_amount, tax_total, 0)) as tax_amount,
             SUM(COALESCE(subtotal, 0)) as net_sales
      FROM invoices
      WHERE status IN ('Unpaid', 'Partially Paid', 'Paid')
        AND invoice_date BETWEEN ? AND ?
      GROUP BY tax_code
      ORDER BY tax_code
    `).all(dateFrom, dateTo);
  }

  static getInputTaxReport(dateFrom: string, dateTo: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT COALESCE(tax_code, 'UNMAPPED') as tax_code,
             COUNT(*) as docs,
             SUM(COALESCE(tax, 0)) as tax_amount,
             SUM(COALESCE(total, 0)) as net_purchase
      FROM purchases
      WHERE date BETWEEN ? AND ?
      GROUP BY tax_code
      ORDER BY tax_code
    `).all(dateFrom, dateTo);
  }

  static getTaxSummary(dateFrom: string, dateTo: string) {
    const outputRows = this.getOutputTaxReport(dateFrom, dateTo) as Array<{ tax_amount: number }>;
    const inputRows = this.getInputTaxReport(dateFrom, dateTo) as Array<{ tax_amount: number }>;
    const outputTax = outputRows.reduce((s, r) => s + (r.tax_amount || 0), 0);
    const inputTax = inputRows.reduce((s, r) => s + (r.tax_amount || 0), 0);

    return {
      outputTax,
      inputTax,
      netPayable: outputTax - inputTax
    };
  }
}
