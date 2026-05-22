import { getDatabase } from '../connection';

export class AutomationRepository {
  static getRules() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM automation_rules ORDER BY key ASC').all() as Array<{ key: string; value: string }>;
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  static updateRules(settings: Record<string, string>) {
    const db = getDatabase();
    const tx = db.transaction((values: Record<string, string>) => {
      const stmt = db.prepare('INSERT OR REPLACE INTO automation_rules (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
      for (const [key, value] of Object.entries(values)) stmt.run(key, String(value));
      return this.getRules();
    });
    return tx(settings);
  }
}
