import { app, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';
import { getDatabase, getDatabasePath } from './database/connection';
import { runMigrations } from './database/migrations';
import { BackupService } from './database/backup';

export interface DiagnosticsReport {
  sqliteOk: boolean;
  backupDirOk: boolean;
  logsDirOk: boolean;
  freeSpaceOk: boolean;
  integrityStatus: string;
}

export class AppStartupManager {
  private static isInitialized = false;

  static async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    // 1. Register global exception handlers first
    this.registerGlobalErrorHandlers();

    logger.info('STARTUP', 'Initializing enterprise ERP application packaging flow...');
    logger.info('STARTUP', `Execution Environment: ${this.getEnvironmentMode()}`);

    try {
      // 2. Validate folders
      this.ensureRequiredDirectories();

      // 3. Initialize Database and run migrations with safety transaction
      logger.info('STARTUP', 'Bootstrapping SQLite connection and WAL validation...');
      const db = getDatabase();

      // Verify WAL mode
      const journalMode = db.pragma('journal_mode');
      logger.info('STARTUP', `SQLite Journal Mode configured: ${journalMode}`);

      // Perform a quick integrity check
      const integrity = db.pragma('integrity_check');
      logger.info('STARTUP', `SQLite Database Integrity Status: ${JSON.stringify(integrity)}`);

      // Run backup before migrations if required
      try {
        const backupBeforeMigration = db.prepare(
          "SELECT value FROM backup_settings WHERE key = 'backup_before_migrations'"
        ).get() as { value: string } | undefined;

        if (backupBeforeMigration?.value === 'true' && fs.existsSync(getDatabasePath())) {
          logger.info('STARTUP', 'Auto backup triggered before database migration execution...');
          BackupService.backup();
        }
      } catch (err) {
        logger.warn('STARTUP', 'Could not run pre-migration auto backup (tables may not exist yet).', err);
      }

      // Execute migrations safely
      logger.info('STARTUP', 'Executing database migrations...');
      runMigrations();
      logger.info('STARTUP', 'Database migration phase executed successfully.');

      this.isInitialized = true;
      return true;
    } catch (err) {
      logger.error('STARTUP', 'Fatal application bootstrap failure occurred!', err);
      this.handleFatalStartupError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  private static registerGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      logger.error('GENERAL', 'Uncaught Exception in Main Process', error);
      dialog.showErrorBox(
        'Critical Error',
        `A fatal unhandled exception occurred:\n${error.message}\n\nPlease contact IT support or reinstall the application.`
      );
      app.quit();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('GENERAL', 'Unhandled Rejection in Main Process', { reason, promise });
    });
  }

  private static ensureRequiredDirectories() {
    const isDev = !app.isPackaged;
    const baseDir = isDev ? app.getAppPath() : app.getPath('userData');

    // Production uses userData/db/, dev uses <project>/database/
    const dbDir = isDev ? path.join(baseDir, 'database') : path.join(baseDir, 'db');
    const backupDir = path.join(isDev ? path.join(baseDir, 'database') : baseDir, 'backups');
    const logsDir = path.join(baseDir, 'logs');

    const dirsToCreate = [dbDir, backupDir, logsDir];
    for (const dir of dirsToCreate) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info('STARTUP', `Created required directory: ${dir}`);
      }
    }

    logger.info('STARTUP', `[Path] DB dir:      ${dbDir}`);
    logger.info('STARTUP', `[Path] Backups dir: ${backupDir}`);
    logger.info('STARTUP', `[Path] Logs dir:    ${logsDir}`);
  }


  private static handleFatalStartupError(error: Error) {
    dialog.showErrorBox(
      'Database & Migration Error',
      `Failed to initialize application database:\n${error.message}\n\nThe application will close now. Please check if you have write permissions to your appdata directory.`
    );
    app.exit(1);
  }

  static getEnvironmentMode(): 'development' | 'staging' | 'production' {
    if (!app.isPackaged) {
      return 'development';
    }
    if (process.env.ERP_ENV === 'staging') {
      return 'staging';
    }
    return 'production';
  }

  static runDiagnostics(): DiagnosticsReport {
    let sqliteOk = false;
    let integrityStatus = 'Unknown';
    try {
      const db = getDatabase();
      const check = db.pragma('integrity_check') as string[];
      sqliteOk = check.includes('ok');
      integrityStatus = check.join(', ');
    } catch (err) {
      integrityStatus = err instanceof Error ? err.message : String(err);
    }

    const isDev = !app.isPackaged;
    const baseDir = isDev ? app.getAppPath() : app.getPath('userData');
    
    const backupDirOk = fs.existsSync(path.join(baseDir, 'backups'));
    const logsDirOk = fs.existsSync(path.join(baseDir, 'logs'));

    return {
      sqliteOk,
      backupDirOk,
      logsDirOk,
      freeSpaceOk: true, // Placeholder for node disk check
      integrityStatus,
    };
  }
}
