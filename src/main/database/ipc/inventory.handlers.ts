import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { BranchInventoryRepository } from '../repositories/BranchInventoryRepository';
import { InventoryAdjustmentRepository } from '../repositories/InventoryAdjustmentRepository';
import { StockTransferRepository } from '../repositories/StockTransferRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireAny(token: string, permissions: string[]) {
  if (!permissions.some((permission) => AuthRepository.hasPermission(token, permission))) {
    throw new Error(`Unauthorized: one of ${permissions.join(', ')} is required.`);
  }
}

function requireBranch(token: string, branchId?: string) {
  if (branchId) AuthRepository.requireBranchAccess(token, branchId);
}

export function registerInventoryHandlers() {
  ipcMain.handle('branchInventory:getAll', (_, token: string, branchId?: string) => {
    requireAny(token, ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust']);
    requireBranch(token, branchId);
    return BranchInventoryRepository.getBranchStock(branchId);
  });
  ipcMain.handle('branchInventory:upsert', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'inventory.adjust');
    requireBranch(token, payload?.branch_id);
    return BranchInventoryRepository.upsert(payload);
  });
  ipcMain.handle('branchInventory:lowStock', (_, token: string, branchId?: string) => {
    requireAny(token, ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust']);
    requireBranch(token, branchId);
    return BranchInventoryRepository.lowStock(branchId);
  });
  ipcMain.handle('branchInventory:valuation', (_, token: string, branchId?: string) => {
    requireAny(token, ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust']);
    requireBranch(token, branchId);
    return BranchInventoryRepository.valuation(branchId);
  });
  ipcMain.handle('branchInventory:getByProduct', (_, token: string, productId: string) => {
    requireAny(token, ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust']);
    return BranchInventoryRepository.getByProduct(productId);
  });
  ipcMain.handle('branchInventory:getStockCard', (_, token: string, productId: string, branchId?: string) => {
    requireAny(token, ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust']);
    requireBranch(token, branchId);
    return BranchInventoryRepository.getStockCard(productId, branchId);
  });

  ipcMain.handle('stockTransfers:getAll', (_, token: string) => {
    requireAny(token, ['inventory.transfer', 'inventory.view.branch']);
    return StockTransferRepository.getAll();
  });
  ipcMain.handle('stockTransfers:getById', (_, token: string, id: string) => {
    requireAny(token, ['inventory.transfer', 'inventory.view.branch']);
    return StockTransferRepository.getById(id);
  });
  ipcMain.handle('stockTransfers:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'inventory.transfer');
    requireBranch(token, payload?.source_branch_id);
    requireBranch(token, payload?.destination_branch_id);
    return StockTransferRepository.create(payload, actorId(token));
  });
  ipcMain.handle('stockTransfers:approve', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.transfer');
    return StockTransferRepository.approve(id, actorId(token));
  });
  ipcMain.handle('stockTransfers:complete', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.transfer');
    return StockTransferRepository.complete(id, actorId(token));
  });
  ipcMain.handle('stockTransfers:markInTransit', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.transfer');
    return StockTransferRepository.markInTransit(id, actorId(token));
  });
  ipcMain.handle('stockTransfers:reject', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.transfer');
    return StockTransferRepository.reject(id, actorId(token));
  });

  ipcMain.handle('inventoryAdjustments:getAll', (_, token: string) => {
    requireAny(token, ['inventory.adjust', 'inventory.view.branch']);
    return InventoryAdjustmentRepository.getAll();
  });
  ipcMain.handle('inventoryAdjustments:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'inventory.adjust');
    requireBranch(token, payload?.branch_id);
    return InventoryAdjustmentRepository.create(payload, actorId(token));
  });
  ipcMain.handle('inventoryAdjustments:accountingFoundation', (_, token: string, adjustmentId: string) => {
    AuthRepository.requirePermission(token, 'inventory.adjust');
    return InventoryAdjustmentRepository.accountingFoundation(adjustmentId);
  });
  ipcMain.handle('inventoryAdjustments:getById', (_, token: string, adjustmentId: string) => {
    requireAny(token, ['inventory.adjust', 'inventory.view.branch']);
    return InventoryAdjustmentRepository.getById(adjustmentId);
  });
}
