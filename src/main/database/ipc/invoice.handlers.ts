import { ipcMain } from 'electron';
import { InvoiceRepository } from '../repositories/InvoiceRepository';

export function registerInvoiceHandlers() {
  ipcMain.handle('invoices:getAll', () => InvoiceRepository.getAll());
  ipcMain.handle('invoices:getById', (_, id: string) => InvoiceRepository.getById(id));
  ipcMain.handle('invoices:create', (_, payload) => InvoiceRepository.create(payload));
  ipcMain.handle('invoices:updateDraft', (_, payload) => InvoiceRepository.updateDraft(payload));
  ipcMain.handle('invoices:finalize', (_, id: string) => InvoiceRepository.finalize(id));
  ipcMain.handle('invoices:void', (_, id: string) => InvoiceRepository.voidInvoice(id));
}
