import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

function dateOnly(value = new Date()) {
  return value.toISOString().split('T')[0];
}

function calculateHours(clockIn?: string | null, clockOut?: string | null, breakMinutes = 0) {
  if (!clockIn || !clockOut) return 0;
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.max(0, (end - start) / 3600000 - Number(breakMinutes || 0) / 60);
}

export class TimesheetRepository {
  static getAll(filters: { dateFrom?: string; dateTo?: string; branchId?: string; employeeId?: string } = {}) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT t.*, e.employee_code, e.name as employee_name, e.designation, e.hourly_rate,
             br.branch_code, COALESCE(br.branch_name, br.name) as branch_name
      FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      LEFT JOIN branches br ON br.id = t.branch_id
      WHERE (@dateFrom IS NULL OR t.work_date >= @dateFrom)
        AND (@dateTo IS NULL OR t.work_date <= @dateTo)
        AND (@branchId IS NULL OR t.branch_id = @branchId)
        AND (@employeeId IS NULL OR t.employee_id = @employeeId)
      ORDER BY t.work_date DESC, t.created_at DESC
    `).all({
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      branchId: filters.branchId || null,
      employeeId: filters.employeeId || null
    });
    return rows;
  }

  static clockIn(payload: { employee_id: string; branch_id?: string | null; clock_in?: string; notes?: string }, actorId?: string) {
    const db = getDatabase();
    const clockIn = payload.clock_in || new Date().toISOString();
    const workDate = dateOnly(new Date(clockIn));
    const open = db.prepare("SELECT id FROM timesheets WHERE employee_id=? AND clock_out IS NULL AND entry_type='clock'").get(payload.employee_id);
    if (open) throw new Error('Employee already has an open clock-in.');

    const employee = db.prepare("SELECT branch_id FROM employees WHERE id=? AND status = 'active'").get(payload.employee_id) as { branch_id?: string } | undefined;
    if (!employee) throw new Error('Active employee not found.');

    const id = `TS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const info = db.prepare(`
      INSERT INTO timesheets (
        id, employee_id, branch_id, work_date, clock_in, break_minutes, total_hours,
        entry_type, approval_status, notes
      ) VALUES (
        @id, @employee_id, @branch_id, @work_date, @clock_in, 0, 0,
        'clock', 'pending', @notes
      )
    `).run({
      id,
      employee_id: payload.employee_id,
      branch_id: payload.branch_id || employee.branch_id || null,
      work_date: workDate,
      clock_in: clockIn,
      notes: payload.notes || ''
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'TIMESHEET_CLOCK_IN', user_id: actorId, details: `Timesheet ${id} clocked in` });
    return { success: info.changes > 0, id };
  }

  static clockOut(id: string, payload: { clock_out?: string; break_minutes?: number; notes?: string } = {}, actorId?: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM timesheets WHERE id=?').get(id) as any;
    if (!row) throw new Error('Timesheet not found.');
    if (row.clock_out) throw new Error('Timesheet is already clocked out.');
    const clockOut = payload.clock_out || new Date().toISOString();
    const breakMinutes = Number(payload.break_minutes ?? row.break_minutes ?? 0);
    const totalHours = calculateHours(row.clock_in, clockOut, breakMinutes);
    const info = db.prepare(`
      UPDATE timesheets
      SET clock_out=@clock_out,
          break_minutes=@break_minutes,
          total_hours=@total_hours,
          notes=@notes,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id,
      clock_out: clockOut,
      break_minutes: breakMinutes,
      total_hours: Number(totalHours.toFixed(2)),
      notes: payload.notes ?? row.notes ?? ''
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'TIMESHEET_CLOCK_OUT', user_id: actorId, details: `Timesheet ${id} clocked out` });
    return info.changes > 0;
  }

  static createManual(payload: any, actorId?: string) {
    const db = getDatabase();
    const employee = db.prepare("SELECT branch_id FROM employees WHERE id=? AND status = 'active'").get(payload.employee_id) as { branch_id?: string } | undefined;
    if (!employee) throw new Error('Active employee not found.');
    const id = payload.id || `TS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const totalHours = payload.total_hours ?? calculateHours(payload.clock_in, payload.clock_out, payload.break_minutes || 0);
    const info = db.prepare(`
      INSERT INTO timesheets (
        id, employee_id, branch_id, work_date, clock_in, clock_out, break_minutes,
        total_hours, entry_type, approval_status, notes
      ) VALUES (
        @id, @employee_id, @branch_id, @work_date, @clock_in, @clock_out, @break_minutes,
        @total_hours, 'manual', @approval_status, @notes
      )
    `).run({
      id,
      employee_id: payload.employee_id,
      branch_id: payload.branch_id || employee.branch_id || null,
      work_date: payload.work_date,
      clock_in: payload.clock_in || null,
      clock_out: payload.clock_out || null,
      break_minutes: Number(payload.break_minutes || 0),
      total_hours: Number(Number(totalHours || 0).toFixed(2)),
      approval_status: payload.approval_status || 'pending',
      notes: payload.notes || ''
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'TIMESHEET_MANUAL_CREATE', user_id: actorId, details: `Manual timesheet ${id} created` });
    return { success: info.changes > 0, id };
  }

  static approve(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE timesheets
      SET approval_status='approved',
          approved_by=@approved_by,
          approved_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({ id, approved_by: actorId || null });
    if (info.changes > 0) AuditLogRepository.write({ action: 'TIMESHEET_APPROVE', user_id: actorId, details: `Timesheet ${id} approved` });
    return info.changes > 0;
  }

  static summary(filters: { dateFrom?: string; dateTo?: string; branchId?: string; employeeId?: string } = {}) {
    const db = getDatabase();
    const params = {
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      branchId: filters.branchId || null,
      employeeId: filters.employeeId || null
    };
    const byEmployee = db.prepare(`
      SELECT e.id as employee_id, e.employee_code, e.name as employee_name, e.hourly_rate,
             COUNT(t.id) as entries, COALESCE(SUM(t.total_hours), 0) as total_hours,
             COALESCE(SUM(t.total_hours * e.hourly_rate), 0) as estimated_pay
      FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      WHERE t.approval_status = 'approved'
        AND (@dateFrom IS NULL OR t.work_date >= @dateFrom)
        AND (@dateTo IS NULL OR t.work_date <= @dateTo)
        AND (@branchId IS NULL OR t.branch_id = @branchId)
        AND (@employeeId IS NULL OR t.employee_id = @employeeId)
      GROUP BY e.id
      ORDER BY e.employee_code ASC
    `).all(params);
    const byBranch = db.prepare(`
      SELECT COALESCE(t.branch_id, 'UNASSIGNED') as branch_id,
             COALESCE(br.branch_name, br.name, 'Unassigned') as branch_name,
             COUNT(t.id) as entries, COALESCE(SUM(t.total_hours), 0) as total_hours,
             COALESCE(SUM(t.total_hours * e.hourly_rate), 0) as estimated_pay
      FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      LEFT JOIN branches br ON br.id = t.branch_id
      WHERE t.approval_status = 'approved'
        AND (@dateFrom IS NULL OR t.work_date >= @dateFrom)
        AND (@dateTo IS NULL OR t.work_date <= @dateTo)
        AND (@branchId IS NULL OR t.branch_id = @branchId)
        AND (@employeeId IS NULL OR t.employee_id = @employeeId)
      GROUP BY t.branch_id
      ORDER BY branch_name ASC
    `).all(params);
    const totals = byEmployee.reduce((acc: any, row: any) => ({
      entries: acc.entries + Number(row.entries || 0),
      totalHours: acc.totalHours + Number(row.total_hours || 0),
      estimatedPay: acc.estimatedPay + Number(row.estimated_pay || 0)
    }), { entries: 0, totalHours: 0, estimatedPay: 0 });
    return { filters: params, totals, byEmployee, byBranch, payrollPlaceholder: true };
  }
}
