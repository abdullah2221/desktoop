import Database from 'better-sqlite3';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { closeDatabase, getDatabase, getDatabasePath } from './connection';
import { BackupEncryptionService } from './BackupEncryptionService';
import { BackupManifest, BackupManifestService } from './BackupManifestService';
import { BackupIntegrityService } from './BackupIntegrityService';

export interface BackupValidationResult {
  valid: boolean;
  integrity: string;
  foreignKeyIssues: number;
  fileSize: number;
  message: string;
  manifest?: BackupManifest;
  encrypted?: boolean;
  requiresPassword?: boolean;
}

interface BackupEnvelope {
  format: 'ERPBACKUP_V1';
  encrypted: boolean;
  manifest?: BackupManifest;
  payload_base64?: string;
  encryption?: { salt: string; iv: string; tag: string; ciphertext: string };
  manifest_preview?: Partial<BackupManifest>;
}

export class BackupService {
  private static validateLegacySqliteBackup(filePath: string): BackupValidationResult {
    const checkDb = new Database(filePath, { readonly: true, fileMustExist: true });
    try {
      const integrity = checkDb.pragma('integrity_check', { simple: true }) as string;
      const foreignRows = checkDb.pragma('foreign_key_check') as unknown[];
      return {
        valid: integrity === 'ok',
        integrity,
        foreignKeyIssues: foreignRows.length,
        fileSize: fs.statSync(filePath).size,
        message: integrity === 'ok' ? 'Backup validation passed.' : 'Integrity check failed.'
      };
    } finally {
      checkDb.close();
    }
  }

  static getBackupDirectory() {
    let backupDir: string;
    try {
      if (!app.isPackaged) {
        backupDir = path.join(app.getAppPath(), 'database', 'backups');
      } else {
        backupDir = path.join(app.getPath('userData'), 'backups');
      }
    } catch {
      const dbPath = getDatabasePath();
      backupDir = path.join(path.dirname(dbPath), 'backups');
    }
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  }

