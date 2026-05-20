import { getDatabase } from './connection';

export interface DatabaseStats {
  products: number;
  customers: number;
  sales: number;
  expenses: number;
  auditLogs: number;
}

export class DatabaseInspector {
  static getStats(): DatabaseStats {
    const db = getDatabase();
    
    // Query individual counts dynamically
    const products = (db.prepare('SELECT count(*) as count FROM products').get() as { count: number }).count;
    const customers = (db.prepare('SELECT count(*) as count FROM customers').get() as { count: number }).count;
    const sales = (db.prepare('SELECT count(*) as count FROM sales').get() as { count: number }).count;
    const expenses = (db.prepare('SELECT count(*) as count FROM expenses').get() as { count: number }).count;
    const auditLogs = (db.prepare('SELECT count(*) as count FROM audit_logs').get() as { count: number }).count;

    return {
      products,
      customers,
      sales,
      expenses,
      auditLogs
    };
  }
}
