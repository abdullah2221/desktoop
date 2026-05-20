import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export class BackupService {
  static backup(): string {
    let dbDir = '';
    
    try {
      const isDev = !app.isPackaged;
      dbDir = isDev 
        ? path.join(app.getAppPath(), 'database') 
        : path.join(app.getPath('userData'), 'database');
    } catch {
      // Fallback for standard Node/Vitest test runs
      dbDir = path.join(__dirname, '../../../database');
    }

    const srcPath = path.join(dbDir, 'test.db');
    const actualSrcPath = fs.existsSync(srcPath) ? srcPath : path.join(dbDir, 'erp.db');

    if (!fs.existsSync(actualSrcPath)) {
      throw new Error(`Active SQLite database file not found at: ${actualSrcPath}`);
    }

    const backupDir = path.join(dbDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destPath = path.join(backupDir, `erp.backup.${timestamp}.db`);

    fs.copyFileSync(actualSrcPath, destPath);
    console.log(`[Backup Service] Database backup successfully written to: ${destPath}`);
    return destPath;
  }
}
