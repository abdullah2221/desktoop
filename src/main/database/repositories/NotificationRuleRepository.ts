import { getDatabase } from '../connection';

const DEFAULT_RULES: Record<string, string> = {
  low_stock_enabled: 'true',
  near_expiry_days: '30',
  customer_due_grace_days: '0',
  supplier_due_grace_days: '0',
  scan_low_stock_enabled: 'true',
  scan_expiry_enabled: 'true',
  scan_customer_due_enabled: 'true',
  scan_supplier_due_enabled: 'true',
  scan_system_enabled: 'true'
};

export class NotificationRuleRepository {
  static getRules() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM notification_rules ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
    const values = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    return { ...DEFAULT_RULES, ...values };
  }

  static updateRules(settings: Record<string, string>) {
    const db = getDatabase();
    const tx = db.transaction((payload: Record<string, string>) => {
      const stmt = db.prepare(`
        INSERT INTO notification_rules (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
      `);
      for (const [key, value] of Object.entries(payload)) {
        stmt.run(key, String(value));
      }
      return this.getRules();
    });
    return tx(settings);
  }
}
