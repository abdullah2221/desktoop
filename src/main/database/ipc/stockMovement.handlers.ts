import { ipcMain } from 'electron';
import { StockMovementRepository } from '../repositories/StockMovementRepository';

export function registerStockMovementHandlers() {
  ipcMain.handle('stockMovements:getByProduct', (_, productId: string) => {
    return StockMovementRepository.getByProduct(productId);
  });
}
