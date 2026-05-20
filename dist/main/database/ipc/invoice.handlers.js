"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInvoiceHandlers = registerInvoiceHandlers;
const electron_1 = require("electron");
const InvoiceRepository_1 = require("../repositories/InvoiceRepository");
function registerInvoiceHandlers() {
    electron_1.ipcMain.handle('invoices:getAll', () => InvoiceRepository_1.InvoiceRepository.getAll());
    electron_1.ipcMain.handle('invoices:getById', (_, id) => InvoiceRepository_1.InvoiceRepository.getById(id));
    electron_1.ipcMain.handle('invoices:create', (_, payload) => InvoiceRepository_1.InvoiceRepository.create(payload));
    electron_1.ipcMain.handle('invoices:updateDraft', (_, payload) => InvoiceRepository_1.InvoiceRepository.updateDraft(payload));
    electron_1.ipcMain.handle('invoices:finalize', (_, id) => InvoiceRepository_1.InvoiceRepository.finalize(id));
    electron_1.ipcMain.handle('invoices:void', (_, id) => InvoiceRepository_1.InvoiceRepository.voidInvoice(id));
}
