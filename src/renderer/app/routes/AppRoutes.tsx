import React from 'react';
import { useErp } from '../providers/ErpContext';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { PosPage } from '../../features/pos/PosPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { CustomersPage } from '../../features/customers/CustomersPage';
import { ExpensesPage } from '../../features/expenses/ExpensesPage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { SuppliersPage } from '../../features/suppliers/SuppliersPage';
import { PurchasesPage } from '../../features/purchases/PurchasesPage';
import { AccountingPage } from '../../features/accounting/AccountingPage';
import { SalesPage } from '../../features/sales/SalesPage';
import { TaxSettingsPage } from '../../features/taxes/TaxSettingsPage';
import { BankingPage } from '../../features/banking/BankingPage';
import { ReportsPage } from '../../features/reports/ReportsPage';
import { UsersPage } from '../../features/users/UsersPage';
import { BackupRestorePage } from '../../features/backup/BackupRestorePage';
import { BranchesPage } from '../../features/branches/BranchesPage';

const routePermissions: Record<string, string | string[] | null> = {
  dashboard: null,
  pos: 'pos.sale.create',
  inventory: 'inventory.product.edit',
  purchases: 'purchase.create',
  customers: 'pos.sale.create',
  suppliers: 'supplier.edit',
  expenses: 'purchase.create',
  accounting: 'accounting.journal.create',
  sales: 'pos.sale.create',
  taxes: 'taxes.manage',
  banking: 'banking.manage',
  reports: 'reports.view',
  users: 'users.manage',
  branches: 'branch.manage',
  backup: ['backup.manage', 'settings.edit'],
  settings: 'settings.edit'
};

export const AppRoutes: React.FC = () => {
  const { activeTab } = useErp();
  const { hasPermission } = useErp();
  const requiredPermission = routePermissions[activeTab];
  const allowed = Array.isArray(requiredPermission)
    ? requiredPermission.some((permission) => hasPermission(permission))
    : !requiredPermission || hasPermission(requiredPermission);
  if (!allowed) {
    return <div className="bg-white border border-slate-200 rounded-[6px] p-8 text-sm text-slate-600">You do not have permission to access this module.</div>;
  }

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'pos':
      return <PosPage />;
    case 'inventory':
      return <InventoryPage />;
    case 'purchases':
      return <PurchasesPage />;
    case 'customers':
      return <CustomersPage />;
    case 'suppliers':
      return <SuppliersPage />;
    case 'expenses':
      return <ExpensesPage />;
    case 'accounting':
      return <AccountingPage />;
    case 'sales':
      return <SalesPage />;
    case 'taxes':
      return <TaxSettingsPage />;
    case 'banking':
      return <BankingPage />;
    case 'reports':
      return <ReportsPage />;
    case 'users':
      return <UsersPage />;
    case 'branches':
      return <BranchesPage />;
    case 'backup':
      return <BackupRestorePage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};
