"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBackupHandlers = registerBackupHandlers;
const electron_1 = require("electron");
const AuthRepository_1 = require("../repositories/AuthRepository");
const BackupRepository_1 = require("../repositories/BackupRepository");
function requireBackupAccess(token) {
    const user = AuthRepository_1.AuthRepository.getCurrentUser(token);
    const allowed = Boolean(user?.permissions.includes('backup.manage') ||
        user?.permissions.includes('settings.edit') ||
        user?.permissions.includes('ENTERPRISE_FULL'));
    if (!allowed)
        throw new Error('Unauthorized: backup.manage or settings.edit permission is required.');
    return user;
}
function registerBackupHandlers() {
    electron_1.ipcMain.handle('backup:create', (_, token) => {
        const user = requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.create('manual', user?.id);
    });
    electron_1.ipcMain.handle('backup:list', (_, token) => {
        requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.list();
    });
    electron_1.ipcMain.handle('backup:restore', (_, token, filePath) => {
        const user = requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.restore(filePath, user?.id);
    });
    electron_1.ipcMain.handle('backup:validate', (_, token, filePath) => {
        requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.validate(filePath);
    });
    electron_1.ipcMain.handle('backup:integrityCheck', (_, token) => {
        requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.integrityCheck();
    });
    electron_1.ipcMain.handle('backup:getSettings', (_, token) => {
        requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.getSettings();
    });
    electron_1.ipcMain.handle('backup:updateSettings', (_, token, settings) => {
        requireBackupAccess(token);
        return BackupRepository_1.BackupRepository.updateSettings(settings);
    });
}
