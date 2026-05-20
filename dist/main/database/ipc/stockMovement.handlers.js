"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStockMovementHandlers = registerStockMovementHandlers;
const electron_1 = require("electron");
const StockMovementRepository_1 = require("../repositories/StockMovementRepository");
function registerStockMovementHandlers() {
    electron_1.ipcMain.handle('stockMovements:getByProduct', (_, productId) => {
        return StockMovementRepository_1.StockMovementRepository.getByProduct(productId);
    });
}
