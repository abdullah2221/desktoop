import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { InvoiceRepository } from '../repositories/InvoiceRepository';

export function registerInvoiceHandlers() {
  ipcMain.handle('invoices:getAll', (_, token: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.getAll();
  });
  ipcMain.handle('invoices:getRecent', (_, token: string, filters?: any) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.getRecent(filters || {});
  });
  ipcMain.handle('invoices:getById', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.getById(id);
  });
  ipcMain.handle('invoices:create', (_, token: string, payload) => {
    const user = AuthRepository.getCurrentUser(token);
    AuthRepository.requirePermission(token, 'pos.sale.create');
    if (payload?.branch_id) AuthRepository.requireBranchAccess(token, payload.branch_id);
    return InvoiceRepository.create({
      ...payload,
      cashier_id: payload?.cashier_id || user?.id || null,
      cashier_name: payload?.cashier_name || user?.full_name || user?.username || 'System Cashier'
    });
  });
  ipcMain.handle('invoices:updateDraft', (_, token: string, payload) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.updateDraft(payload);
  });
  ipcMain.handle('invoices:finalize', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.finalize(id);
  });
  ipcMain.handle('invoices:void', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return InvoiceRepository.voidInvoice(id);
  });
}
