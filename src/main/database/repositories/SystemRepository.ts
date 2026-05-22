import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase, getDatabasePath } from '../connection';
import { BackupService } from '../BackupService';
import { AppStartupManager, DiagnosticsReport } from '../../startup';
import { logger } from '../../logger';


export interface AppInfo {
  appName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  installPath: string;
  userDataPath: string;
}

export interface DatabaseStatus {
  dbPath: string;
  sizeInBytes: number;
  journalMode: string;
  foreignKeys: boolean;
  backupPath: string;
  lastBackupAt: string;
  lastBackupPath: string;
  integrityStatus: string;
}

export interface LogStatus {
  logFilePath: string;
  logsDirectory: string;
  logLines: string[];
}

export interface SystemDiagnostics extends DiagnosticsReport {
  activeBranch: string;
  activeUser: string;
  baseCurrency: string;
  environmentMode: string;
}

export class SystemRepository {
  static getAppInfo(): AppInfo {
    return {
      appName: app.getName() || 'POS & Inventory ERP',
      version: app.getVersion() || '1.0.0',
      environment: AppStartupManager.getEnvironmentMode(),
      installPath: app.getAppPath(),
      userDataPath: app.getPath('userData'),
    };
  }

  static getDatabaseStatus(): DatabaseStatus {
    const db = getDatabase();
    const dbPath = getDatabasePath();
    let sizeInBytes = 0;
    try {
      if (fs.existsSync(dbPath)) {
        sizeInBytes = fs.statSync(dbPath).size;
      }
    } catch (err) {
      logger.error('DB', 'Failed to retrieve database file statistics', err);
    }

    let lastBackupAt = '';
    let lastBackupPath = '';
    try {
      const backupSetting = db.prepare(
        "SELECT key, value FROM backup_settings WHERE key IN ('last_backup_at', 'last_backup_path')"
      ).all() as Array<{ key: string; value: string }>;

      lastBackupAt = backupSetting.find((s) => s.key === 'last_backup_at')?.value || 'Never';
      lastBackupPath = backupSetting.find((s) => s.key === 'last_backup_path')?.value || 'None';
    } catch {
      // In case table is not populated yet
    }

    const journalMode = String(db.pragma('journal_mode'));
    const foreignKeys = Boolean(db.pragma('foreign_keys'));
    const integrityCheck = db.pragma('integrity_check') as string[];

    return {
      dbPath,
      sizeInBytes,
      journalMode,
      foreignKeys,
      backupPath: BackupService.getBackupDirectory(),
      lastBackupAt,
      lastBackupPath,
      integrityStatus: integrityCheck.join(', '),
    };
  }


  static getLogStatus(): LogStatus {
    return {
      logFilePath: logger.getLogFilePath(),
      logsDirectory: logger.getLogDirectory(),
      logLines: logger.readLogLines(80),
    };
  }

  static getDiagnostics(): SystemDiagnostics {
    const report = AppStartupManager.runDiagnostics();
    const db = getDatabase();

    let activeUser = 'Guest / Unauthenticated';
    try {
      // Try to get default user details
      const user = db.prepare("SELECT username, full_name FROM users WHERE id = 'U001'").get() as { username: string; full_name: string } | undefined;
      if (user) {
        activeUser = `${user.full_name} (${user.username})`;
      }
    } catch {
      // If table is not seeded
    }

    let baseCurrency = 'PKR (Rs)';
    try {
      const currency = db.prepare("SELECT code, symbol FROM currencies WHERE is_base = 1").get() as { code: string; symbol: string } | undefined;
      if (currency) {
        baseCurrency = `${currency.code} (${currency.symbol})`;
      }
    } catch {
      // If table is not seeded
    }

    return {
      ...report,
      activeBranch: 'main', // Standard release branch
      activeUser,
      baseCurrency,
      environmentMode: AppStartupManager.getEnvironmentMode(),
    };
  }
}
