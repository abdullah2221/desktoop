import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { ClassRepository } from '../repositories/ClassRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireClassManage(token: string) {
  AuthRepository.requirePermission(token, 'branch.manage');
}

export function registerClassHandlers() {
  ipcMain.handle('classes:getAll', (_, token: string) => {
    AuthRepository.requirePermission(token, 'reports.view');
    return ClassRepository.getAll();
  });
  ipcMain.handle('classes:create', (_, token: string, payload: any) => {
    requireClassManage(token);
    return ClassRepository.create(payload, actorId(token));
  });
  ipcMain.handle('classes:update', (_, token: string, payload: any) => {
    requireClassManage(token);
    return ClassRepository.update(payload, actorId(token));
  });
  ipcMain.handle('classes:deactivate', (_, token: string, id: string) => {
    requireClassManage(token);
    return ClassRepository.deactivate(id, actorId(token));
  });
}
