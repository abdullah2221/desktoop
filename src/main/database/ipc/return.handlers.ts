import { ipcMain } from 'electron';
import { SalesReturnRepository } from '../repositories/SalesReturnRepository';
import { PurchaseReturnRepository } from '../repositories/PurchaseReturnRepository';

export function registerReturnHandlers() {
  // Sales Returns
  ipcMain.handle('returns:getSalesHistory', () => {
    return SalesReturnRepository.getHistory();
  });

  ipcMain.handle('returns:getSalesReturnById', (_, id: string) => {
    return SalesReturnRepository.getReturnById(id);
  });

  ipcMain.handle('returns:getSalesReturnsBySale', (_, invoiceNo: string) => {
    return SalesReturnRepository.getBySale(invoiceNo);
  });

  ipcMain.handle('returns:createSalesReturn', (_, payload: any) => {
    return SalesReturnRepository.create(payload);
  });

  // Purchase Returns
  ipcMain.handle('returns:getPurchaseHistory', () => {
    return PurchaseReturnRepository.getHistory();
  });

  ipcMain.handle('returns:getPurchaseReturnById', (_, id: string) => {
    return PurchaseReturnRepository.getReturnById(id);
  });

  ipcMain.handle('returns:getPurchaseReturnsByPurchase', (_, purchaseId: string) => {
    return PurchaseReturnRepository.getByPurchase(purchaseId);
  });

  ipcMain.handle('returns:createPurchaseReturn', (_, payload: any) => {
    return PurchaseReturnRepository.create(payload);
  });
}
