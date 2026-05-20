"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemHandlers = registerSystemHandlers;
const electron_1 = require("electron");
const backup_1 = require("../backup");
const inspector_1 = require("../inspector");
function registerSystemHandlers() {
    // Database backup IPC handler
    electron_1.ipcMain.handle('system:backup', () => {
        try {
            return backup_1.BackupService.backup();
        }
        catch (err) {
            console.error('[System Handler] Failed to execute database backup:', err);
            throw err;
        }
    });
    // Database stats inspector IPC handler
    electron_1.ipcMain.handle('system:getStats', () => {
        try {
            return inspector_1.DatabaseInspector.getStats();
        }
        catch (err) {
            console.error('[System Handler] Failed to get database stats:', err);
            throw err;
        }
    });
}
