"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaxHandlers = registerTaxHandlers;
const electron_1 = require("electron");
const TaxCalculationService_1 = require("../repositories/TaxCalculationService");
const TaxRepository_1 = require("../repositories/TaxRepository");
function registerTaxHandlers() {
    electron_1.ipcMain.handle('taxes:getRates', () => TaxRepository_1.TaxRepository.getRates());
    electron_1.ipcMain.handle('taxes:createRate', (_, payload) => TaxRepository_1.TaxRepository.createRate(payload));
    electron_1.ipcMain.handle('taxes:updateRate', (_, payload) => TaxRepository_1.TaxRepository.updateRate(payload));
    electron_1.ipcMain.handle('taxes:deactivateRate', (_, id) => TaxRepository_1.TaxRepository.deactivateRate(id));
    electron_1.ipcMain.handle('taxes:getSettings', () => TaxRepository_1.TaxRepository.getSettings());
    electron_1.ipcMain.handle('taxes:updateSetting', (_, key, value) => TaxRepository_1.TaxRepository.updateSetting(key, value));
    electron_1.ipcMain.handle('taxes:calculate', (_, payload) => TaxCalculationService_1.TaxCalculationService.calculate(payload));
    electron_1.ipcMain.handle('taxes:getOutputReport', (_, dateFrom, dateTo) => TaxRepository_1.TaxRepository.getOutputTaxReport(dateFrom, dateTo));
    electron_1.ipcMain.handle('taxes:getInputReport', (_, dateFrom, dateTo) => TaxRepository_1.TaxRepository.getInputTaxReport(dateFrom, dateTo));
    electron_1.ipcMain.handle('taxes:getSummaryReport', (_, dateFrom, dateTo) => TaxRepository_1.TaxRepository.getTaxSummary(dateFrom, dateTo));
}
