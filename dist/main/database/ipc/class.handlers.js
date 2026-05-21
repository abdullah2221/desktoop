"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClassHandlers = registerClassHandlers;
const electron_1 = require("electron");
const AuthRepository_1 = require("../repositories/AuthRepository");
const ClassRepository_1 = require("../repositories/ClassRepository");
function actorId(token) {
    return AuthRepository_1.AuthRepository.getCurrentUser(token)?.id;
}
function requireClassManage(token) {
    AuthRepository_1.AuthRepository.requirePermission(token, 'branch.manage');
}
function registerClassHandlers() {
    electron_1.ipcMain.handle('classes:getAll', (_, token) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'reports.view');
        return ClassRepository_1.ClassRepository.getAll();
    });
    electron_1.ipcMain.handle('classes:create', (_, token, payload) => {
        requireClassManage(token);
        return ClassRepository_1.ClassRepository.create(payload, actorId(token));
    });
    electron_1.ipcMain.handle('classes:update', (_, token, payload) => {
        requireClassManage(token);
        return ClassRepository_1.ClassRepository.update(payload, actorId(token));
    });
    electron_1.ipcMain.handle('classes:deactivate', (_, token, id) => {
        requireClassManage(token);
        return ClassRepository_1.ClassRepository.deactivate(id, actorId(token));
    });
}
