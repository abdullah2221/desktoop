import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../connection';
import { BackupService } from '../BackupService';
import { AuditLogRepository } from './AuditLogRepository';
import { NotificationRepository } from './NotificationRepository';

export class BackupRepository {
  static create(type: 'manual' | 'auto' | 'pre-restore' = 'manual', actorId?: string) {
    try {
      const db = getDatabase();
      const filePath = BackupService.createBackupFile(type === 'manual' ? 'erp.backup' : `erp.${type}`);
      const validation = BackupService.validateBackup(filePath);
      const stat = fs.statSync(filePath);
      const id = `BKP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      db.prepare(`
        INSERT INTO backup_history (
          id, file_path, file_name, backup_type, status, file_size, integrity_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, filePath, path.basename(filePath), type, validation.valid ? 'success' : 'failed', stat.size, validation.integrity, validation.message);

      this.updateSetting('last_backup_path', filePath);
      this.updateSetting('last_backup_at', new Date().toISOString());
      this.enforceRetention();
      AuditLogRepository.write({ action: 'BACKUP_CREATE', user_id: actorId, details: `Backup created: ${filePath}` });
      if (!validation.valid) {
        NotificationRepository.createOrRefresh({
          type: 'system.backup_failed',
          category: 'system',
          severity: 'critical',
          title: 'Backup validation failed',
          message: validation.message || 'Backup validation failed after backup creation.',
          rule_key: 'backup_monitor',
          dedupe_key: `backup_validation_failed:${id}`
        });
      }
      return { success: validation.valid, id, file_path: filePath, validation };
    } catch (error: any) {
      NotificationRepository.createOrRefresh({
        type: 'system.backup_failed',
        category: 'system',
        severity: 'critical',
        title: 'Backup process failed',
        message: error?.message || String(error),
        rule_key: 'backup_monitor',
        dedupe_key: `backup_exception:${new Date().toISOString().split('T')[0]}`
      });
      throw error;
    }
  }

  static list() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC, id DESC').all();
  }

  static validate(filePath: string) {
    return BackupService.validateBackup(filePath);
  }

  static restore(filePath: string, actorId?: string) {
    const result = BackupService.restoreBackup(filePath);
    AuditLogRepository.write({ action: 'BACKUP_RESTORE', user_id: actorId, details: `Restored from ${filePath}` });
    return result;
  }

  static integrityCheck() {
    const db = getDatabase();
    const integrity = db.pragma('integrity_check', { simple: true }) as string;
    const foreignKeyRows = db.pragma('foreign_key_check') as unknown[];
    const lastBackup = db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC, id DESC LIMIT 1').get();
    return {
      integrity,
      foreignKeyIssues: foreignKeyRows.length,
      databaseSize: BackupService.getDatabaseSize(),
      ok: integrity === 'ok' && foreignKeyRows.length === 0,
      lastBackup
    };
  }

  static getSettings() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM backup_settings').all() as Array<{ key: string; value: string }>;
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  static updateSetting(key: string, value: string) {
    const db = getDatabase();
    const info = db.prepare(`
      INSERT INTO backup_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `).run(key, value);
    return info.changes > 0;
  }

  static updateSettings(settings: Record<string, string>) {
    const db = getDatabase();
    const tx = db.transaction((data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        this.updateSetting(key, String(value));
      }
      return this.getSettings();
    });
    return tx(settings);
  }

  static enforceRetention() {
    const db = getDatabase();
    const settings = this.getSettings();
    const retention = Math.max(1, Number(settings.retention_count || 10));
    const rows = db.prepare(`
      SELECT id, file_path
      FROM backup_history
      WHERE status='success'
      ORDER BY created_at DESC, id DESC
    `).all() as Array<{ id: string; file_path: string }>;
    const expired = rows.slice(retention);
    for (const row of expired) {
      if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
      db.prepare("UPDATE backup_history SET status='pruned', notes='Removed by retention policy' WHERE id=?").run(row.id);
    }
    return { retained: Math.min(rows.length, retention), pruned: expired.length };
  }
}
