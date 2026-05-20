"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseHandlers = registerPurchaseHandlers;
const electron_1 = require("electron");
const PurchaseRepository_1 = require("../repositories/PurchaseRepository");
function registerPurchaseHandlers() {
    electron_1.ipcMain.handle('purchases:getAll', () => {
        return PurchaseRepository_1.PurchaseRepository.getAll();
    });
    electron_1.ipcMain.handle('purchases:getById', (_, id) => {
        return PurchaseRepository_1.PurchaseRepository.getById(id);
    });
    electron_1.ipcMain.handle('purchases:create', (_, purchase) => {
        return PurchaseRepository_1.PurchaseRepository.create(purchase);
    });
}
