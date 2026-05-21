"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccountRepository = void 0;
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const JournalRepository_1 = require("./JournalRepository");
class BankAccountRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM cash_bank_accounts ORDER BY name ASC').all();
    }
    static create(payload) {
        const db = (0, connection_1.getDatabase)();
        const id = payload.id || `CBA-${Date.now()}`;
        const tx = db.transaction((data) => {
            const openingBalance = Number(data.opening_balance) || 0;
            const info = db.prepare(`
        INSERT INTO cash_bank_accounts (
          id, code, name, account_type, linked_gl_account_id, opening_balance, current_balance, status
        ) VALUES (
          @id, @code, @name, @account_type, @linked_gl_account_id, @opening_balance, @opening_balance, @status
        )
      `).run({
                id,
                code: data.code,
                name: data.name,
                account_type: data.account_type,
                linked_gl_account_id: data.linked_gl_account_id,
                opening_balance: openingBalance,
                status: data.status || 'active'
            });
            if (info.changes > 0 && openingBalance > 0) {
                JournalRepository_1.JournalRepository.createJournal({
                    entry_no: `AUTO-CBA-OPEN-${Date.now()}`,
                    entry_date: new Date().toISOString().split('T')[0],
                    description: `Opening balance for ${data.code}`,
                    reference_type: 'BANK_ACCOUNT_OPENING',
                    reference_id: id,
                    lines: [
                        { account_id: data.linked_gl_account_id, description: 'Opening bank/cash balance', debit: openingBalance, credit: 0 },
                        { account_id: 'ACC-3000', description: 'Opening balance equity', debit: 0, credit: openingBalance }
                    ]
                });
            }
            return info;
        });
        const info = tx(payload);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BANK_ACCOUNT_CREATE', details: `Bank/Cash account ${id} created` });
        }
        return { success: info.changes > 0, id };
    }
    static update(payload) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare(`
      UPDATE cash_bank_accounts
      SET code=@code,
          name=@name,
          account_type=@account_type,
          linked_gl_account_id=@linked_gl_account_id,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
            ...payload,
            status: payload.status || 'active'
        });
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BANK_ACCOUNT_UPDATE', details: `Bank/Cash account ${payload.id} updated` });
        }
        return info.changes > 0;
    }
    static deactivate(id) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare("UPDATE cash_bank_accounts SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'BANK_ACCOUNT_DEACTIVATE', details: `Bank/Cash account ${id} deactivated` });
        }
        return info.changes > 0;
    }
    static mapPaymentMethod(paymentMethod, accountId) {
        const db = (0, connection_1.getDatabase)();
        const info = db.prepare(`
      INSERT OR REPLACE INTO payment_method_accounts (payment_method, account_id, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(paymentMethod, accountId);
        if (info.changes > 0) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'PAYMENT_METHOD_MAP_UPDATE', details: `${paymentMethod} mapped to ${accountId || 'NULL'}` });
        }
        return info.changes > 0;
    }
    static getPaymentMethodMappings() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT p.payment_method, p.account_id, a.name as account_name, a.code as account_code
      FROM payment_method_accounts p
      LEFT JOIN cash_bank_accounts a ON p.account_id = a.id
      ORDER BY p.payment_method ASC
    `).all();
    }
}
exports.BankAccountRepository = BankAccountRepository;
