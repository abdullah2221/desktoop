import { getDatabase } from '../connection';

export class CustomerRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
  }

  static createOrIncrementCredit(name: string, creditChange: number, purchasesChange: number, paymentDate: string) {
    const db = getDatabase();
    
    // Check if customer exists first
    const customer = db.prepare('SELECT * FROM customers WHERE name = ?').get(name) as any;
    
    if (customer) {
      const stmt = db.prepare(`
        UPDATE customers 
        SET credit = credit + ?, totalPurchases = totalPurchases + ?, lastPayment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `);
      const info = stmt.run(creditChange, purchasesChange, paymentDate, name);
      return info.changes > 0;
    } else {
      const stmt = db.prepare(`
        INSERT INTO customers (name, tenant_id, branch_id, phone, totalPurchases, credit, lastPayment)
        VALUES (?, 'T001', 'B001', '0300-0000000', ?, ?, ?)
      `);
      const info = stmt.run(name, purchasesChange, creditChange, paymentDate);
      return info.changes > 0;
    }
  }

  static receivePayment(name: string, payAmt: number, paymentDate: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE customers 
      SET credit = MAX(0, credit - ?), lastPayment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `);
    const info = stmt.run(payAmt, paymentDate, name);
    return info.changes > 0;
  }
}
