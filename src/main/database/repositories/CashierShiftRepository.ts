import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export interface OpenShiftInput {
  user_id: string;
  cashier_name: string;
  branch_id: string;
  register_id: string;
  opening_cash: number;
  notes?: string;
}

export interface CloseShiftInput {
  shift_id: string;
  counted_cash: number;
  notes?: string;
}

export interface ForceCloseShiftInput {
  shift_id: string;
  actor_user_id: string;
  actor_name: string;
  counted_cash?: number;
  notes?: string;
}

const ACTIVE_SHIFT_STATUSES = ['OPEN', 'SUSPENDED'];

export class CashierShiftRepository {
  static getRegisters(branchId?: string) {
    const db = getDatabase();
    if (branchId) {
      this.ensureRegister(branchId, `REG-${branchId}`);
    }
    return db.prepare(`
      SELECT * FROM cash_registers
      WHERE status='active' AND (@branch_id IS NULL OR branch_id=@branch_id)
      ORDER BY id
    `).all({ branch_id: branchId || null });
  }

  static getActiveShift(userId: string, branchId: string, registerId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM cashier_shifts
      WHERE user_id=@user_id AND branch_id=@branch_id AND register_id=@register_id AND status IN ('OPEN','SUSPENDED')
      ORDER BY opened_at DESC
      LIMIT 1
    `).get({ user_id: userId, branch_id: branchId, register_id: registerId }) as Record<string, any> | undefined;
  }

  static getOpenShifts() {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.*, b.branch_name, r.register_name
      FROM cashier_shifts s
      LEFT JOIN branches b ON b.id=s.branch_id
      LEFT JOIN cash_registers r ON r.id=s.register_id
      WHERE s.status IN ('OPEN','SUSPENDED')
      ORDER BY s.opened_at DESC
    `).all();
  }

  static openShift(payload: OpenShiftInput) {
    const db = getDatabase();
    this.ensureRegister(payload.branch_id, payload.register_id);
    const existing = this.getActiveShift(payload.user_id, payload.branch_id, payload.register_id);
    if (existing) return { success: true, shift: existing, reused: true };

    const id = `SHIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const openedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO cashier_shifts (
        id, user_id, cashier_name, branch_id, register_id, opening_cash, opened_at, status, expected_cash, notes
      ) VALUES (
        @id, @user_id, @cashier_name, @branch_id, @register_id, @opening_cash, @opened_at, 'OPEN', @opening_cash, @notes
      )
    `).run({
      id,
      user_id: payload.user_id,
      cashier_name: payload.cashier_name,
      branch_id: payload.branch_id,
      register_id: payload.register_id,
      opening_cash: Math.max(0, Number(payload.opening_cash || 0)),
      opened_at: openedAt,
      notes: payload.notes || ''
    });

    AuditLogRepository.write({
      action: 'SHIFT_OPEN',
      user_id: payload.user_id,
      details: `Shift ${id} opened by ${payload.cashier_name} on ${payload.branch_id}/${payload.register_id} with opening cash ${Math.max(0, Number(payload.opening_cash || 0))}`
    });

    const shift = this.getActiveShift(payload.user_id, payload.branch_id, payload.register_id);
    return { success: true, shift, reused: false };
  }

  private static ensureRegister(branchId: string, registerId: string) {
    const db = getDatabase();
    const exists = db.prepare(`SELECT id FROM cash_registers WHERE id=?`).get(registerId) as { id: string } | undefined;
    if (exists) return;
    db.prepare(`
      INSERT INTO cash_registers (id, branch_id, register_name, status)
      VALUES (?, ?, ?, 'active')
    `).run(registerId, branchId, `Register ${registerId}`);
  }

  static addCashMovement(data: {
    shift_id: string;
    movement_type: 'SALE_CASH_IN' | 'REFUND_CASH_OUT' | 'EXPENSE_CASH_OUT' | 'MANUAL_IN' | 'MANUAL_OUT';
    amount: number;
    payment_method?: string;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
  }) {
    const db = getDatabase();
    const movementId = `SCM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO shift_cash_movements (
        id, shift_id, movement_type, amount, payment_method, reference_type, reference_id, notes
      ) VALUES (
        @id, @shift_id, @movement_type, @amount, @payment_method, @reference_type, @reference_id, @notes
      )
    `).run({
      id: movementId,
      shift_id: data.shift_id,
      movement_type: data.movement_type,
      amount: Math.max(0, Number(data.amount || 0)),
      payment_method: data.payment_method || null,
      reference_type: data.reference_type || null,
      reference_id: data.reference_id || null,
      notes: data.notes || null
    });
    return true;
  }

  static getShiftSummary(shiftId: string) {
    const db = getDatabase();
    const shift = db.prepare(`SELECT * FROM cashier_shifts WHERE id=?`).get(shiftId) as Record<string, any> | undefined;
    if (!shift) throw new Error('Shift not found.');

    const paidSales = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COUNT(DISTINCT COALESCE(NULLIF(TRIM(customer_id),''), customerName)) as total_customers,
        COALESCE(SUM(total),0) as gross_sales,
        COALESCE(SUM(discount_amount),0) as total_discounts,
        COALESCE(SUM(tax_amount),0) as total_tax,
        COALESCE(AVG(total),0) as average_sale_amount,
        COALESCE(SUM(CASE WHEN UPPER(COALESCE(payment_method,'Cash'))='CASH' THEN total ELSE 0 END),0) as cash_sales,
        COALESCE(SUM(CASE WHEN UPPER(COALESCE(payment_method,'')) IN ('CARD','DEBIT_CARD','CREDIT_CARD') THEN total ELSE 0 END),0) as card_sales,
        COALESCE(SUM(CASE WHEN UPPER(COALESCE(payment_method,'')) IN ('BANK','BANK_TRANSFER','TRANSFER') THEN total ELSE 0 END),0) as bank_transfer_sales,
        COALESCE(SUM(CASE WHEN UPPER(COALESCE(payment_method,''))='CREDIT' THEN total ELSE 0 END),0) as credit_sales,
        COALESCE(SUM(CASE WHEN UPPER(COALESCE(payment_method,'')) NOT IN ('CASH','CARD','DEBIT_CARD','CREDIT_CARD','BANK','BANK_TRANSFER','TRANSFER','CREDIT') THEN total ELSE 0 END),0) as other_payment_sales
      FROM sales
      WHERE shift_id=@shift_id AND status='Paid'
    `).get({ shift_id: shiftId }) as Record<string, number>;

    const voids = db.prepare(`
      SELECT COUNT(*) as total_voids, COALESCE(SUM(total),0) as void_amount
      FROM sales
      WHERE shift_id=@shift_id AND status='VOIDED'
    `).get({ shift_id: shiftId }) as { total_voids: number; void_amount: number };

    const returns = db.prepare(`
      SELECT COUNT(*) as total_returns, COALESCE(SUM(total_amount),0) as total_return_amount,
        COALESCE(SUM(CASE WHEN refund_method='Cash' THEN total_amount ELSE 0 END),0) as refunds_cash
      FROM sales_returns
      WHERE shift_id=@shift_id
    `).get({ shift_id: shiftId }) as { total_returns: number; total_return_amount: number; refunds_cash: number };

    const movementTotals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN movement_type='EXPENSE_CASH_OUT' THEN amount ELSE 0 END),0) as expenses,
        COALESCE(SUM(CASE WHEN movement_type='MANUAL_IN' THEN amount ELSE 0 END),0) as manual_in,
        COALESCE(SUM(CASE WHEN movement_type='MANUAL_OUT' THEN amount ELSE 0 END),0) as manual_out,
        COALESCE(SUM(CASE WHEN movement_type='SALE_CASH_IN' THEN amount ELSE 0 END),0) as movement_cash_in,
        COALESCE(SUM(CASE WHEN movement_type='REFUND_CASH_OUT' THEN amount ELSE 0 END),0) as movement_cash_out
      FROM shift_cash_movements
      WHERE shift_id=@shift_id
    `).get({ shift_id: shiftId }) as Record<string, number>;

    const topProducts = db.prepare(`
      SELECT
        si.product_id,
        COALESCE(p.name, si.product_id) as product_name,
        SUM(si.quantity) as qty,
        SUM(si.line_total) as total
      FROM sale_items si
      JOIN sales s ON s.invoiceNo=si.invoiceNo
      LEFT JOIN products p ON p.id=si.product_id
      WHERE s.shift_id=@shift_id AND s.status='Paid'
      GROUP BY si.product_id, COALESCE(p.name, si.product_id)
      ORDER BY qty DESC, total DESC
      LIMIT 5
    `).all({ shift_id: shiftId });

    const expectedCash = Number(shift.opening_cash || 0)
      + Number(paidSales.cash_sales || 0)
      - Number(returns.refunds_cash || 0)
      - Number(movementTotals.expenses || 0)
      + Number(movementTotals.manual_in || 0)
      - Number(movementTotals.manual_out || 0);

    const countedCash = shift.counted_cash == null ? null : Number(shift.counted_cash || 0);
    const difference = countedCash == null ? null : countedCash - expectedCash;

    const status = difference == null ? 'PENDING' : difference > 0 ? 'OVER' : difference < 0 ? 'SHORT' : 'BALANCED';

    return {
      shift,
      opening_cash: Number(shift.opening_cash || 0),
      gross_sales: Number(paidSales.gross_sales || 0),
      cash_sales: Number(paidSales.cash_sales || 0),
      card_sales: Number(paidSales.card_sales || 0),
      bank_transfer_sales: Number(paidSales.bank_transfer_sales || 0),
      credit_sales: Number(paidSales.credit_sales || 0),
      other_payment_sales: Number(paidSales.other_payment_sales || 0),
      refunds: Number(returns.refunds_cash || 0),
      total_returns: Number(returns.total_returns || 0),
      total_return_amount: Number(returns.total_return_amount || 0),
      expenses: Number(movementTotals.expenses || 0),
      manual_in: Number(movementTotals.manual_in || 0),
      manual_out: Number(movementTotals.manual_out || 0),
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference,
      closing_status: status,
      total_transactions: Number(paidSales.total_transactions || 0),
      total_customers: Number(paidSales.total_customers || 0),
      total_discounts: Number(paidSales.total_discounts || 0),
      total_voids: Number(voids.total_voids || 0),
      total_void_amount: Number(voids.void_amount || 0),
      average_sale_amount: Number(paidSales.average_sale_amount || 0),
      total_tax: Number(paidSales.total_tax || 0),
      top_products: topProducts,
      suspicious_discrepancy: Math.abs(Number(difference || 0)) >= 500
    };
  }

  static closeShift(payload: CloseShiftInput) {
    const db = getDatabase();
    const summary = this.getShiftSummary(payload.shift_id);
    if (!ACTIVE_SHIFT_STATUSES.includes(String(summary.shift.status || ''))) {
      throw new Error('Shift is already closed or not found.');
    }

    const countedCash = Number(payload.counted_cash || 0);
    const difference = countedCash - summary.expected_cash;
    const status = difference > 0 ? 'OVER' : difference < 0 ? 'SHORT' : 'BALANCED';

    const info = db.prepare(`
      UPDATE cashier_shifts
      SET
        status='CLOSED',
        closed_at=CURRENT_TIMESTAMP,
        expected_cash=@expected_cash,
        counted_cash=@counted_cash,
        difference=@difference,
        notes=@notes,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=@id AND status IN ('OPEN','SUSPENDED')
    `).run({
      id: payload.shift_id,
      expected_cash: summary.expected_cash,
      counted_cash: countedCash,
      difference,
      notes: payload.notes || summary.shift.notes || ''
    });

    if (!info.changes) throw new Error('Shift is already closed or not found.');

    AuditLogRepository.write({
      action: 'SHIFT_CLOSE',
      user_id: summary.shift.user_id,
      details: `Shift ${payload.shift_id} closed with expected ${summary.expected_cash}, counted ${countedCash}, difference ${difference}`
    });

    return {
      success: true,
      ...summary,
      counted_cash: countedCash,
      difference,
      closing_status: status
    };
  }

  static forceCloseShift(payload: ForceCloseShiftInput) {
    const db = getDatabase();
    const summary = this.getShiftSummary(payload.shift_id);
    if (!ACTIVE_SHIFT_STATUSES.includes(String(summary.shift.status || ''))) {
      throw new Error('Shift is already closed or not found.');
    }

    const countedCash = Number(payload.counted_cash ?? summary.expected_cash);
    const difference = countedCash - summary.expected_cash;
    const forceNotes = payload.notes || `Force closed by ${payload.actor_name}`;

    const info = db.prepare(`
      UPDATE cashier_shifts
      SET
        status='FORCE_CLOSED',
        closed_at=CURRENT_TIMESTAMP,
        expected_cash=@expected_cash,
        counted_cash=@counted_cash,
        difference=@difference,
        notes=@notes,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=@id AND status IN ('OPEN','SUSPENDED')
    `).run({
      id: payload.shift_id,
      expected_cash: summary.expected_cash,
      counted_cash: countedCash,
      difference,
      notes: forceNotes
    });

    if (!info.changes) throw new Error('Shift is already closed or not found.');

    AuditLogRepository.write({
      action: 'SHIFT_FORCE_CLOSE',
      user_id: payload.actor_user_id,
      details: `Shift ${payload.shift_id} force-closed by ${payload.actor_name} with counted ${countedCash}, expected ${summary.expected_cash}, difference ${difference}. Notes: ${forceNotes}`
    });

    return {
      success: true,
      ...summary,
      counted_cash: countedCash,
      difference,
      closing_status: difference > 0 ? 'OVER' : difference < 0 ? 'SHORT' : 'BALANCED',
      forced: true
    };
  }

  static suspendShift(shiftId: string, actorUserId: string, actorName: string, notes?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE cashier_shifts
      SET status='SUSPENDED', notes=@notes, updated_at=CURRENT_TIMESTAMP
      WHERE id=@id AND status='OPEN'
    `).run({ id: shiftId, notes: notes || `Suspended by ${actorName}` });
    if (!info.changes) throw new Error('Shift is not open or not found.');

    AuditLogRepository.write({
      action: 'SHIFT_SUSPEND',
      user_id: actorUserId,
      details: `Shift ${shiftId} suspended by ${actorName}${notes ? `. ${notes}` : ''}`
    });
    return true;
  }

  static resumeShift(shiftId: string, actorUserId: string, actorName: string, notes?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE cashier_shifts
      SET status='OPEN', notes=@notes, updated_at=CURRENT_TIMESTAMP
      WHERE id=@id AND status='SUSPENDED'
    `).run({ id: shiftId, notes: notes || `Resumed by ${actorName}` });
    if (!info.changes) throw new Error('Shift is not suspended or not found.');

    AuditLogRepository.write({
      action: 'SHIFT_RESUME',
      user_id: actorUserId,
      details: `Shift ${shiftId} resumed by ${actorName}${notes ? `. ${notes}` : ''}`
    });
    return true;
  }
}
