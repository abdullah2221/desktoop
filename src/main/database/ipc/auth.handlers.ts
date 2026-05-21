import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { UserRepository } from '../repositories/UserRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', (_, username: string, password: string) => AuthRepository.login(username, password));
  ipcMain.handle('auth:logout', (_, token: string) => AuthRepository.logout(token));
  ipcMain.handle('auth:getCurrentUser', (_, token: string) => AuthRepository.getCurrentUser(token));
  ipcMain.handle('auth:hasPermission', (_, token: string, permission: string) => AuthRepository.hasPermission(token, permission));

  ipcMain.handle('users:getAll', (_, token: string) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return UserRepository.getAll();
  });
  ipcMain.handle('users:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return UserRepository.create(payload, actorId(token));
  });
  ipcMain.handle('users:update', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return UserRepository.update(payload, actorId(token));
  });
  ipcMain.handle('users:deactivate', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return UserRepository.deactivate(id, actorId(token));
  });
  ipcMain.handle('users:resetPassword', (_, token: string, id: string, password: string) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return UserRepository.resetPassword(id, password, actorId(token));
  });

  ipcMain.handle('roles:getAll', (_, token: string) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return RoleRepository.getAll();
  });
  ipcMain.handle('roles:getPermissions', (_, token: string) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return RoleRepository.getPermissions();
  });
  ipcMain.handle('roles:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return RoleRepository.create(payload, actorId(token));
  });
  ipcMain.handle('roles:update', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'users.manage');
    return RoleRepository.update(payload, actorId(token));
  });
}
