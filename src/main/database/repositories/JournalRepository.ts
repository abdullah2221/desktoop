import { getDatabase } from '../connection';

export class JournalRepository {
  static getAllJournals() {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM journal_entries
      ORDER BY entry_date DESC, created_at DESC
    `).all();
  }

  static getJournalById(id: string) {
    const db = getDatabase();
    const journal = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as any;
    if (journal) {
      journal.lines = db.prepare(`
        SELECT jl.*, a.account_code, a.account_name 
        FROM journal_entry_lines jl
        JOIN chart_of_accounts a ON jl.account_id = a.id
        WHERE jl.journal_entry_id = ?
      `).all(id);
    }
    return journal;
  }

  static createJournal(payload: any) {
    const db = getDatabase();
    
    // Validate entry before transaction
    if (!payload.lines || payload.lines.length < 2) {
      throw new Error('Journal entry requires at least 2 lines.');
    }
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of payload.lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      
      if (debit < 0 || credit < 0) {
        throw new Error('Debit and credit values cannot be negative.');
      }
      if (debit > 0 && credit > 0) {
        throw new Error('Debit and credit cannot both be entered on one line.');
      }
      
      totalDebit += debit;
      totalCredit += credit;
    }
    
    // Account for floating point inaccuracies
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error('Journal entry must balance (Total Debit must equal Total Credit).');
    }

    const transaction = db.transaction((data: any) => {
      const journalId = data.id || `JE-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      
      const insertJE = db.prepare(`
        INSERT INTO journal_entries (
          id, entry_no, entry_date, description, reference_type, 
          reference_id, branch_id, class_id, total_debit, total_credit, status, created_by
        ) VALUES (
          @id, @entry_no, @entry_date, @description, @reference_type,
          @reference_id, @branch_id, @class_id, @total_debit, @total_credit, @status, @created_by
        )
      `);

      insertJE.run({
        id: journalId,
        entry_no: data.entry_no || `JEN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        entry_date: data.entry_date || new Date().toISOString(),
        description: data.description,
        reference_type: data.reference_type || null,
        reference_id: data.reference_id || null,
        branch_id: data.branch_id || 'B001',
        class_id: data.class_id || null,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: data.status || 'posted',
        created_by: data.created_by || null
      });

      const insertLine = db.prepare(`
        INSERT INTO journal_entry_lines (
          id, journal_entry_id, account_id, description, debit, credit
        ) VALUES (
          @id, @journal_entry_id, @account_id, @description, @debit, @credit
        )
      `);

      const updateAccountBalance = db.prepare(`
        UPDATE chart_of_accounts 
        SET current_balance = current_balance + ?
        WHERE id = ?
      `);

      for (const line of data.lines) {
        const lineId = `JEL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        
        insertLine.run({
          id: lineId,
          journal_entry_id: journalId,
          account_id: line.account_id,
          description: line.description || '',
          debit: debit,
          credit: credit
        });

        // Update account balances based on type
        const account = db.prepare('SELECT account_type FROM chart_of_accounts WHERE id = ?').get(line.account_id) as any;
        if (account) {
          let balanceChange = 0;
          // Assets & Expenses increase with Debit, decrease with Credit
          if (account.account_type === 'Asset' || account.account_type === 'Expense') {
            balanceChange = debit - credit;
          } 
          // Liabilities, Equity, & Income increase with Credit, decrease with Debit
          else if (account.account_type === 'Liability' || account.account_type === 'Equity' || account.account_type === 'Income') {
            balanceChange = credit - debit;
          }
          
          if (balanceChange !== 0) {
            updateAccountBalance.run(balanceChange, line.account_id);
          }
        }
      }

      return { success: true, id: journalId };
    });

    try {
      return transaction(payload);
    } catch (error: any) {
      console.error('[JournalRepository] Transaction failed:', error);
      throw error;
    }
  }
}
