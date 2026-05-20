"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCategoryHandlers = registerCategoryHandlers;
const electron_1 = require("electron");
const CategoryRepository_1 = require("../repositories/CategoryRepository");
function registerCategoryHandlers() {
    electron_1.ipcMain.handle('categories:getAll', () => {
        return CategoryRepository_1.CategoryRepository.getAll();
    });
    electron_1.ipcMain.handle('categories:create', (event, category) => {
        return CategoryRepository_1.CategoryRepository.create(category);
    });
    electron_1.ipcMain.handle('categories:update', (event, category) => {
        return CategoryRepository_1.CategoryRepository.update(category);
    });
    electron_1.ipcMain.handle('categories:deactivate', (event, id) => {
        return CategoryRepository_1.CategoryRepository.deactivate(id);
    });
}
