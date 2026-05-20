"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSaleHandlers = registerSaleHandlers;
const electron_1 = require("electron");
const SaleRepository_1 = require("../repositories/SaleRepository");
function registerSaleHandlers() {
    electron_1.ipcMain.handle('sales:getAll', () => {
        return SaleRepository_1.SaleRepository.getAll();
    });
    electron_1.ipcMain.handle('sales:create', (_, sale) => {
        return SaleRepository_1.SaleRepository.create(sale);
    });
}
