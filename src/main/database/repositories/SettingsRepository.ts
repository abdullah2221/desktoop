import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class SettingsRepository {
  static get() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  static update(key: string, value: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, tenant_id, branch_id)
      VALUES (?, ?, 'T001', 'B001')
    `);
    const info = stmt.run(key, value);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'SETTINGS_UPDATE', details: `Setting ${key} updated` });
    }
    return info.changes > 0;
  }
}
