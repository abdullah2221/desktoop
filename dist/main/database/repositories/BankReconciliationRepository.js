"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankReconciliationRepository = void 0;
const connection_1 = require("../connection");
const MoneyTransactionRepository_1 = require("./MoneyTransactionRepository");
class BankReconciliationRepository {
    static getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT br.*, a.name as account_name, a.code as account_code
      FROM bank_reconciliations br
      JOIN cash_bank_accounts a ON br.account_id = a.id
      ORDER BY br.end_date DESC, br.created_at DESC
    `).all();
    }
    static createWorksheet(payload) {
        const db = (0, connection_1.getDatabase)();
        const account = db.prepare('SELECT opening_balance FROM cash_bank_accounts WHERE id = ?').get(payload.account_id);
        if (!account)
            throw new Error('Account not found.');
        const txRows = db.prepare(`
      SELECT transaction_type, amount
      FROM money_transactions
      WHERE account_id = ? AND transaction_date <= ?
    `).all(payload.account_id, payload.end_date);
        const bookBalance = txRows.reduce((sum, row) => {
            if (row.transaction_type === 'DEPOSIT' || row.transaction_type === 'TRANSFER_IN')
                return sum + row.amount;
            return sum - row.amount;
        }, account.opening_balance || 0);
        const difference = payload.statement_balance - bookBalance;
        const id = `BR-${Date.now()}`;
        db.prepare(`
      INSERT INTO bank_reconciliations (
        id, account_id, start_date, end_date, statement_balance, book_balance, difference, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(id, payload.account_id, payload.start_date, payload.end_date, payload.statement_balance, bookBalance, difference);
        const uncleared = db.prepare(`
      SELECT id, amount
      FROM money_transactions
      WHERE account_id = ?
        AND transaction_date BETWEEN ? AND ?
        AND is_cleared = 0
    `).all(payload.account_id, payload.start_date, payload.end_date);
        const insertItem = db.prepare(`
      INSERT INTO bank_reconciliation_items (id, reconciliation_id, transaction_id, cleared_amount)
      VALUES (?, ?, ?, ?)
    `);
        for (const tx of uncleared) {
            insertItem.run(`BRI-${Date.now()}-${Math.floor(Math.random() * 10000)}`, id, tx.id, tx.amount);
        }
        return { success: true, id, book_balance: bookBalance, difference };
    }
    static markItemsCleared(reconciliationId, transactionIds) {
        const db = (0, connection_1.getDatabase)();
        const tx = db.transaction((ids) => {
            for (const id of ids) {
                MoneyTransactionRepository_1.MoneyTransactionRepository.markCleared(id, true);
            }
            db.prepare("UPDATE bank_reconciliations SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reconciliationId);
            return true;
        });
        return tx(transactionIds);
    }
    static getItems(reconciliationId) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT bri.*, mt.transaction_date, mt.transaction_type, mt.amount, mt.reference_no
      FROM bank_reconciliation_items bri
      JOIN money_transactions mt ON bri.transaction_id = mt.id
      WHERE bri.reconciliation_id = ?
      ORDER BY mt.transaction_date ASC
    `).all(reconciliationId);
    }
}
exports.BankReconciliationRepository = BankReconciliationRepository;
