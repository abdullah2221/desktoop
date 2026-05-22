import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { BudgetRepository } from '../repositories/BudgetRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireBudgetManage(token: string) {
  AuthRepository.requirePermission(token, 'budget.manage');
}

export function registerBudgetHandlers() {
  ipcMain.handle('budgets:getAll', (_, token: string) => {
    requireBudgetManage(token);
    return BudgetRepository.getAll();
  });
  ipcMain.handle('budgets:getById', (_, token: string, id: string) => {
    requireBudgetManage(token);
    return BudgetRepository.getById(id);
  });
  ipcMain.handle('budgets:create', (_, token: string, payload: any) => {
    requireBudgetManage(token);
    if (payload?.branch_id) AuthRepository.requireBranchAccess(token, payload.branch_id);
    return BudgetRepository.create(payload, actorId(token));
  });
  ipcMain.handle('budgets:update', (_, token: string, payload: any) => {
    requireBudgetManage(token);
    if (payload?.branch_id) AuthRepository.requireBranchAccess(token, payload.branch_id);
    return BudgetRepository.update(payload, actorId(token));
  });
  ipcMain.handle('budgets:deactivate', (_, token: string, id: string) => {
    requireBudgetManage(token);
    return BudgetRepository.deactivate(id, actorId(token));
  });
}
