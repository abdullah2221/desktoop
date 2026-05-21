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
exports.getDatabase = getDatabase;
exports.getDatabasePath = getDatabasePath;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let db;
let activeDbPath = '';
function resolveDatabasePath() {
    let dbDir = '';
    try {
        const isDev = !electron_1.app.isPackaged;
        dbDir = isDev
            ? path.join(electron_1.app.getAppPath(), 'database')
            : path.join(electron_1.app.getPath('userData'), 'database');
    }
    catch {
        dbDir = path.join(__dirname, '../../../database');
    }
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const isTestRuntime = typeof process !== 'undefined' && process.env.VITEST;
    return path.join(dbDir, isTestRuntime ? 'test.db' : 'erp.db');
}
function getDatabase() {
    if (!db) {
        const dbPath = resolveDatabasePath();
        activeDbPath = dbPath;
        console.log(`[Database Connection] Connecting SQLite: ${dbPath}`);
        db = new better_sqlite3_1.default(dbPath);
        // Enable WAL mode (Write-Ahead Logging) and foreign key constraints
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}
function getDatabasePath() {
    return activeDbPath || resolveDatabasePath();
}
function closeDatabase() {
    if (db) {
        db.close();
        db = undefined;
    }
}
