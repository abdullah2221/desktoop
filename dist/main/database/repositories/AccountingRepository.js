"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingRepository = void 0;
const connection_1 = require("../connection");
class AccountingRepository {
    static getAllAccounts() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT * FROM chart_of_accounts
      ORDER BY account_code ASC
    `).all();
    }
    static getAccountById(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(id);
    }
    static createAccount(payload) {
        const db = (0, connection_1.getDatabase)();
        const id = payload.id || `ACC-${Date.now()}`;
        const stmt = db.prepare(`
      INSERT INTO chart_of_accounts (
        id, account_code, account_name, account_type, account_subtype, 
        parent_account_id, opening_balance, current_balance, is_system_account, status
      ) VALUES (
        @id, @account_code, @account_name, @account_type, @account_subtype,
        @parent_account_id, @opening_balance, @current_balance, 0, @status
      )
    `);
        stmt.run({
            id,
            account_code: payload.account_code,
            account_name: payload.account_name,
            account_type: payload.account_type,
            account_subtype: payload.account_subtype || null,
            parent_account_id: payload.parent_account_id || null,
            opening_balance: payload.opening_balance || 0,
            current_balance: payload.opening_balance || 0,
            status: payload.status || 'active'
        });
        return { success: true, id };
    }
    static updateAccount(payload) {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE chart_of_accounts 
      SET 
        account_code = @account_code,
        account_name = @account_name,
        account_type = @account_type,
        account_subtype = @account_subtype,
        parent_account_id = @parent_account_id,
        status = @status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id AND is_system_account = 0
    `);
        const info = stmt.run({
            id: payload.id,
            account_code: payload.account_code,
            account_name: payload.account_name,
            account_type: payload.account_type,
            account_subtype: payload.account_subtype || null,
            parent_account_id: payload.parent_account_id || null,
            status: payload.status || 'active'
        });
        if (info.changes === 0) {
            // It might be a system account which is blocked from update, or invalid ID.
            const existing = db.prepare('SELECT is_system_account FROM chart_of_accounts WHERE id = ?').get(payload.id);
            if (existing && existing.is_system_account) {
                throw new Error('System accounts cannot be modified directly.');
            }
        }
        return info.changes > 0;
    }
    static deactivateAccount(id) {
        const db = (0, connection_1.getDatabase)();
        // System accounts cannot be deleted/deactivated
        const existing = db.prepare('SELECT is_system_account FROM chart_of_accounts WHERE id = ?').get(id);
        if (existing && existing.is_system_account) {
            throw new Error('System accounts cannot be deactivated.');
        }
        const info = db.prepare("UPDATE chart_of_accounts SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        return info.changes > 0;
    }
}
exports.AccountingRepository = AccountingRepository;