  static createBackupFile(prefix = 'erp.backup') {
    const db = getDatabase();
    db.pragma('wal_checkpoint(TRUNCATE)');

    const srcPath = getDatabasePath();
    if (!fs.existsSync(srcPath)) throw new Error(`Active SQLite database file not found at: ${srcPath}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = Math.floor(Math.random() * 10000);
    const destPath = path.join(this.getBackupDirectory(), `${prefix}.${timestamp}.${suffix}.db`);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  }

  static createBackup(options: {
    backupType?: 'full' | 'data_only' | 'settings' | 'master_data' | 'accounting';
    destinationDir?: string;
    password?: string;
    createdBy?: string;
    notes?: string;
    appVersion?: string;
    storeName?: string;
  } = {}) {
    const db = getDatabase();
    db.pragma('wal_checkpoint(TRUNCATE)');
    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) throw new Error('Database file not found.');
    const dbBuffer = fs.readFileSync(dbPath);
    const checksum = BackupIntegrityService.sha256(dbBuffer);

    const readonlyDb = new Database(dbPath, { readonly: true, fileMustExist: true });
    const integrity = readonlyDb.pragma('integrity_check', { simple: true }) as string;
    const tables = readonlyDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get() as { count: number };
    readonlyDb.close();

    const manifest = BackupManifestService.create({
      app_version: options.appVersion || (app as any)?.getVersion?.() || 'unknown',
      created_by: options.createdBy,
      store_name: options.storeName,
      backup_type: options.backupType || 'full',
      encrypted: Boolean(options.password),
      database_size: dbBuffer.length,
      checksum_sha256: checksum,
      integrity_status: integrity,
      tables_count: tables.count,
      notes: options.notes
    });

    const payload = Buffer.from(JSON.stringify({ manifest, db_base64: dbBuffer.toString('base64') }), 'utf-8');
    const compressed = zlib.gzipSync(payload);

    const envelope: BackupEnvelope = { format: 'ERPBACKUP_V1', encrypted: Boolean(options.password) };
    if (options.password) {
      envelope.encryption = BackupEncryptionService.encrypt(compressed, options.password);
      envelope.manifest_preview = {
        backup_version: manifest.backup_version,
        app_version: manifest.app_version,
        created_at: manifest.created_at,
        created_by: manifest.created_by,
        store_name: manifest.store_name,
        backup_type: manifest.backup_type,
        encrypted: true,
        database_size: manifest.database_size,
        integrity_status: manifest.integrity_status,
        tables_count: manifest.tables_count
      };
    } else {
      envelope.payload_base64 = compressed.toString('base64');
      envelope.manifest = manifest;
    }

    const targetDir = options.destinationDir && options.destinationDir.trim() ? options.destinationDir : this.getBackupDirectory();
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(targetDir, `store-${stamp}.erpbackup`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2));
    return { filePath, manifest };
  }

  private static readEnvelope(filePath: string): BackupEnvelope {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as BackupEnvelope;
    if (parsed.format !== 'ERPBACKUP_V1') throw new Error('Unsupported backup format.');
    return parsed;
  }

  private static unpackEnvelope(filePath: string, password?: string) {
    const envelope = this.readEnvelope(filePath);
    if (envelope.encrypted) {
      if (!password) {
        return { requiresPassword: true, manifest: envelope.manifest_preview as BackupManifest | undefined };
      }
      if (!envelope.encryption) throw new Error('Encrypted backup is missing encryption metadata.');
      const plain = BackupEncryptionService.decrypt(envelope.encryption, password);
      const json = JSON.parse(zlib.gunzipSync(plain).toString('utf-8')) as { manifest: BackupManifest; db_base64: string };
      return { requiresPassword: false, manifest: json.manifest, dbBuffer: Buffer.from(json.db_base64, 'base64') };
    }
    if (!envelope.payload_base64 || !envelope.manifest) throw new Error('Invalid backup payload.');
    const plain = zlib.gunzipSync(Buffer.from(envelope.payload_base64, 'base64'));
    const json = JSON.parse(plain.toString('utf-8')) as { manifest: BackupManifest; db_base64: string };
    return { requiresPassword: false, manifest: json.manifest, dbBuffer: Buffer.from(json.db_base64, 'base64') };
  }

  static validateBackup(filePath: string, password?: string): BackupValidationResult {
    if (!filePath || !fs.existsSync(filePath)) {
      return { valid: false, integrity: 'missing', foreignKeyIssues: 0, fileSize: 0, message: 'Backup file does not exist.' };
    }

    if (path.extname(filePath).toLowerCase() === '.db') {
      try {
        return this.validateLegacySqliteBackup(filePath);
      } catch (error: any) {
        return {
          valid: false,
          integrity: 'error',
          foreignKeyIssues: 0,
          fileSize: fs.statSync(filePath).size,
          message: error.message || 'Backup validation failed.'
        };
      }
    }

    try {
      const unpack = this.unpackEnvelope(filePath, password);
      if (unpack.requiresPassword) {
        return {
          valid: false,
          integrity: 'encrypted',
          foreignKeyIssues: 0,
          fileSize: fs.statSync(filePath).size,
          message: 'Password required for encrypted backup.',
          encrypted: true,
          requiresPassword: true,
          manifest: unpack.manifest
        };
      }

      const dbBuffer = unpack.dbBuffer as Buffer;
      const manifest = unpack.manifest as BackupManifest;
      const checksumOk = BackupIntegrityService.verifySha256(dbBuffer, manifest.checksum_sha256);
      if (!checksumOk) {
        return {
          valid: false,
          integrity: 'tampered',
          foreignKeyIssues: 0,
          fileSize: fs.statSync(filePath).size,
          message: 'Checksum mismatch. Backup may be tampered.',
          manifest,
          encrypted: manifest.encrypted
        };
      }

      const tempPath = path.join(this.getBackupDirectory(), `.validate-${Date.now()}.db`);
      fs.writeFileSync(tempPath, dbBuffer);
      const checkDb = new Database(tempPath, { readonly: true, fileMustExist: true });
      const integrity = checkDb.pragma('integrity_check', { simple: true }) as string;
      const foreignRows = checkDb.pragma('foreign_key_check') as unknown[];
      checkDb.close();
      fs.unlinkSync(tempPath);

      return {
        valid: integrity === 'ok',
        integrity,
        foreignKeyIssues: foreignRows.length,
        fileSize: fs.statSync(filePath).size,
        message: integrity === 'ok' ? 'Backup validation passed.' : 'Integrity check failed.',
        manifest,
        encrypted: manifest.encrypted
      };
    } catch (error: any) {
      return {
        valid: false,
        integrity: 'error',
        foreignKeyIssues: 0,
        fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
        message: error.message || 'Backup validation failed.'
      };
    }
  }

  static restoreBackup(filePath: string, password?: string) {
    const validation = this.validateBackup(filePath, password);
    if (!validation.valid) throw new Error(validation.message);

    const unpack = this.unpackEnvelope(filePath, password);
    if (unpack.requiresPassword || !unpack.dbBuffer) throw new Error('Password is required for restore.');

    const db = getDatabase();
    if ((db as any).inTransaction) {
      throw new Error('Cannot restore while a database transaction is active.');
    }

    const safetyBackupPath = this.createBackupFile('erp.pre-restore');
    const targetPath = getDatabasePath();
    closeDatabase();

    try {
      fs.writeFileSync(targetPath, unpack.dbBuffer);
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${targetPath}${suffix}`;
        if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
      }
      const post = this.validateBackup(filePath, password);
      if (!post.valid) throw new Error(post.message || 'Post-restore validation failed.');
      return {
        success: true,
        restored_from: filePath,
        safety_backup_path: safetyBackupPath,
        restart_required: true,
        manifest: unpack.manifest
      };
    } catch (error) {
      fs.copyFileSync(safetyBackupPath, targetPath);
      throw error;
    }
  }

  static getDatabaseSize() {
    const dbPath = getDatabasePath();
    return fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  }
}
