import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { CurrencyRepository } from '../repositories/CurrencyRepository';
import { ExchangeRateRepository } from '../repositories/ExchangeRateRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireCurrencyManage(token: string) {
  AuthRepository.requirePermission(token, 'currency.manage');
}

export function registerCurrencyHandlers() {
  ipcMain.handle('currencies:getAll', (_, token: string) => {
    requireCurrencyManage(token);
    return CurrencyRepository.getAll();
  });
  ipcMain.handle('currencies:getBase', (_, token: string) => {
    requireCurrencyManage(token);
    return CurrencyRepository.getBaseCurrency();
  });
  ipcMain.handle('currencies:create', (_, token: string, payload: any) => {
    requireCurrencyManage(token);
    return CurrencyRepository.create(payload, actorId(token));
  });
  ipcMain.handle('currencies:update', (_, token: string, payload: any) => {
    requireCurrencyManage(token);
    return CurrencyRepository.update(payload, actorId(token));
  });
  ipcMain.handle('currencies:deactivate', (_, token: string, code: string) => {
    requireCurrencyManage(token);
    return CurrencyRepository.deactivate(code, actorId(token));
  });

  ipcMain.handle('exchangeRates:getAll', (_, token: string) => {
    requireCurrencyManage(token);
    return ExchangeRateRepository.getAll();
  });
  ipcMain.handle('exchangeRates:create', (_, token: string, payload: any) => {
    requireCurrencyManage(token);
    return ExchangeRateRepository.create(payload, actorId(token));
  });
  ipcMain.handle('exchangeRates:update', (_, token: string, payload: any) => {
    requireCurrencyManage(token);
    return ExchangeRateRepository.update(payload, actorId(token));
  });
  ipcMain.handle('exchangeRates:convert', (_, token: string, amount: number, fromCurrency: string, toCurrency?: string, effectiveDate?: string) => {
    requireCurrencyManage(token);
    return ExchangeRateRepository.convert(amount, fromCurrency, toCurrency, effectiveDate);
  });
  ipcMain.handle('exchangeRates:gainLossFoundation', (_, token: string, originalAmount: number, bookingRate: number, settlementRate: number) => {
    requireCurrencyManage(token);
    return ExchangeRateRepository.gainLossFoundation(originalAmount, bookingRate, settlementRate);
  });
}
