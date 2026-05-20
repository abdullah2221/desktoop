"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSupplierPaymentHandlers = registerSupplierPaymentHandlers;
const electron_1 = require("electron");
const SupplierPaymentRepository_1 = require("../repositories/SupplierPaymentRepository");
function registerSupplierPaymentHandlers() {
    electron_1.ipcMain.handle('supplierPayments:getBySupplier', (_, supplierId) => {
        return SupplierPaymentRepository_1.SupplierPaymentRepository.getBySupplier(supplierId);
    });
    electron_1.ipcMain.handle('supplierPayments:create', (_, payload) => {
        return SupplierPaymentRepository_1.SupplierPaymentRepository.create(payload);
    });
}
