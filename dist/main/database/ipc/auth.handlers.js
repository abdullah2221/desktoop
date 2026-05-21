"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthHandlers = registerAuthHandlers;
const electron_1 = require("electron");
const AuthRepository_1 = require("../repositories/AuthRepository");
const RoleRepository_1 = require("../repositories/RoleRepository");
const UserRepository_1 = require("../repositories/UserRepository");
function actorId(token) {
    return AuthRepository_1.AuthRepository.getCurrentUser(token)?.id;
}
function registerAuthHandlers() {
    electron_1.ipcMain.handle('auth:login', (_, username, password) => AuthRepository_1.AuthRepository.login(username, password));
    electron_1.ipcMain.handle('auth:logout', (_, token) => AuthRepository_1.AuthRepository.logout(token));
    electron_1.ipcMain.handle('auth:getCurrentUser', (_, token) => AuthRepository_1.AuthRepository.getCurrentUser(token));
    electron_1.ipcMain.handle('auth:hasPermission', (_, token, permission) => AuthRepository_1.AuthRepository.hasPermission(token, permission));
    electron_1.ipcMain.handle('users:getAll', (_, token) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return UserRepository_1.UserRepository.getAll();
    });
    electron_1.ipcMain.handle('users:create', (_, token, payload) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return UserRepository_1.UserRepository.create(payload, actorId(token));
    });
    electron_1.ipcMain.handle('users:update', (_, token, payload) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return UserRepository_1.UserRepository.update(payload, actorId(token));
    });
    electron_1.ipcMain.handle('users:deactivate', (_, token, id) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return UserRepository_1.UserRepository.deactivate(id, actorId(token));
    });
    electron_1.ipcMain.handle('users:resetPassword', (_, token, id, password) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return UserRepository_1.UserRepository.resetPassword(id, password, actorId(token));
    });
    electron_1.ipcMain.handle('roles:getAll', (_, token) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return RoleRepository_1.RoleRepository.getAll();
    });
    electron_1.ipcMain.handle('roles:getPermissions', (_, token) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return RoleRepository_1.RoleRepository.getPermissions();
    });
    electron_1.ipcMain.handle('roles:create', (_, token, payload) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return RoleRepository_1.RoleRepository.create(payload, actorId(token));
    });
    electron_1.ipcMain.handle('roles:update', (_, token, payload) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'users.manage');
        return RoleRepository_1.RoleRepository.update(payload, actorId(token));
    });
}
