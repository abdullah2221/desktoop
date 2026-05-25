import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { SaleRepository } from '../repositories/SaleRepository';

export function registerSaleHandlers() {
  const canViewSales = (token: string) => (
    AuthRepository.hasPermission(token, 'sales.view.own')
    || AuthRepository.hasPermission(token, 'sales.view.branch')
    || AuthRepository.hasPermission(token, 'sales.view.all')
    || AuthRepository.hasPermission(token, 'pos.sale.create')
  );

  const scopedSales = (token: string, filters: any = {}) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    if (AuthRepository.hasPermission(token, 'sales.view.all')) {
      return SaleRepository.getHistory(filters);
    }
    if (AuthRepository.hasPermission(token, 'sales.view.branch')) {
      const branchId = filters.branch_id || user.branch_id;
      if (branchId) AuthRepository.requireBranchAccess(token, branchId);
      return SaleRepository.getHistory({ ...filters, branch_id: branchId });
    }
    if (AuthRepository.hasPermission(token, 'sales.view.own') || AuthRepository.hasPermission(token, 'pos.sale.create')) {
      return SaleRepository.getByCashier(user.id, {
        ...filters,
        branch_id: filters.branch_id || user.branch_id
      });
    }
    throw new Error('Unauthorized');
  };

  const getScopedSaleByInvoiceNo = (token: string, invoiceNo: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    const row = SaleRepository.getById(invoiceNo) as any;
    if (!row) return null;
    if (AuthRepository.hasPermission(token, 'sales.view.all')) return row;
    if (AuthRepository.hasPermission(token, 'sales.view.branch')) {
      AuthRepository.requireBranchAccess(token, row.branch_id || user.branch_id || '');
      return row;
    }
    if ((AuthRepository.hasPermission(token, 'sales.view.own') || AuthRepository.hasPermission(token, 'pos.sale.create')) && row.cashier_id === user.id) {
      return row;
    }
    throw new Error('Unauthorized');
  };

  ipcMain.handle('sales:getAll', (_, token: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return scopedSales(token, { limit: 500 });
  });

  ipcMain.handle('sales:getRecent', (_, token: string, filters?: any) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return scopedSales(token, { ...(filters || {}), limit: Math.min(Number(filters?.limit || 10), 100) });
  });

  ipcMain.handle('sales:getById', (_, token: string, invoiceNo: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return getScopedSaleByInvoiceNo(token, invoiceNo);
  });

  ipcMain.handle('sales:getItems', (_, token: string, invoiceNo: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    const row = getScopedSaleByInvoiceNo(token, invoiceNo);
    if (!row) return [];
    return SaleRepository.getItems(invoiceNo);
  });

  ipcMain.handle('sales:getByCustomer', (_, token: string, customerIdOrName: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return scopedSales(token, { customer: customerIdOrName, limit: 1000 });
  });

  ipcMain.handle('sales:getByShift', (_, token: string, shiftId: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return SaleRepository.getByShift(shiftId);
  });

  ipcMain.handle('sales:getByBranch', (_, token: string, branchId: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    AuthRepository.requireBranchAccess(token, branchId);
    return SaleRepository.getByBranch(branchId);
  });

  ipcMain.handle('sales:getHistory', (_, token: string, filters?: any) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    return scopedSales(token, filters || {});
  });

  ipcMain.handle('sales:getReceiptDetail', (_, token: string, invoiceNo: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    const row = getScopedSaleByInvoiceNo(token, invoiceNo);
    if (!row) return null;
    return SaleRepository.getReceiptDetail(invoiceNo);
  });

  ipcMain.handle('sales:getAuditTrail', (_, token: string, invoiceNo: string) => {
    if (!canViewSales(token)) throw new Error('Unauthorized');
    if (!AuthRepository.hasPermission(token, 'sales.view.branch') && !AuthRepository.hasPermission(token, 'sales.view.all') && !AuthRepository.hasPermission(token, 'users.manage')) {
      throw new Error('Unauthorized');
    }
    return SaleRepository.getAuditTrail(invoiceNo);
  });

  ipcMain.handle('sales:void', (_, token: string, invoiceNo: string, reason: string) => {
    const user = AuthRepository.getCurrentUser(token);
    if (!user) throw new Error('Unauthorized');
    AuthRepository.requirePermission(token, 'sales.void');
    return SaleRepository.voidSale(invoiceNo, reason, { user_id: user.id, name: user.full_name || user.username });
  });

  ipcMain.handle('sales:create', (_, token: string, sale: any) => {
    const user = AuthRepository.getCurrentUser(token);
    AuthRepository.requirePermission(token, 'pos.sale.create');
    if (sale?.branch_id) AuthRepository.requireBranchAccess(token, sale.branch_id);
    return SaleRepository.create({
      ...sale,
      cashier_id: sale?.cashier_id || user?.id || null,
      cashier_name: sale?.cashier_name || user?.full_name || user?.username || 'System Cashier'
    });
  });
}
