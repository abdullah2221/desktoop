import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { TimesheetRepository } from '../repositories/TimesheetRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireAny(token: string, permissions: string[]) {
  if (!permissions.some((permission) => AuthRepository.hasPermission(token, permission))) {
    throw new Error(`Unauthorized: one of ${permissions.join(', ')} is required.`);
  }
}

function requireBranch(token: string, branchId?: string | null) {
  if (branchId) AuthRepository.requireBranchAccess(token, branchId);
}

export function registerEmployeeHandlers() {
  ipcMain.handle('employees:getAll', (_, token: string) => {
    requireAny(token, ['employees.manage', 'time.track', 'time.approve']);
    return EmployeeRepository.getAll();
  });
  ipcMain.handle('employees:create', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'employees.manage');
    requireBranch(token, payload?.branch_id);
    return EmployeeRepository.create(payload, actorId(token));
  });
  ipcMain.handle('employees:update', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'employees.manage');
    requireBranch(token, payload?.branch_id);
    return EmployeeRepository.update(payload, actorId(token));
  });
  ipcMain.handle('employees:deactivate', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'employees.manage');
    return EmployeeRepository.deactivate(id, actorId(token));
  });

  ipcMain.handle('timesheets:getAll', (_, token: string, filters: any) => {
    requireAny(token, ['employees.manage', 'time.track', 'time.approve']);
    requireBranch(token, filters?.branchId);
    return TimesheetRepository.getAll(filters || {});
  });
  ipcMain.handle('timesheets:clockIn', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'time.track');
    requireBranch(token, payload?.branch_id);
    return TimesheetRepository.clockIn(payload, actorId(token));
  });
  ipcMain.handle('timesheets:clockOut', (_, token: string, id: string, payload: any) => {
    AuthRepository.requirePermission(token, 'time.track');
    return TimesheetRepository.clockOut(id, payload || {}, actorId(token));
  });
  ipcMain.handle('timesheets:createManual', (_, token: string, payload: any) => {
    AuthRepository.requirePermission(token, 'time.track');
    requireBranch(token, payload?.branch_id);
    return TimesheetRepository.createManual(payload, actorId(token));
  });
  ipcMain.handle('timesheets:approve', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'time.approve');
    return TimesheetRepository.approve(id, actorId(token));
  });
  ipcMain.handle('timesheets:summary', (_, token: string, filters: any) => {
    requireAny(token, ['employees.manage', 'time.track', 'time.approve', 'reports.view']);
    requireBranch(token, filters?.branchId);
    return TimesheetRepository.summary(filters || {});
  });
}
