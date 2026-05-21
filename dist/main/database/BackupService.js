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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const connection_1 = require("./connection");
class BackupService {
    static getBackupDirectory() {
        const dbPath = (0, connection_1.getDatabasePath)();
        const backupDir = path.join(path.dirname(dbPath), 'backups');
        if (!fs.existsSync(backupDir))
            fs.mkdirSync(backupDir, { recursive: true });
        return backupDir;
    }
    static createBackupFile(prefix = 'erp.backup') {
        const db = (0, connection_1.getDatabase)();
        db.pragma('wal_checkpoint(TRUNCATE)');
        const srcPath = (0, connection_1.getDatabasePath)();
        if (!fs.existsSync(srcPath)) {
            throw new Error(`Active SQLite database file not found at: ${srcPath}`);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const suffix = Math.floor(Math.random() * 10000);
        const destPath = path.join(this.getBackupDirectory(), `${prefix}.${timestamp}.${suffix}.db`);
        fs.copyFileSync(srcPath, destPath);
        return destPath;
    }
    static validateBackup(filePath) {
        if (!filePath || !fs.existsSync(filePath)) {
            return { valid: false, integrity: 'missing', foreignKeyIssues: 0, fileSize: 0, message: 'Backup file does not exist.' };
        }
        let backupDb = null;
        try {
            backupDb = new better_sqlite3_1.default(filePath, { readonly: true, fileMustExist: true });
            const integrity = backupDb.pragma('integrity_check', { simple: true });
            const foreignRows = backupDb.pragma('foreign_key_check');
            const requiredTables = backupDb.prepare(`
        SELECT COUNT(*) as count
        FROM sqlite_master
        WHERE type='table' AND name IN ('products', 'customers', 'users', 'roles', 'settings')
      `).get();
            const fileSize = fs.statSync(filePath).size;
            const valid = integrity === 'ok' && foreignRows.length === 0 && requiredTables.count >= 5;
            return {
                valid,
                integrity,
                foreignKeyIssues: foreignRows.length,
                fileSize,
                message: valid ? 'Backup validation passed.' : 'Backup failed integrity, foreign key, or schema validation.'
            };
        }
        catch (error) {
            return { valid: false, integrity: 'error', foreignKeyIssues: 0, fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0, message: error.message || 'Backup validation failed.' };
        }
        finally {
            backupDb?.close();
            for (const suffix of ['-wal', '-shm']) {
                const sidecar = `${filePath}${suffix}`;
                if (fs.existsSync(sidecar))
                    fs.unlinkSync(sidecar);
            }
        }
    }
    static restoreBackup(filePath) {
        const validation = this.validateBackup(filePath);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        const safetyBackupPath = this.createBackupFile('erp.pre-restore');
        const targetPath = (0, connection_1.getDatabasePath)();
        (0, connection_1.closeDatabase)();
        fs.copyFileSync(filePath, targetPath);
        for (const suffix of ['-wal', '-shm']) {
            const sidecar = `${targetPath}${suffix}`;
            if (fs.existsSync(sidecar))
                fs.unlinkSync(sidecar);
        }
        return {
            success: true,
            restored_from: filePath,
            safety_backup_path: safetyBackupPath,
            restart_required: true
        };
    }
    static getDatabaseSize() {
        const dbPath = (0, connection_1.getDatabasePath)();
        return fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    }
}
exports.BackupService = BackupService;
