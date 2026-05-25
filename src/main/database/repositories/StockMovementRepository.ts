import { getDatabase } from '../connection';

export class StockMovementRepository {
  static getByProduct(productId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT sm.*, p.sku, p.barcode, p.name as product_name, b.branch_code, COALESCE(b.branch_name, b.name) as branch_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN branches b ON b.id = sm.branch_id
      WHERE sm.product_id = ?
      ORDER BY created_at DESC
    `).all(productId);
  }

  static getHistory(filters: {
    product_id?: string;
    branch_id?: string;
    movement_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  } = {}) {
    const db = getDatabase();
    return db.prepare(`
      SELECT sm.*, p.sku, p.barcode, p.name as product_name, b.branch_code, COALESCE(b.branch_name, b.name) as branch_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN branches b ON b.id = sm.branch_id
      WHERE (@product_id IS NULL OR sm.product_id=@product_id)
        AND (@branch_id IS NULL OR sm.branch_id=@branch_id)
        AND (@movement_type IS NULL OR sm.movement_type=@movement_type)
        AND (@date_from IS NULL OR sm.date >= @date_from)
        AND (@date_to IS NULL OR sm.date <= @date_to)
      ORDER BY sm.date DESC, sm.created_at DESC
      LIMIT @limit
    `).all({
      product_id: filters.product_id || null,
      branch_id: filters.branch_id || null,
      movement_type: filters.movement_type || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      limit: Math.max(1, Math.min(Number(filters.limit || 500), 5000))
    });
  }
}
