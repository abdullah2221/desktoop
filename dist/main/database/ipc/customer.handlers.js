"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCustomerHandlers = registerCustomerHandlers;
const electron_1 = require("electron");
const CustomerRepository_1 = require("../repositories/CustomerRepository");
function registerCustomerHandlers() {
    electron_1.ipcMain.handle('customers:getAll', () => {
        return CustomerRepository_1.CustomerRepository.getAll();
    });
    electron_1.ipcMain.handle('customers:createOrIncrementCredit', (_, name, creditChange, purchasesChange, date) => {
        return CustomerRepository_1.CustomerRepository.createOrIncrementCredit(name, creditChange, purchasesChange, date);
    });
    electron_1.ipcMain.handle('customers:receivePayment', (_, name, payAmt, date) => {
        return CustomerRepository_1.CustomerRepository.receivePayment(name, payAmt, date);
    });
}
