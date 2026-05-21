"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandlers = registerReportHandlers;
const electron_1 = require("electron");
const AuthRepository_1 = require("../repositories/AuthRepository");
const ReportRepository_1 = require("../repositories/ReportRepository");
function registerReportHandlers() {
    const requireReports = (token) => AuthRepository_1.AuthRepository.requirePermission(token, 'reports.view');
    electron_1.ipcMain.handle('reports:profitAndLoss', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.profitAndLoss({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:balanceSheet', (_, token, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.balanceSheet(dateTo); });
    electron_1.ipcMain.handle('reports:cashFlow', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.cashFlow({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:trialBalance', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.trialBalance({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:generalLedger', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.generalLedger({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:arAging', (_, token, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.arAging(dateTo); });
    electron_1.ipcMain.handle('reports:apAging', (_, token, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.apAging(dateTo); });
    electron_1.ipcMain.handle('reports:inventoryValuation', (_, token) => { requireReports(token); return ReportRepository_1.ReportRepository.inventoryValuation(); });
    electron_1.ipcMain.handle('reports:taxSummary', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.taxSummary({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:salesByCustomerProduct', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.salesByCustomerProduct({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:purchasesBySupplierProduct', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.purchasesBySupplierProduct({ dateFrom, dateTo }); });
    electron_1.ipcMain.handle('reports:expenseSummary', (_, token, dateFrom, dateTo) => { requireReports(token); return ReportRepository_1.ReportRepository.expenseSummary({ dateFrom, dateTo }); });
}
