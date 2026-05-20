import { getDatabase } from '../connection';

export class StockMovementRepository {
  static getByProduct(productId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM stock_movements
      WHERE product_id = ?
      ORDER BY created_at DESC
    `).all(productId);
  }
}
