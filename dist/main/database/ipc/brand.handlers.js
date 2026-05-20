"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBrandHandlers = registerBrandHandlers;
const electron_1 = require("electron");
const BrandRepository_1 = require("../repositories/BrandRepository");
function registerBrandHandlers() {
    electron_1.ipcMain.handle('brands:getAll', () => {
        return BrandRepository_1.BrandRepository.getAll();
    });
    electron_1.ipcMain.handle('brands:create', (event, brand) => {
        return BrandRepository_1.BrandRepository.create(brand);
    });
    electron_1.ipcMain.handle('brands:update', (event, brand) => {
        return BrandRepository_1.BrandRepository.update(brand);
    });
    electron_1.ipcMain.handle('brands:deactivate', (event, id) => {
        return BrandRepository_1.BrandRepository.deactivate(id);
    });
}
