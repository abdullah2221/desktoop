import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { BranchInventoryRepository } from './BranchInventoryRepository';

export class InventoryAdjustmentRepository {
  static getAll() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT ia.*, b.branch_code, COALESCE(b.branch_name, b.name) as branch_name
      FROM inventory_adjustments ia
      JOIN branches b ON b.id = ia.branch_id
      ORDER BY ia.adjustment_date DESC, ia.created_at DESC
    `).all() as any[];
    return rows.map((row) => ({ ...row, items: this.getItems(row.id) }));
  }

  static getItems(adjustmentId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT iai.*, p.sku, p.name as product_name
      FROM inventory_adjustment_items iai
      JOIN products p ON p.id = iai.product_id
      WHERE iai.adjustment_id=?
      ORDER BY p.name ASC
    `).all(adjustmentId);
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `ADJ-${Date.now()}`;
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO inventory_adjustments (
          id, branch_id, adjustment_date, adjustment_type, reason, notes, status, accounting_status, created_by
        ) VALUES (
          @id, @branch_id, @adjustment_date, @adjustment_type, @reason, @notes, 'posted', 'pending', @created_by
        )
      `).run({
        id,
        branch_id: payload.branch_id,
        adjustment_date: payload.adjustment_date || new Date().toISOString().split('T')[0],
        adjustment_type: payload.adjustment_type,
        reason: payload.reason,
        notes: payload.notes || '',
        created_by: actorId || null
      });
      const insertItem = db.prepare(`
        INSERT INTO inventory_adjustment_items (
          id, adjustment_id, product_id, quantity_change, unit_cost, value_change, previous_quantity, new_quantity
        ) VALUES (
          @id, @adjustment_id, @product_id, @quantity_change, @unit_cost, @value_change, @previous_quantity, @new_quantity
        )
      `);
      for (const item of payload.items || []) {
        const product = db.prepare('SELECT cost FROM products WHERE id=?').get(item.product_id) as { cost: number } | undefined;
        const unitCost = Number(item.unit_cost ?? product?.cost ?? 0);
        const changed = BranchInventoryRepository.adjustQuantity(payload.branch_id, item.product_id, Number(item.quantity_change || 0));
        const valueChange = Number((Number(item.quantity_change || 0) * unitCost).toFixed(4));
        insertItem.run({
          id: `ADJI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          adjustment_id: id,
          product_id: item.product_id,
          quantity_change: Number(item.quantity_change || 0),
          unit_cost: unitCost,
          value_change: valueChange,
          previous_quantity: changed.previousQuantity,
          new_quantity: changed.newQuantity
        });
        this.logMovement(payload.branch_id, item.product_id, payload.adjustment_type, item.quantity_change, id, changed.previousQuantity, changed.newQuantity, payload.reason, actorId);
      }
      AuditLogRepository.write({ action: 'INVENTORY_ADJUSTMENT_CREATE', user_id: actorId, details: `Inventory adjustment ${id} created` });
      return { success: true, id };
    });
    return tx();
  }

  static accountingFoundation(adjustmentId: string) {
    const items = this.getItems(adjustmentId) as any[];
    const totalGain = items.filter((item) => Number(item.value_change) > 0).reduce((sum, item) => sum + Number(item.value_change), 0);
    const totalLoss = Math.abs(items.filter((item) => Number(item.value_change) < 0).reduce((sum, item) => sum + Number(item.value_change), 0));
    return {
      adjustmentId,
      inventoryGainAccount: 'Inventory Gain',
      shrinkageExpenseAccount: 'Shrinkage Expense',
      damageExpenseAccount: 'Damage Expense',
      totalGain,
      totalLoss,
      journalPostingReady: true
    };
  }

  private static logMovement(branchId: string, productId: string, adjustmentType: string, quantityChange: number, referenceId: string, previousStock: number, newStock: number, notes: string, actorId?: string) {
    const db = getDatabase();
    const qty = Number(quantityChange || 0);
    db.prepare(`
      INSERT INTO stock_movements (
        id, tenant_id, branch_id, product_id, movement_type, quantity_in, quantity_out,
        reference_type, reference_id, previous_stock, new_stock, date, notes, created_by
      ) VALUES (
        @id, 'T001', @branch_id, @product_id, @movement_type, @quantity_in, @quantity_out,
        'ADJUSTMENT', @reference_id, @previous_stock, @new_stock, @date, @notes, @created_by
      )
    `).run({
      id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      branch_id: branchId,
      product_id: productId,
      movement_type: adjustmentType,
      quantity_in: qty > 0 ? qty : 0,
      quantity_out: qty < 0 ? Math.abs(qty) : 0,
      reference_id: referenceId,
      previous_stock: previousStock,
      new_stock: newStock,
      date: new Date().toISOString().split('T')[0],
      notes,
      created_by: actorId || null
    });
  }
}
