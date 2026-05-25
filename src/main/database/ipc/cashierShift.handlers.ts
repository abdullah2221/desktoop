import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { CashierShiftRepository } from '../repositories/CashierShiftRepository';

export function registerCashierShiftHandlers() {
  ipcMain.handle('cashierShifts:getRegisters', (_, token: string, branchId?: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return CashierShiftRepository.getRegisters(branchId);
  });

  ipcMain.handle('cashierShifts:getActiveShift', (_, token: string, branchId: string, registerId: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'pos.sale.create');
    AuthRepository.requireBranchAccess(token, branchId);
    return CashierShiftRepository.getActiveShift(user.id, branchId, registerId) || null;
  });

  ipcMain.handle('cashierShifts:openShift', (_, token: string, payload: any) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'shift.open');
    AuthRepository.requireBranchAccess(token, payload.branch_id);
    return CashierShiftRepository.openShift({
      user_id: user.id,
      cashier_name: user.full_name || user.username,
      branch_id: payload.branch_id,
      register_id: payload.register_id,
      opening_cash: Number(payload.opening_cash || 0),
      notes: payload.notes || ''
    });
  });

  ipcMain.handle('cashierShifts:getShiftSummary', (_, token: string, shiftId: string) => {
    AuthRepository.requirePermission(token, 'pos.sale.create');
    return CashierShiftRepository.getShiftSummary(shiftId);
  });

  ipcMain.handle('cashierShifts:closeShift', (_, token: string, payload: any) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'shift.close');
    return CashierShiftRepository.closeShift({
      shift_id: payload.shift_id,
      counted_cash: Number(payload.counted_cash || 0),
      notes: payload.notes || `Closed by ${user.full_name || user.username}`
    });
  });

  ipcMain.handle('cashierShifts:forceCloseShift', (_, token: string, payload: any) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'shift.force_close');
    return CashierShiftRepository.forceCloseShift({
      shift_id: payload.shift_id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.username,
      counted_cash: payload.counted_cash == null ? undefined : Number(payload.counted_cash),
      notes: payload.notes || ''
    });
  });

  ipcMain.handle('cashierShifts:suspendShift', (_, token: string, shiftId: string, notes?: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'shift.close');
    return CashierShiftRepository.suspendShift(shiftId, user.id, user.full_name || user.username, notes);
  });

  ipcMain.handle('cashierShifts:resumeShift', (_, token: string, shiftId: string, notes?: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'shift.open');
    return CashierShiftRepository.resumeShift(shiftId, user.id, user.full_name || user.username, notes);
  });

  ipcMain.handle('cashierShifts:getOpenShifts', (_, token: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    const canManage = AuthRepository.hasPermission(token, 'users.manage') || AuthRepository.hasPermission(token, 'accounting.manage') || AuthRepository.hasPermission(token, 'shift.force_close');
    if (!canManage && user.role_id !== 'R001' && user.role_id !== 'R002') {
      throw new Error('Unauthorized');
    }
    return CashierShiftRepository.getOpenShifts();
  });
}
