import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    let dbDir = '';
    let dbPath = '';

    try {
      // Active Electron runtime
      const isDev = !app.isPackaged;
      
      dbDir = isDev 
        ? path.join(app.getAppPath(), 'database') 
        : path.join(app.getPath('userData'), 'database');

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      dbPath = path.join(dbDir, 'erp.db');
    } catch {
      // Non-Electron unit test fallback (Vitest, standard Node environment)
      dbDir = path.join(__dirname, '../../../database');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      dbPath = path.join(dbDir, 'test.db');
    }

    console.log(`[Database Connection] Connecting SQLite: ${dbPath}`);
    db = new Database(dbPath);
    
    // Enable WAL mode (Write-Ahead Logging) and foreign key constraints
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
