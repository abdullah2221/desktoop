import { ipcMain } from 'electron';
import { DiscountRepository } from '../repositories/DiscountRepository';
import { PriceRuleRepository } from '../repositories/PriceRuleRepository';
import { DiscountCalculationService } from '../repositories/DiscountCalculationService';

export function registerDiscountHandlers() {
  // Discounts
  ipcMain.handle('discounts:getAll', () => {
    return DiscountRepository.getAll();
  });

  ipcMain.handle('discounts:create', (event, discount) => {
    return DiscountRepository.create(discount);
  });

  ipcMain.handle('discounts:update', (event, discount) => {
    return DiscountRepository.update(discount);
  });

  ipcMain.handle('discounts:deactivate', (event, id) => {
    return DiscountRepository.deactivate(id);
  });

  ipcMain.handle('discounts:getActiveDiscounts', (event, dateStr) => {
    return DiscountRepository.getActiveDiscounts(dateStr);
  });

  // Price Rules
  ipcMain.handle('priceRules:getAll', () => {
    return PriceRuleRepository.getAll();
  });

  ipcMain.handle('priceRules:create', (event, rule) => {
    return PriceRuleRepository.create(rule);
  });

  ipcMain.handle('priceRules:update', (event, rule) => {
    return PriceRuleRepository.update(rule);
  });

  ipcMain.handle('priceRules:deactivate', (event, id) => {
    return PriceRuleRepository.deactivate(id);
  });

  ipcMain.handle('priceRules:getActiveRules', (event, dateStr) => {
    return PriceRuleRepository.getActiveRules(dateStr);
  });

  ipcMain.handle('priceRules:getPromotionHistory', () => {
    return PriceRuleRepository.getPromotionHistory();
  });

  // Calculation Service Handlers
  ipcMain.handle('priceRules:calculateLineDiscounts', (event, items, context) => {
    return DiscountCalculationService.calculateLineDiscounts(items, context);
  });

  ipcMain.handle('priceRules:calculateInvoiceDiscount', (event, subtotal, discountType, discountValue) => {
    return DiscountCalculationService.calculateInvoiceDiscount(subtotal, discountType, discountValue);
  });
}
