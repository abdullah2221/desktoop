import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { JournalRepository } from './JournalRepository';

interface TransactionPayload {
  account_id: string;
  transaction_date: string;
  amount: number;
  offset_gl_account_id?: string | null;
  reference_no?: string;
  notes?: string;
}

export class MoneyTransactionRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT mt.*, a.name as account_name, a.code as account_code
      FROM money_transactions mt
      JOIN cash_bank_accounts a ON mt.account_id = a.id
      ORDER BY mt.transaction_date DESC, mt.created_at DESC
    `).all();
  }

  static getByAccount(accountId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM money_transactions WHERE account_id = ? ORDER BY transaction_date DESC, created_at DESC').all(accountId);
  }

  static createDeposit(payload: TransactionPayload) {
    return this.createSingle(payload, 'DEPOSIT', 1);
  }

  static createWithdrawal(payload: TransactionPayload) {
    return this.createSingle(payload, 'WITHDRAWAL', -1);
  }

  static createBankCharge(payload: TransactionPayload) {
    return this.createSingle({ ...payload, offset_gl_account_id: 'ACC-6300' }, 'BANK_CHARGE', -1);
  }

  static createAdjustment(payload: TransactionPayload & { adjustment_sign: 1 | -1 }) {
    return this.createSingle(payload, 'ADJUSTMENT', payload.adjustment_sign);
  }

  static createTransfer(payload: {
    from_account_id: string;
    to_account_id: string;
    transaction_date: string;
    amount: number;
    reference_no?: string;
    notes?: string;
  }) {
    const db = getDatabase();
    const tx = db.transaction((data: typeof payload) => {
      const source = db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(data.from_account_id) as any;
      const destination = db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(data.to_account_id) as any;
      if (!source || !destination) throw new Error('Source or destination account not found.');
      if (data.amount <= 0) throw new Error('Transfer amount must be greater than zero.');
      if (source.current_balance < data.amount) throw new Error('Insufficient source account balance for transfer.');

      const outId = `MT-${Date.now()}-OUT`;
      const inId = `MT-${Date.now()}-IN`;

      db.prepare(`
        INSERT INTO money_transactions (
          id, tenant_id, branch_id, account_id, transaction_date, transaction_type, amount,
          reference_no, notes, counter_account_id
        ) VALUES (
          @id, 'T001', 'B001', @account_id, @transaction_date, @transaction_type, @amount,
          @reference_no, @notes, @counter_account_id
        )
      `).run({
        id: outId,
        account_id: data.from_account_id,
        transaction_date: data.transaction_date,
        transaction_type: 'TRANSFER_OUT',
        amount: data.amount,
        reference_no: data.reference_no || '',
        notes: data.notes || '',
        counter_account_id: data.to_account_id
      });

      db.prepare(`
        INSERT INTO money_transactions (
          id, tenant_id, branch_id, account_id, transaction_date, transaction_type, amount,
          reference_no, notes, counter_account_id
        ) VALUES (
          @id, 'T001', 'B001', @account_id, @transaction_date, @transaction_type, @amount,
          @reference_no, @notes, @counter_account_id
        )
      `).run({
        id: inId,
        account_id: data.to_account_id,
        transaction_date: data.transaction_date,
        transaction_type: 'TRANSFER_IN',
        amount: data.amount,
        reference_no: data.reference_no || '',
        notes: data.notes || '',
        counter_account_id: data.from_account_id
      });

      db.prepare('UPDATE cash_bank_accounts SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.amount, data.from_account_id);
      db.prepare('UPDATE cash_bank_accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.amount, data.to_account_id);

      JournalRepository.createJournal({
        entry_no: `AUTO-TRF-${Date.now()}`,
        entry_date: data.transaction_date,
        description: `Transfer ${data.amount} from ${source.code} to ${destination.code}`,
        reference_type: 'TRANSFER',
        reference_id: outId,
        lines: [
          { account_id: destination.linked_gl_account_id, description: 'Transfer in', debit: data.amount, credit: 0 },
          { account_id: source.linked_gl_account_id, description: 'Transfer out', debit: 0, credit: data.amount }
        ]
      });

      AuditLogRepository.write({ action: 'MONEY_TRANSFER', details: `Transfer ${data.amount} from ${data.from_account_id} to ${data.to_account_id}` });
      return { success: true, id: outId };
    });

    return tx(payload);
  }

  static markCleared(transactionId: string, cleared = true) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE money_transactions
      SET is_cleared = ?, cleared_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(cleared ? 1 : 0, cleared ? 1 : 0, transactionId);

    return info.changes > 0;
  }

  private static createSingle(payload: TransactionPayload, type: 'DEPOSIT' | 'WITHDRAWAL' | 'BANK_CHARGE' | 'ADJUSTMENT', direction: 1 | -1) {
    const db = getDatabase();
    const tx = db.transaction((data: TransactionPayload) => {
      const account = db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(data.account_id) as any;
      if (!account) throw new Error('Account not found.');
      if (data.amount <= 0) throw new Error('Amount must be greater than zero.');

      const newBalance = account.current_balance + (direction * data.amount);
      if (newBalance < 0) throw new Error('Transaction would result in negative balance.');

      const id = `MT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      db.prepare(`
        INSERT INTO money_transactions (
          id, tenant_id, branch_id, account_id, transaction_date, transaction_type,
          amount, offset_gl_account_id, reference_no, notes
        ) VALUES (
          @id, 'T001', 'B001', @account_id, @transaction_date, @transaction_type,
          @amount, @offset_gl_account_id, @reference_no, @notes
        )
      `).run({
        id,
        account_id: data.account_id,
        transaction_date: data.transaction_date,
        transaction_type: type,
        amount: data.amount,
        offset_gl_account_id: data.offset_gl_account_id || 'ACC-3000',
        reference_no: data.reference_no || '',
        notes: data.notes || ''
      });

      db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, data.account_id);

      const debitLine = direction > 0
        ? { account_id: account.linked_gl_account_id, debit: data.amount, credit: 0, description: type }
        : { account_id: data.offset_gl_account_id || 'ACC-3000', debit: data.amount, credit: 0, description: type };
      const creditLine = direction > 0
        ? { account_id: data.offset_gl_account_id || 'ACC-3000', debit: 0, credit: data.amount, description: type }
        : { account_id: account.linked_gl_account_id, debit: 0, credit: data.amount, description: type };

      JournalRepository.createJournal({
        entry_no: `AUTO-MTX-${Date.now()}`,
        entry_date: data.transaction_date,
        description: `${type} on ${account.code}`,
        reference_type: 'MONEY_TRANSACTION',
        reference_id: id,
        lines: [debitLine, creditLine]
      });

      AuditLogRepository.write({ action: `MONEY_${type}`, details: `${type} ${data.amount} in ${data.account_id}` });
      return { success: true, id };
    });

    return tx(payload);
  }
}
