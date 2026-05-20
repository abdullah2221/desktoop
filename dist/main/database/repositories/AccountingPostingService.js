"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingPostingService = void 0;
const connection_1 = require("../connection");
const JournalRepository_1 = require("./JournalRepository");
function getAccountIdByCode(accountCode) {
    const db = (0, connection_1.getDatabase)();
    const account = db.prepare('SELECT id FROM chart_of_accounts WHERE account_code = ?').get(accountCode);
    if (!account) {
        throw new Error(`Account mapping missing for code ${accountCode}`);
    }
    return account.id;
}
class AccountingPostingService {
    static postSale(params) {
        const receivableAccount = params.status === 'Paid' ? '1000' : '1100';
        JournalRepository_1.JournalRepository.createJournal({
            entry_no: `AUTO-SALE-${params.invoiceNo}`,
            entry_date: params.date,
            description: `Auto posting for sale ${params.invoiceNo}`,
            reference_type: 'SALE',
            reference_id: params.invoiceNo,
            lines: [
                { account_id: getAccountIdByCode(receivableAccount), description: 'Sale receipt/receivable', debit: params.total, credit: 0 },
                { account_id: getAccountIdByCode('4000'), description: 'Sales income', debit: 0, credit: params.total - (params.taxAmount || 0) },
                ...(params.taxAmount && params.taxAmount > 0
                    ? [{ account_id: getAccountIdByCode('2100'), description: 'Output tax payable', debit: 0, credit: params.taxAmount }]
                    : [])
            ]
        });
        if (params.cogsAmount > 0) {
            JournalRepository_1.JournalRepository.createJournal({
                entry_no: `AUTO-COGS-${params.invoiceNo}`,
                entry_date: params.date,
                description: `Auto COGS posting for sale ${params.invoiceNo}`,
                reference_type: 'SALE',
                reference_id: params.invoiceNo,
                lines: [
                    { account_id: getAccountIdByCode('5000'), description: 'COGS', debit: params.cogsAmount, credit: 0 },
                    { account_id: getAccountIdByCode('1200'), description: 'Inventory reduction', debit: 0, credit: params.cogsAmount }
                ]
            });
        }
    }
    static postPurchase(params) {
        const creditAccount = params.amountPaid >= params.grandTotal ? '1000' : '2000';
        JournalRepository_1.JournalRepository.createJournal({
            entry_no: `AUTO-PUR-${params.purchaseId}`,
            entry_date: params.date,
            description: `Auto posting for purchase ${params.purchaseId}`,
            reference_type: 'PURCHASE',
            reference_id: params.purchaseId,
            lines: [
                { account_id: getAccountIdByCode('1200'), description: 'Inventory purchase', debit: params.grandTotal - (params.taxAmount || 0), credit: 0 },
                ...(params.taxAmount && params.taxAmount > 0
                    ? [{ account_id: getAccountIdByCode('1300'), description: 'Input tax receivable', debit: params.taxAmount, credit: 0 }]
                    : []),
                { account_id: getAccountIdByCode(creditAccount), description: 'Payment/payable', debit: 0, credit: params.grandTotal }
            ]
        });
    }
    static postExpense(params) {
        JournalRepository_1.JournalRepository.createJournal({
            entry_no: `AUTO-EXP-${params.expenseId}`,
            entry_date: params.date,
            description: `Auto posting for expense ${params.expenseId}`,
            reference_type: 'EXPENSE',
            reference_id: params.expenseId,
            lines: [
                { account_id: getAccountIdByCode('6000'), description: 'Operating expense', debit: params.amount - (params.taxAmount || 0), credit: 0 },
                ...(params.taxAmount && params.taxAmount > 0
                    ? [{ account_id: getAccountIdByCode('1300'), description: 'Input tax receivable', debit: params.taxAmount, credit: 0 }]
                    : []),
                { account_id: getAccountIdByCode('1000'), description: 'Cash outflow', debit: 0, credit: params.amount }
            ]
        });
    }
    static postInvoiceFinalize(params) {
        const debitAccount = params.status === 'Paid' ? '1000' : '1100';
        JournalRepository_1.JournalRepository.createJournal({
            entry_no: `AUTO-INV-${params.invoiceId}`,
            entry_date: params.date,
            description: `Auto posting for invoice ${params.invoiceNo}`,
            reference_type: 'INVOICE',
            reference_id: params.invoiceId,
            lines: [
                { account_id: getAccountIdByCode(debitAccount), description: 'Invoice debit', debit: params.total, credit: 0 },
                { account_id: getAccountIdByCode('4000'), description: 'Sales income', debit: 0, credit: params.total - (params.taxAmount || 0) },
                ...(params.taxAmount && params.taxAmount > 0
                    ? [{ account_id: getAccountIdByCode('2100'), description: 'Output tax payable', debit: 0, credit: params.taxAmount }]
                    : [])
            ]
        });
        if (params.cogsAmount > 0) {
            JournalRepository_1.JournalRepository.createJournal({
                entry_no: `AUTO-INV-COGS-${params.invoiceId}`,
                entry_date: params.date,
                description: `Auto COGS posting for invoice ${params.invoiceNo}`,
                reference_type: 'INVOICE',
                reference_id: params.invoiceId,
                lines: [
                    { account_id: getAccountIdByCode('5000'), description: 'COGS', debit: params.cogsAmount, credit: 0 },
                    { account_id: getAccountIdByCode('1200'), description: 'Inventory reduction', debit: 0, credit: params.cogsAmount }
                ]
            });
        }
    }
    static postInvoicePayment(params) {
        const debitAccount = params.method === 'Bank' ? '1010' : '1000';
        JournalRepository_1.JournalRepository.createJournal({
            entry_no: `AUTO-INV-PAY-${params.paymentId}`,
            entry_date: params.date,
            description: `Payment received for invoice ${params.invoiceId}`,
            reference_type: 'INVOICE_PAYMENT',
            reference_id: params.paymentId,
            lines: [
                { account_id: getAccountIdByCode(debitAccount), description: 'Cash/Bank received', debit: params.amount, credit: 0 },
                { account_id: getAccountIdByCode('1100'), description: 'Accounts receivable reduced', debit: 0, credit: params.amount }
            ]
        });
    }
}
exports.AccountingPostingService = AccountingPostingService;
