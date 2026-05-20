import { ipcMain } from 'electron';
import { SaleRepository } from '../repositories/SaleRepository';

export function registerSaleHandlers() {
  ipcMain.handle('sales:getAll', () => {
    return SaleRepository.getAll();
  });

  ipcMain.handle('sales:create', (_, sale: any) => {
    return SaleRepository.create(sale);
  });
}
