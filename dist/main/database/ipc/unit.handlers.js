"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUnitHandlers = registerUnitHandlers;
const electron_1 = require("electron");
const UnitRepository_1 = require("../repositories/UnitRepository");
function registerUnitHandlers() {
    electron_1.ipcMain.handle('units:getAll', () => {
        return UnitRepository_1.UnitRepository.getAll();
    });
    electron_1.ipcMain.handle('units:create', (event, unit) => {
        return UnitRepository_1.UnitRepository.create(unit);
    });
    electron_1.ipcMain.handle('units:update', (event, unit) => {
        return UnitRepository_1.UnitRepository.update(unit);
    });
    electron_1.ipcMain.handle('units:deactivate', (event, id) => {
        return UnitRepository_1.UnitRepository.deactivate(id);
    });
}
