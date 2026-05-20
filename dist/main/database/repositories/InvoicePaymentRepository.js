"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePaymentRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const InvoiceRepository_1 = require("./InvoiceRepository");
const AccountingPostingService_1 = require("./AccountingPostingService");
class InvoicePaymentRepository {
    static getByInvoice(invoiceId) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC').all(invoiceId);
    }
    static create(payload) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((data) => {
            const id = data.id || `IP-${Date.now()}`;
            db.prepare(`
        INSERT INTO invoice_payments (
          id, tenant_id, branch_id, invoice_id, payment_date, amount, payment_method, reference_no, notes
        ) VALUES (
          @id, 'T001', 'B001', @invoice_id, @payment_date, @amount, @payment_method, @reference_no, @notes
        )
      `).run({
                id,
                invoice_id: data.invoice_id,
                payment_date: data.payment_date,
                amount: data.amount,
                payment_method: data.payment_method,
                reference_no: data.reference_no || '',
                notes: data.notes || ''
            });
            const result = InvoiceRepository_1.InvoiceRepository.applyPayment(data.invoice_id, data.amount);
            AccountingPostingService_1.AccountingPostingService.postInvoicePayment({
                invoiceId: data.invoice_id,
                paymentId: id,
                date: data.payment_date,
                amount: data.amount,
                method: data.payment_method
            });
            AuditLogRepository_1.AuditLogRepository.write({ action: 'INVOICE_PAYMENT_CREATE', details: `Invoice payment ${id} created for invoice ${data.invoice_id}` });
            return { success: true, id, ...result };
        });
        return tx(payload);
    }
}
exports.InvoicePaymentRepository = InvoicePaymentRepository;
