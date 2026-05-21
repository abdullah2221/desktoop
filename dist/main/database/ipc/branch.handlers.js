"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBranchHandlers = registerBranchHandlers;
const electron_1 = require("electron");
const AuthRepository_1 = require("../repositories/AuthRepository");
const BranchRepository_1 = require("../repositories/BranchRepository");
function actorId(token) {
    return AuthRepository_1.AuthRepository.getCurrentUser(token)?.id;
}
function requireBranchManage(token) {
    AuthRepository_1.AuthRepository.requirePermission(token, 'branch.manage');
}
function registerBranchHandlers() {
    electron_1.ipcMain.handle('branches:getAll', (_, token) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.getAll();
    });
    electron_1.ipcMain.handle('branches:getAccessible', (_, token) => {
        const user = AuthRepository_1.AuthRepository.getCurrentUser(token);
        if (!user)
            throw new Error('Unauthorized: active session required.');
        return BranchRepository_1.BranchRepository.getAccessibleForUser(user.id);
    });
    electron_1.ipcMain.handle('branches:create', (_, token, payload) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.create(payload, actorId(token));
    });
    electron_1.ipcMain.handle('branches:update', (_, token, payload) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.update(payload, actorId(token));
    });
    electron_1.ipcMain.handle('branches:deactivate', (_, token, id) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.deactivate(id, actorId(token));
    });
    electron_1.ipcMain.handle('branches:setDefault', (_, token, id) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.setDefault(id);
    });
    electron_1.ipcMain.handle('branches:assignUserBranches', (_, token, userId, branchIds, defaultBranchId) => {
        requireBranchManage(token);
        return BranchRepository_1.BranchRepository.assignUserBranches(userId, branchIds, defaultBranchId);
    });
}
