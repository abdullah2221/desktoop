import { ipcMain } from 'electron';
import { PurchaseRepository } from '../repositories/PurchaseRepository';

export function registerPurchaseHandlers() {
  ipcMain.handle('purchases:getAll', () => {
    return PurchaseRepository.getAll();
  });

  ipcMain.handle('purchases:getById', (_, id: string) => {
    return PurchaseRepository.getById(id);
  });

  ipcMain.handle('purchases:create', (_, purchase: any) => {
    return PurchaseRepository.create(purchase);
  });
}
