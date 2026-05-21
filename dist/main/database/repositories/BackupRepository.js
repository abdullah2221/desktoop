"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupRepository = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const connection_1 = require("../connection");
const BackupService_1 = require("../BackupService");
const AuditLogRepository_1 = require("./AuditLogRepository");
class BackupRepository {
    static create(type = 'manual', actorId) {
        const db = (0, connection_1.getDatabase)();
        const filePath = BackupService_1.BackupService.createBackupFile(type === 'manual' ? 'erp.backup' : `erp.${type}`);
        const validation = BackupService_1.BackupService.validateBackup(filePath);
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
        AuditLogRepository_1.AuditLogRepository.write({ action: 'BACKUP_CREATE', user_id: actorId, details: `Backup created: ${filePath}` });
        return { success: validation.valid, id, file_path: filePath, validation };
    }
    static list() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC, id DESC').all();
    }
    static validate(filePath) {
        return BackupService_1.BackupService.validateBackup(filePath);
    }
    static restore(filePath, actorId) {
        const result = BackupService_1.BackupService.restoreBackup(filePath);
        AuditLogRepository_1.AuditLogRepository.write({ action: 'BACKUP_RESTORE', user_id: actorId, details: `Restored from ${filePath}` });
        return result;
    }
    static integrityCheck() {
        const db = (0, connection_1.getDatabase)();
        const integrity = db.pragma('integrity_check', { simple: true });
        const foreignKeyRows = db.pragma('foreign_key_check');
        const lastBackup = db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC, id DESC LIMIT 1').get();
        return {
            integrity,
            foreignKeyIssues: foreignKeyRows.length,
            databaseSize: BackupService_1.BackupService.getDatabaseSize(),
            ok: integrity === 'ok' && foreignKeyRows.length === 0,
            lastBackup
        };
    }
    static getSettings() {
        const db = (0, connection_1.getDatabase)();
        const rows = db.prepare('SELECT key, value FROM backup_settings').all();
        return rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
    }
    static updateSetting(key, value) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare(`
      INSERT INTO backup_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `).run(key, value);
        return info.changes > 0;
    }
    static updateSettings(settings) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                this.updateSetting(key, String(value));
            }
            return this.getSettings();
        });
        return tx(settings);
    }
    static enforceRetention() {
        const db = (0, connection_1.getDatabase)();
        const settings = this.getSettings();
        const retention = Math.max(1, Number(settings.retention_count || 10));
        const rows = db.prepare(`
      SELECT id, file_path
      FROM backup_history
      WHERE status='success'
      ORDER BY created_at DESC, id DESC
    `).all();
        const expired = rows.slice(retention);
        for (const row of expired) {
            if (fs.existsSync(row.file_path))
                fs.unlinkSync(row.file_path);
            db.prepare("UPDATE backup_history SET status='pruned', notes='Removed by retention policy' WHERE id=?").run(row.id);
        }
        return { retained: Math.min(rows.length, retention), pruned: expired.length };
    }
}
exports.BackupRepository = BackupRepository;
