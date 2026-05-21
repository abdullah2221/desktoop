import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { ReportRepository } from '../repositories/ReportRepository';

export function registerReportHandlers() {
  const requireReports = (token: string) => AuthRepository.requirePermission(token, 'reports.view');

  ipcMain.handle('reports:profitAndLoss', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.profitAndLoss({ dateFrom, dateTo }); });
  ipcMain.handle('reports:balanceSheet', (_, token: string, dateTo: string) => { requireReports(token); return ReportRepository.balanceSheet(dateTo); });
  ipcMain.handle('reports:cashFlow', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.cashFlow({ dateFrom, dateTo }); });
  ipcMain.handle('reports:trialBalance', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.trialBalance({ dateFrom, dateTo }); });
  ipcMain.handle('reports:generalLedger', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.generalLedger({ dateFrom, dateTo }); });
  ipcMain.handle('reports:arAging', (_, token: string, dateTo: string) => { requireReports(token); return ReportRepository.arAging(dateTo); });
  ipcMain.handle('reports:apAging', (_, token: string, dateTo: string) => { requireReports(token); return ReportRepository.apAging(dateTo); });
  ipcMain.handle('reports:inventoryValuation', (_, token: string) => { requireReports(token); return ReportRepository.inventoryValuation(); });
  ipcMain.handle('reports:taxSummary', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.taxSummary({ dateFrom, dateTo }); });
  ipcMain.handle('reports:salesByCustomerProduct', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.salesByCustomerProduct({ dateFrom, dateTo }); });
  ipcMain.handle('reports:purchasesBySupplierProduct', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.purchasesBySupplierProduct({ dateFrom, dateTo }); });
  ipcMain.handle('reports:expenseSummary', (_, token: string, dateFrom: string, dateTo: string) => { requireReports(token); return ReportRepository.expenseSummary({ dateFrom, dateTo }); });
}
