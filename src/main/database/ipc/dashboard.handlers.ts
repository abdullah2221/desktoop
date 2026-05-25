import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { DashboardRepository, DashboardFilter, DashboardMetricKey } from '../repositories/DashboardRepository';

function applyRoleScope(token: string, filters: DashboardFilter = {}) {
  const user = AuthRepository.getCurrentUser(token);
  if (!user) throw new Error('Unauthorized');

  const scoped: DashboardFilter = { ...filters };

  if (user.role_id === 'R003') {
    scoped.cashier_id = user.id;
    scoped.branch_id = user.branch_id;
  } else if (user.role_id === 'R002') {
    scoped.branch_id = scoped.branch_id || user.branch_id;
  }

  if (scoped.branch_id) AuthRepository.requireBranchAccess(token, scoped.branch_id);
  return scoped;
}

export function registerDashboardHandlers() {
  const requireDashboard = (token: string) => {
    const ok =
      AuthRepository.hasPermission(token, 'reports.view') ||
      AuthRepository.hasPermission(token, 'pos.sale.create') ||
      AuthRepository.hasPermission(token, 'accounting.journal.create');
    if (!ok) throw new Error('Unauthorized: dashboard access denied.');
  };

  ipcMain.handle('dashboard:getOverview', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getOverview(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getSalesTrend', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getSalesTrend(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getPaymentBreakdown', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getPaymentBreakdown(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getTopProducts', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getTopProducts(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getRecentActivity', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getRecentActivity(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getShiftSummary', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getShiftSummary(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getLowStock', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getLowStock(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getReceivablesPayables', (_, token: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getReceivablesPayables(applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getDateDetail', (_, token: string, date: string, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getDateDetail(date, applyRoleScope(token, filters));
  });

  ipcMain.handle('dashboard:getMetricDetail', (_, token: string, metric: DashboardMetricKey, filters: DashboardFilter) => {
    requireDashboard(token);
    return DashboardRepository.getMetricDetail(metric, applyRoleScope(token, filters));
  });
}
