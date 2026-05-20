"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExpenseHandlers = registerExpenseHandlers;
const electron_1 = require("electron");
const ExpenseRepository_1 = require("../repositories/ExpenseRepository");
function registerExpenseHandlers() {
    electron_1.ipcMain.handle('expenses:getAll', () => {
        return ExpenseRepository_1.ExpenseRepository.getAll();
    });
    electron_1.ipcMain.handle('expenses:create', (_, expense) => {
        return ExpenseRepository_1.ExpenseRepository.create(expense);
    });
}
