"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInvoicePaymentHandlers = registerInvoicePaymentHandlers;
const electron_1 = require("electron");
const InvoicePaymentRepository_1 = require("../repositories/InvoicePaymentRepository");
function registerInvoicePaymentHandlers() {
    electron_1.ipcMain.handle('invoicePayments:getByInvoice', (_, invoiceId) => InvoicePaymentRepository_1.InvoicePaymentRepository.getByInvoice(invoiceId));
    electron_1.ipcMain.handle('invoicePayments:create', (_, payload) => InvoicePaymentRepository_1.InvoicePaymentRepository.create(payload));
}
