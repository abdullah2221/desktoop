import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { BranchInventoryRepository } from './BranchInventoryRepository';

export class StockTransferRepository {
  static getAll() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT st.*, sb.branch_code as source_branch_code, COALESCE(sb.branch_name, sb.name) as source_branch_name,
             dbb.branch_code as destination_branch_code, COALESCE(dbb.branch_name, dbb.name) as destination_branch_name
      FROM stock_transfers st
      JOIN branches sb ON sb.id = st.source_branch_id
      JOIN branches dbb ON dbb.id = st.destination_branch_id
      ORDER BY st.created_at DESC
    `).all() as any[];
    return rows.map((row) => ({ ...row, items: this.getItems(row.id) }));
  }

  static getItems(transferId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT sti.*, p.sku, p.name as product_name
      FROM stock_transfer_items sti
      JOIN products p ON p.id = sti.product_id
      WHERE sti.transfer_id=?
      ORDER BY p.name ASC
    `).all(transferId);
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `TRF-${Date.now()}`;
    const transferNo = payload.transfer_no || id;
    const tx = db.transaction(() => {
      if (payload.source_branch_id === payload.destination_branch_id) throw new Error('Source and destination branches must be different.');
      db.prepare(`
        INSERT INTO stock_transfers (
          id, transfer_no, source_branch_id, destination_branch_id, status, request_date, notes, created_by
        ) VALUES (
          @id, @transfer_no, @source_branch_id, @destination_branch_id, 'Pending', @request_date, @notes, @created_by
        )
      `).run({
        id,
        transfer_no: transferNo,
        source_branch_id: payload.source_branch_id,
        destination_branch_id: payload.destination_branch_id,
        request_date: payload.request_date || new Date().toISOString().split('T')[0],
        notes: payload.notes || '',
        created_by: actorId || null
      });
      const insertItem = db.prepare(`
        INSERT INTO stock_transfer_items (id, transfer_id, product_id, quantity, unit_cost)
        VALUES (@id, @transfer_id, @product_id, @quantity, @unit_cost)
      `);
      for (const item of payload.items || []) {
        if (Number(item.quantity || 0) <= 0) throw new Error('Transfer quantity must be greater than zero.');
        insertItem.run({
          id: `TRFI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          transfer_id: id,
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost || 0)
        });
      }
      AuditLogRepository.write({ action: 'STOCK_TRANSFER_CREATE', user_id: actorId, details: `Stock transfer ${id} created` });
      return { success: true, id };
    });
    return tx();
  }

  static approve(id: string, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const transfer = db.prepare("SELECT * FROM stock_transfers WHERE id=? AND status='Pending'").get(id) as any;
      if (!transfer) throw new Error('Pending transfer not found.');
      const items = this.getItems(id) as any[];
      for (const item of items) {
        const changed = BranchInventoryRepository.adjustQuantity(transfer.source_branch_id, item.product_id, -Number(item.quantity));
        this.logMovement(transfer.source_branch_id, item.product_id, 'TRANSFER_OUT', 0, item.quantity, id, changed.previousQuantity, changed.newQuantity, `Approved transfer ${transfer.transfer_no}`, actorId);
      }
      db.prepare(`
        UPDATE stock_transfers
        SET status='In Transit', approval_date=CURRENT_TIMESTAMP, shipment_date=CURRENT_TIMESTAMP, approved_by=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(actorId || null, id);
      AuditLogRepository.write({ action: 'STOCK_TRANSFER_APPROVE', user_id: actorId, details: `Stock transfer ${id} approved` });
      return true;
    });
    return tx();
  }

  static complete(id: string, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const transfer = db.prepare("SELECT * FROM stock_transfers WHERE id=? AND status='In Transit'").get(id) as any;
      if (!transfer) throw new Error('In Transit transfer not found.');
      const items = this.getItems(id) as any[];
      for (const item of items) {
        const changed = BranchInventoryRepository.adjustQuantity(transfer.destination_branch_id, item.product_id, Number(item.quantity));
        this.logMovement(transfer.destination_branch_id, item.product_id, 'TRANSFER_IN', item.quantity, 0, id, changed.previousQuantity, changed.newQuantity, `Completed transfer ${transfer.transfer_no}`, actorId);
      }
      db.prepare("UPDATE stock_transfers SET status='Completed', completion_date=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
      AuditLogRepository.write({ action: 'STOCK_TRANSFER_COMPLETE', user_id: actorId, details: `Stock transfer ${id} completed` });
      return true;
    });
    return tx();
  }

  static reject(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE stock_transfers SET status='Rejected', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Pending'").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'STOCK_TRANSFER_REJECT', user_id: actorId, details: `Stock transfer ${id} rejected` });
    return info.changes > 0;
  }

  private static logMovement(branchId: string, productId: string, type: string, quantityIn: number, quantityOut: number, referenceId: string, previousStock: number, newStock: number, notes: string, actorId?: string) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO stock_movements (
        id, tenant_id, branch_id, product_id, movement_type, quantity_in, quantity_out,
        reference_type, reference_id, previous_stock, new_stock, date, notes, created_by
      ) VALUES (
        @id, 'T001', @branch_id, @product_id, @movement_type, @quantity_in, @quantity_out,
        'TRANSFER', @reference_id, @previous_stock, @new_stock, @date, @notes, @created_by
      )
    `).run({
      id: `SM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      branch_id: branchId,
      product_id: productId,
      movement_type: type,
      quantity_in: quantityIn,
      quantity_out: quantityOut,
      reference_id: referenceId,
      previous_stock: previousStock,
      new_stock: newStock,
      date: new Date().toISOString().split('T')[0],
      notes,
      created_by: actorId || null
    });
  }
}
