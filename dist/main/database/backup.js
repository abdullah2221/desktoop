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
exports.BackupService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class BackupService {
    static backup() {
        let dbDir = '';
        try {
            const isDev = !electron_1.app.isPackaged;
            dbDir = isDev
                ? path.join(electron_1.app.getAppPath(), 'database')
                : path.join(electron_1.app.getPath('userData'), 'database');
        }
        catch {
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
exports.BackupService = BackupService;
