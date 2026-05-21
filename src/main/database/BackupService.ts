import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { closeDatabase, getDatabase, getDatabasePath } from './connection';

export interface BackupValidationResult {
  valid: boolean;
  integrity: string;
  foreignKeyIssues: number;
  fileSize: number;
  message: string;
}

export class BackupService {
  static getBackupDirectory() {
    const dbPath = getDatabasePath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  }

  static createBackupFile(prefix = 'erp.backup') {
    const db = getDatabase();
    db.pragma('wal_checkpoint(TRUNCATE)');

    const srcPath = getDatabasePath();
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Active SQLite database file not found at: ${srcPath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = Math.floor(Math.random() * 10000);
    const destPath = path.join(this.getBackupDirectory(), `${prefix}.${timestamp}.${suffix}.db`);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  }

  static validateBackup(filePath: string): BackupValidationResult {
    if (!filePath || !fs.existsSync(filePath)) {
      return { valid: false, integrity: 'missing', foreignKeyIssues: 0, fileSize: 0, message: 'Backup file does not exist.' };
    }

    let backupDb: Database.Database | null = null;
    try {
      backupDb = new Database(filePath, { readonly: true, fileMustExist: true });
      const integrity = backupDb.pragma('integrity_check', { simple: true }) as string;
      const foreignRows = backupDb.pragma('foreign_key_check') as unknown[];
      const requiredTables = backupDb.prepare(`
        SELECT COUNT(*) as count
        FROM sqlite_master
        WHERE type='table' AND name IN ('products', 'customers', 'users', 'roles', 'settings')
      `).get() as { count: number };
      const fileSize = fs.statSync(filePath).size;
      const valid = integrity === 'ok' && foreignRows.length === 0 && requiredTables.count >= 5;

      return {
        valid,
        integrity,
        foreignKeyIssues: foreignRows.length,
        fileSize,
        message: valid ? 'Backup validation passed.' : 'Backup failed integrity, foreign key, or schema validation.'
      };
    } catch (error: any) {
      return { valid: false, integrity: 'error', foreignKeyIssues: 0, fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0, message: error.message || 'Backup validation failed.' };
    } finally {
      backupDb?.close();
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${filePath}${suffix}`;
        if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
      }
    }
  }

  static restoreBackup(filePath: string) {
    const validation = this.validateBackup(filePath);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const safetyBackupPath = this.createBackupFile('erp.pre-restore');
    const targetPath = getDatabasePath();
    closeDatabase();

    fs.copyFileSync(filePath, targetPath);
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${targetPath}${suffix}`;
      if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
    }

    return {
      success: true,
      restored_from: filePath,
      safety_backup_path: safetyBackupPath,
      restart_required: true
    };
  }

  static getDatabaseSize() {
    const dbPath = getDatabasePath();
    return fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  }
}
