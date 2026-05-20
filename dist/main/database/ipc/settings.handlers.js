"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsHandlers = registerSettingsHandlers;
const electron_1 = require("electron");
const SettingsRepository_1 = require("../repositories/SettingsRepository");
function registerSettingsHandlers() {
    electron_1.ipcMain.handle('settings:get', () => {
        return SettingsRepository_1.SettingsRepository.get();
    });
    electron_1.ipcMain.handle('settings:update', (_, key, value) => {
        return SettingsRepository_1.SettingsRepository.update(key, value);
    });
}
