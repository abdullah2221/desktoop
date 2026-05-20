import { ipcMain } from 'electron';
import { InvoicePaymentRepository } from '../repositories/InvoicePaymentRepository';

export function registerInvoicePaymentHandlers() {
  ipcMain.handle('invoicePayments:getByInvoice', (_, invoiceId: string) => InvoicePaymentRepository.getByInvoice(invoiceId));
  ipcMain.handle('invoicePayments:create', (_, payload) => InvoicePaymentRepository.create(payload));
}
