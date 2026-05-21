import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database;
let activeDbPath = '';

function resolveDatabasePath() {
  let dbDir = '';
  try {
    const isDev = !app.isPackaged;
    dbDir = isDev
      ? path.join(app.getAppPath(), 'database')
      : path.join(app.getPath('userData'), 'database');
  } catch {
    dbDir = path.join(__dirname, '../../../database');
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const isTestRuntime = typeof process !== 'undefined' && process.env.VITEST;
  return path.join(dbDir, isTestRuntime ? 'test.db' : 'erp.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = resolveDatabasePath();
    activeDbPath = dbPath;

    console.log(`[Database Connection] Connecting SQLite: ${dbPath}`);
    db = new Database(dbPath);
    
    // Enable WAL mode (Write-Ahead Logging) and foreign key constraints
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function getDatabasePath() {
  return activeDbPath || resolveDatabasePath();
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}
