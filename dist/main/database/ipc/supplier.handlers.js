"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSupplierHandlers = registerSupplierHandlers;
const electron_1 = require("electron");
const SupplierRepository_1 = require("../repositories/SupplierRepository");
function registerSupplierHandlers() {
    console.log('[IPC Registration] Registering supplier handlers...');
    electron_1.ipcMain.handle('suppliers:getAll', () => {
        return SupplierRepository_1.SupplierRepository.getAll();
    });
    electron_1.ipcMain.handle('suppliers:getById', (_, id) => {
        return SupplierRepository_1.SupplierRepository.getById(id);
    });
    electron_1.ipcMain.handle('suppliers:create', (_, supplier) => {
        try {
            return SupplierRepository_1.SupplierRepository.create(supplier);
        }
        catch (err) {
            console.error('[IPC Handler] suppliers:create database operation failed:', err.message || err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('suppliers:update', (_, supplier) => {
        return SupplierRepository_1.SupplierRepository.update(supplier);
    });
    electron_1.ipcMain.handle('suppliers:deactivate', (_, id) => {
        return SupplierRepository_1.SupplierRepository.deactivate(id);
    });
    electron_1.ipcMain.handle('suppliers:getLedger', (_, supplierId) => {
        return SupplierRepository_1.SupplierRepository.getLedger(supplierId);
    });
    console.log('[IPC Registration] Supplier handlers registered successfully.');
}
