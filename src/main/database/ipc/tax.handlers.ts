import { ipcMain } from 'electron';
import { TaxCalculationService } from '../repositories/TaxCalculationService';
import { TaxRepository } from '../repositories/TaxRepository';

export function registerTaxHandlers() {
  ipcMain.handle('taxes:getRates', () => TaxRepository.getRates());
  ipcMain.handle('taxes:createRate', (_, payload) => TaxRepository.createRate(payload));
  ipcMain.handle('taxes:updateRate', (_, payload) => TaxRepository.updateRate(payload));
  ipcMain.handle('taxes:deactivateRate', (_, id: string) => TaxRepository.deactivateRate(id));

  ipcMain.handle('taxes:getSettings', () => TaxRepository.getSettings());
  ipcMain.handle('taxes:updateSetting', (_, key: string, value: string) => TaxRepository.updateSetting(key, value));

  ipcMain.handle('taxes:calculate', (_, payload) => TaxCalculationService.calculate(payload));

  ipcMain.handle('taxes:getOutputReport', (_, dateFrom: string, dateTo: string) => TaxRepository.getOutputTaxReport(dateFrom, dateTo));
  ipcMain.handle('taxes:getInputReport', (_, dateFrom: string, dateTo: string) => TaxRepository.getInputTaxReport(dateFrom, dateTo));
  ipcMain.handle('taxes:getSummaryReport', (_, dateFrom: string, dateTo: string) => TaxRepository.getTaxSummary(dateFrom, dateTo));
}
