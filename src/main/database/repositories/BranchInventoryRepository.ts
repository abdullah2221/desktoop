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

  static getByProduct(productId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT bi.*, p.sku, p.barcode, p.name as product_name, p.category as category_name, p.cost as product_cost, p.price as sale_price,
             b.branch_code, COALESCE(b.branch_name, b.name) as branch_name,
             (bi.quantity_on_hand - bi.quantity_reserved) as available_quantity,
             (bi.quantity_on_hand * COALESCE(NULLIF(bi.average_cost, 0), p.cost, 0)) as inventory_value
      FROM branch_inventory bi
      JOIN products p ON p.id = bi.product_id
      JOIN branches b ON b.id = bi.branch_id
      WHERE bi.product_id=@productId
      ORDER BY b.branch_code ASC
    `).all({ productId });
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

  static getStockCard(productId: string, branchId?: string) {
    const db = getDatabase();
    const branches = this.getByProduct(productId) as any[];
    const movementRows = db.prepare(`
      SELECT *
      FROM stock_movements
      WHERE product_id=@product_id
        AND (@branch_id IS NULL OR branch_id=@branch_id)
      ORDER BY date ASC, created_at ASC
    `).all({ product_id: productId, branch_id: branchId || null }) as any[];

    const totals = {
      opening_stock: 0,
      purchases_in: 0,
      sales_out: 0,
      sales_returns_in: 0,
      purchase_returns_out: 0,
      transfers_in: 0,
      transfers_out: 0,
      adjustments_in: 0,
      adjustments_out: 0,
      damage_loss_out: 0
    };

    for (const row of movementRows) {
      const inQty = Number(row.quantity_in || 0);
      const outQty = Number(row.quantity_out || 0);
      const type = String(row.reference_type || '').toUpperCase();
      const moveType = String(row.movement_type || '').toUpperCase();
      if (type === 'OPENING' || moveType === 'OPENING_STOCK') totals.opening_stock += inQty - outQty;
      else if (type === 'PURCHASE') totals.purchases_in += inQty;
      else if (type === 'SALE' || type === 'INVOICE') totals.sales_out += outQty;
      else if (type === 'SALES_RETURN') totals.sales_returns_in += inQty;
      else if (type === 'PURCHASE_RETURN') totals.purchase_returns_out += outQty;
      else if (type === 'TRANSFER') {
        totals.transfers_in += inQty;
        totals.transfers_out += outQty;
      } else if (type === 'ADJUSTMENT') {
        totals.adjustments_in += inQty;
        totals.adjustments_out += outQty;
        if (moveType.includes('DAMAGE') || moveType.includes('SHRINKAGE')) totals.damage_loss_out += outQty;
      }
    }

    const totalOnHand = branches.reduce((sum, row) => sum + Number(row.quantity_on_hand || 0), 0);
    const avgCost = branches.length
      ? branches.reduce((sum, row) => sum + Number(row.average_cost || 0), 0) / branches.length
      : 0;

    return {
      product_id: productId,
      branch_id: branchId || null,
      current_stock: totalOnHand,
      average_cost: Number(avgCost.toFixed(4)),
      estimated_value: Number((totalOnHand * avgCost).toFixed(4)),
      totals,
      branch_rows: branches,
      movement_rows: movementRows
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
