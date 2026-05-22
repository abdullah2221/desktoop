import { getDatabase } from '../connection';

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
      WHERE user_id=@user_id AND branch_id=@branch_id AND register_id=@register_id AND status='OPEN'
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
      WHERE s.status='OPEN'
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

    const salesCash = db.prepare(`
      SELECT COALESCE(SUM(total),0) as total
      FROM sales
      WHERE shift_id=? AND status='Paid' AND COALESCE(payment_method,'Cash')='Cash'
    `).get(shiftId) as { total: number };

    const refundsCash = db.prepare(`
      SELECT COALESCE(SUM(total_amount),0) as total
      FROM sales_returns
      WHERE shift_id=? AND refund_method='Cash'
    `).get(shiftId) as { total: number };

    const expenseOut = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM shift_cash_movements
      WHERE shift_id=? AND movement_type='EXPENSE_CASH_OUT'
    `).get(shiftId) as { total: number };

    const manualIn = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM shift_cash_movements
      WHERE shift_id=? AND movement_type='MANUAL_IN'
    `).get(shiftId) as { total: number };

    const manualOut = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM shift_cash_movements
      WHERE shift_id=? AND movement_type='MANUAL_OUT'
    `).get(shiftId) as { total: number };

    const expectedCash = Number(shift.opening_cash || 0)
      + Number(salesCash.total || 0)
      - Number(refundsCash.total || 0)
      - Number(expenseOut.total || 0)
      + Number(manualIn.total || 0)
      - Number(manualOut.total || 0);

    return {
      shift,
      opening_cash: Number(shift.opening_cash || 0),
      cash_sales: Number(salesCash.total || 0),
      refunds: Number(refundsCash.total || 0),
      expenses: Number(expenseOut.total || 0),
      manual_in: Number(manualIn.total || 0),
      manual_out: Number(manualOut.total || 0),
      expected_cash: expectedCash
    };
  }

  static closeShift(payload: CloseShiftInput) {
    const db = getDatabase();
    const summary = this.getShiftSummary(payload.shift_id);
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
      WHERE id=@id AND status='OPEN'
    `).run({
      id: payload.shift_id,
      expected_cash: summary.expected_cash,
      counted_cash: countedCash,
      difference,
      notes: payload.notes || summary.shift.notes || ''
    });

    if (!info.changes) throw new Error('Shift is already closed or not found.');

    return {
      success: true,
      ...summary,
      counted_cash: countedCash,
      difference,
      closing_status: status
    };
  }
}
