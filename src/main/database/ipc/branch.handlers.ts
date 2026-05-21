import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { BranchRepository } from '../repositories/BranchRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireBranchManage(token: string) {
  AuthRepository.requirePermission(token, 'branch.manage');
}

export function registerBranchHandlers() {
  ipcMain.handle('branches:getAll', (_, token: string) => {
    requireBranchManage(token);
    return BranchRepository.getAll();
  });
  ipcMain.handle('branches:getAccessible', (_, token: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized: active session required.');
    return BranchRepository.getAccessibleForUser(user.id);
  });
  ipcMain.handle('branches:create', (_, token: string, payload: any) => {
    requireBranchManage(token);
    return BranchRepository.create(payload, actorId(token));
  });
  ipcMain.handle('branches:update', (_, token: string, payload: any) => {
    requireBranchManage(token);
    return BranchRepository.update(payload, actorId(token));
  });
  ipcMain.handle('branches:deactivate', (_, token: string, id: string) => {
    requireBranchManage(token);
    return BranchRepository.deactivate(id, actorId(token));
  });
  ipcMain.handle('branches:setDefault', (_, token: string, id: string) => {
    requireBranchManage(token);
    return BranchRepository.setDefault(id);
  });
  ipcMain.handle('branches:assignUserBranches', (_, token: string, userId: string, branchIds: string[], defaultBranchId?: string) => {
    requireBranchManage(token);
    return BranchRepository.assignUserBranches(userId, branchIds, defaultBranchId);
  });
}
