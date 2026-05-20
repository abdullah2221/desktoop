"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProductHandlers = registerProductHandlers;
const electron_1 = require("electron");
const ProductRepository_1 = require("../repositories/ProductRepository");
function registerProductHandlers() {
    electron_1.ipcMain.handle('products:getAll', () => {
        return ProductRepository_1.ProductRepository.getAll();
    });
    electron_1.ipcMain.handle('products:getById', (_, id) => {
        return ProductRepository_1.ProductRepository.getById(id);
    });
    electron_1.ipcMain.handle('products:getLowStock', () => {
        return ProductRepository_1.ProductRepository.getLowStock();
    });
    electron_1.ipcMain.handle('products:create', (_, product) => {
        console.log('[IPC Handler] products:create channel triggered with product payload:', product);
        try {
            const result = ProductRepository_1.ProductRepository.create(product);
            return result;
        }
        catch (err) {
            console.error('[IPC Handler] products:create database operation failed:', err.message || err);
            throw err;
        }
    });
    electron_1.ipcMain.handle('products:update', (_, product) => {
        return ProductRepository_1.ProductRepository.update(product);
    });
    electron_1.ipcMain.handle('products:deactivate', (_, id) => {
        return ProductRepository_1.ProductRepository.deactivate(id);
    });
    electron_1.ipcMain.handle('products:updateStock', (_, id, newStock) => {
        return ProductRepository_1.ProductRepository.updateStock(id, newStock);
    });
}
