import { getDatabase } from '../connection';

export class BranchInventoryRepository {
  static ensure(branchId: string, productId: string, defaults: any = {}) {
    const db = getDatabase();
    const product = db.prepare('SELECT cost, min_stock_alert FROM products WHERE id=?').get(productId) as { cost?: number; min_stock_alert?: number } | undefined;
    db.prepare(`
      INSERT OR IGNORE INTO branch_inventory (
        branch_id, product_id, quantity_on_hand, quantity_reserved, reorder_level, average_cost, valuation_method, batch_lot_hint
      ) VALUES (
        @branch_id, @product_id, @quantity_on_hand, @quantity_reserved, @reorder_level, @average_cost, 'average', @batch_lot_hint
      )
    `).run({
      branch_id: branchId,
      product_id: productId,
      quantity_on_hand: Number(defaults.quantity_on_hand || 0),
      quantity_reserved: Number(defaults.quantity_reserved || 0),
      reorder_level: Number(defaults.reorder_level ?? product?.min_stock_alert ?? 0),
      average_cost: Number(defaults.average_cost ?? product?.cost ?? 0),
      batch_lot_hint: defaults.batch_lot_hint || ''
    });
    return this.getByBranchProduct(branchId, productId);
  }

  static upsert(payload: any) {
    const db = getDatabase();
    const existing = this.getByBranchProduct(payload.branch_id, payload.product_id) as any;
    if (!existing) this.ensure(payload.branch_id, payload.product_id);
    const info = db.prepare(`
      UPDATE branch_inventory
      SET quantity_on_hand=@quantity_on_hand,
          quantity_reserved=@quantity_reserved,
          reorder_level=@reorder_level,
          average_cost=@average_cost,
          valuation_method=@valuation_method,
          batch_lot_hint=@batch_lot_hint,
          updated_at=CURRENT_TIMESTAMP
      WHERE branch_id=@branch_id AND product_id=@product_id
    `).run({
      branch_id: payload.branch_id,
      product_id: payload.product_id,
      quantity_on_hand: Number(payload.quantity_on_hand || 0),
      quantity_reserved: Number(payload.quantity_reserved || 0),
      reorder_level: Number(payload.reorder_level || 0),
      average_cost: Number(payload.average_cost || 0),
      valuation_method: payload.valuation_method || 'average',
      batch_lot_hint: payload.batch_lot_hint || ''
    });
    this.syncProductAggregate(payload.product_id);
    return info.changes > 0;
  }

  static getByBranchProduct(branchId: string, productId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM branch_inventory WHERE branch_id=? AND product_id=?').get(branchId, productId);
  }

  static getBranchStock(branchId?: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT bi.*, p.sku, p.name as product_name, p.cost as product_cost, p.price as sale_price,
             b.branch_code, COALESCE(b.branch_name, b.name) as branch_name,
             (bi.quantity_on_hand - bi.quantity_reserved) as available_quantity,
             (bi.quantity_on_hand * COALESCE(NULLIF(bi.average_cost, 0), p.cost, 0)) as inventory_value
      FROM branch_inventory bi
      JOIN products p ON p.id = bi.product_id
      JOIN branches b ON b.id = bi.branch_id
      WHERE (@branchId IS NULL OR bi.branch_id=@branchId)
      ORDER BY b.branch_code ASC, p.name ASC
    `).all({ branchId: branchId || null });
  }

  static lowStock(branchId?: string) {
    return (this.getBranchStock(branchId) as any[]).filter((row) => Number(row.quantity_on_hand || 0) <= Number(row.reorder_level || 0));
  }

  static valuation(branchId?: string) {
    const rows = this.getBranchStock(branchId) as any[];
    const totalValue = rows.reduce((sum, row) => sum + Number(row.inventory_value || 0), 0);
    return {
      valuationMethod: 'average',
      fifoFoundation: true,
      batchLotReady: true,
      totalValue,
      rows
    };
  }

  static adjustQuantity(branchId: string, productId: string, quantityDelta: number) {
    const current = (this.ensure(branchId, productId) as any) || {};
    const nextQuantity = Number(current.quantity_on_hand || 0) + Number(quantityDelta || 0);
    if (nextQuantity < 0) throw new Error('Insufficient branch stock. Negative stock is not allowed.');
    const db = getDatabase();
    db.prepare(`
      UPDATE branch_inventory
      SET quantity_on_hand=?, updated_at=CURRENT_TIMESTAMP
      WHERE branch_id=? AND product_id=?
    `).run(nextQuantity, branchId, productId);
    this.syncProductAggregate(productId);
    return { previousQuantity: Number(current.quantity_on_hand || 0), newQuantity: nextQuantity };
  }

  static syncProductAggregate(productId: string) {
    const db = getDatabase();
    const total = (db.prepare('SELECT COALESCE(SUM(quantity_on_hand), 0) as total FROM branch_inventory WHERE product_id=?').get(productId) as { total: number }).total;
    db.prepare('UPDATE products SET stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(total, productId);
  }
}
