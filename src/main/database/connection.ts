import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database;
let activeDbPath = '';

/**
 * Resolves the database directory and file path based on execution context:
 * - Test (Vitest):   <projectRoot>/database/test.db
 * - Development:     <appPath>/database/erp.db
 * - Production:      <userData>/db/erp.db  (platform-safe, never inside ASAR)
 */
function resolveDatabasePath() {
  const isTest = typeof process !== 'undefined' && process.env.VITEST;
  if (isTest) {
    const testDir = path.join(__dirname, '../../../database');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    return path.join(testDir, 'test.db');
  }

  let dbDir: string;
  try {
    if (!app.isPackaged) {
      // Development: use project-local database/ folder
      dbDir = path.join(app.getAppPath(), 'database');
    } else {
      // Production: use userData/db/ — safe outside ASAR, per-user, per-platform
      dbDir = path.join(app.getPath('userData'), 'db');
    }
  } catch {
    // Fallback if Electron app context is not yet ready
    dbDir = path.join(__dirname, '../../../database');
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'erp.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = resolveDatabasePath();
    activeDbPath = dbPath;
    const runtimeLabel = process.versions.electron ? 'Electron' : 'Node';

    console.log(`[SQLite Runtime] Using ${runtimeLabel} SQLite runtime`);
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
