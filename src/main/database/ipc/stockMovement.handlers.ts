import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { StockMovementRepository } from '../repositories/StockMovementRepository';

export function registerStockMovementHandlers() {
  const canView = (token: string) => (
    AuthRepository.hasPermission(token, 'inventory.view.branch')
    || AuthRepository.hasPermission(token, 'inventory.transfer')
    || AuthRepository.hasPermission(token, 'inventory.adjust')
    || AuthRepository.hasPermission(token, 'inventory.product.edit')
  );

  ipcMain.handle('stockMovements:getByProduct', (_, token: string, productId: string) => {
    if (!canView(token)) throw new Error('Unauthorized');
    return StockMovementRepository.getByProduct(productId);
  });

  ipcMain.handle('stockMovements:getHistory', (_, token: string, filters?: any) => {
    if (!canView(token)) throw new Error('Unauthorized');
    const f = filters || {};
    if (f.branch_id) AuthRepository.requireBranchAccess(token, f.branch_id);
    return StockMovementRepository.getHistory(f);
  });
}
