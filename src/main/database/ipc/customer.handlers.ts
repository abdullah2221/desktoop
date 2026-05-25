import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', (_, token: string, filters?: any) => {
    AuthRepository.requirePermission(token, 'customers.view');
    return CustomerRepository.getAll(filters || {});
  });
  ipcMain.handle('customers:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'customers.create');
    return CustomerRepository.create(payload);
  });
  ipcMain.handle('customers:update', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'customers.edit');
    return CustomerRepository.update(payload);
  });
  ipcMain.handle('customers:deactivate', (_, token: string, name: string) => {
    AuthRepository.requirePermission(token, 'customers.deactivate');
    return CustomerRepository.deactivate(name);
  });
  ipcMain.handle('customers:reactivate', (_, token: string, name: string) => {
    AuthRepository.requirePermission(token, 'customers.deactivate');
    return CustomerRepository.reactivate(name);
  });
  ipcMain.handle('customers:getByName', (_, token: string, name: string) => {
    AuthRepository.requirePermission(token, 'customers.view');
    return CustomerRepository.getByName(name);
  });
  ipcMain.handle('customers:getById', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'customers.view');
    return CustomerRepository.getById(id);
  });
  ipcMain.handle('customers:getByPhone', (_, token: string, phone: string) => {
    AuthRepository.requirePermission(token, 'customers.view');
    return CustomerRepository.getByPhone(phone);
  });
  ipcMain.handle('customers:getStatement', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'khata.statement');
    return CustomerRepository.getStatement(id);
  });
  ipcMain.handle('customers:getSales', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'khata.statement');
    return CustomerRepository.getSales(id);
  });
  ipcMain.handle('customers:getInvoices', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'khata.statement');
    return CustomerRepository.getInvoices(id);
  });
  ipcMain.handle('customers:getPayments', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'khata.statement');
    return CustomerRepository.getPayments(id);
  });
  ipcMain.handle('customers:getReturns', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'khata.statement');
    return CustomerRepository.getReturns(id);
  });
  ipcMain.handle('customers:getAging', (_, token: string, asOfDate: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getAging(asOfDate);
  });
  ipcMain.handle('customers:getOverdue', (_, token: string, asOfDate: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getOverdue(asOfDate);
  });
  ipcMain.handle('customers:getCreditLimitWarnings', (_, token: string) => {
    AuthRepository.requirePermission(token, 'customers.view');
    return CustomerRepository.getCreditLimitWarnings();
  });

  ipcMain.handle('customers:createOrIncrementCredit', (_, token: string, name: string, creditChange: number, purchasesChange: number, date: string) => {
    const allowed = AuthRepository.hasPermission(token, 'khata.adjust')
      || AuthRepository.hasPermission(token, 'pos.sale.create')
      || AuthRepository.hasPermission(token, 'customers.edit');
    if (!allowed) throw new Error('Unauthorized: khata.adjust or pos.sale.create permission is required.');
    return CustomerRepository.createOrIncrementCredit(name, creditChange, purchasesChange, date);
  });

  ipcMain.handle('customers:receivePayment', (_, token: string, name: string, payAmt: number, date: string) => {
    AuthRepository.requirePermission(token, 'khata.payment');
    return CustomerRepository.receivePayment(name, payAmt, date);
  });
}
