import React from 'react';
import { useErp } from '../providers/ErpContext';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { PosPage } from '../../features/pos/PosPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { KhataPage } from '../../features/customers/KhataPage';
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
import { BudgetsPage } from '../../features/budgets/BudgetsPage';
import { AutomationPage } from '../../features/automation/AutomationPage';
import { EmployeesPage } from '../../features/employees/EmployeesPage';
import { TimeTrackingPage } from '../../features/time/TimeTrackingPage';
import { CurrencySettingsPage } from '../../features/currency/CurrencySettingsPage';
import { InventoryTransfersPage } from '../../features/inventory/InventoryTransfersPage';
import { DataSyncPage } from '../../features/datasync/DataSyncPage';
import { SystemHealthPage } from '../../features/system/SystemHealthPage';
import { SalesReturnsPage } from '../../features/sales/SalesReturnsPage';
import { PurchaseReturnsPage } from '../../features/purchases/PurchaseReturnsPage';
import { NotificationCenterPage } from '../../features/system/NotificationCenterPage';

const routePermissions: Record<string, string | string[] | null> = {
  dashboard: null,
  pos: 'pos.sale.create',
  inventory: 'inventory.product.edit',
  warehouse: ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust'],
  purchases: 'purchase.create',
  purchase_returns: 'returns.view',
  suppliers: 'supplier.edit',
  customers: 'khata.view',
  sales: ['sales.view.own', 'sales.view.branch', 'sales.view.all', 'pos.sale.create'],
  sales_returns: 'returns.view',
  taxes: 'taxes.manage',
  banking: 'banking.manage',
  expenses: 'purchase.create',
  accounting: 'accounting.journal.create',
  reports: 'reports.view',
  budgets: ['budget.manage', 'reports.view'],
  automation: 'automation.manage',
  employees: 'employees.manage',
  time: ['time.track', 'time.approve'],
  currency: 'currency.manage',
  users: 'users.manage',
  branches: 'branch.manage',
  backup: ['backup.manage', 'settings.edit'],
  datasync: ['data.import', 'data.export'],
  system: null,
  notifications: 'notifications.view',
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
    return (
      <div className="bg-white border border-slate-200 rounded-[6px] p-8 text-sm text-slate-600">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Access Restricted</h3>
        <p>Your role does not currently include permission for this module.</p>
        <p className="mt-1 text-xs text-slate-500">Ask an administrator to update your role permissions.</p>
      </div>
    );
  }

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'pos':
      return <PosPage />;
    case 'inventory':
      return <InventoryPage />;
    case 'warehouse':
      return <InventoryTransfersPage />;
    case 'purchases':
      return <PurchasesPage />;
    case 'purchase_returns':
      return <PurchaseReturnsPage />;
    case 'suppliers':
      return <SuppliersPage />;
    case 'customers':
      return <KhataPage />;
    case 'expenses':
      return <ExpensesPage />;
    case 'accounting':
      return <AccountingPage />;
    case 'sales':
      return <SalesPage />;
    case 'sales_returns':
      return <SalesReturnsPage />;
    case 'taxes':
      return <TaxSettingsPage />;
    case 'banking':
      return <BankingPage />;
    case 'reports':
      return <ReportsPage />;
    case 'budgets':
      return <BudgetsPage />;
    case 'automation':
      return <AutomationPage />;
    case 'employees':
      return <EmployeesPage />;
    case 'time':
      return <TimeTrackingPage />;
    case 'currency':
      return <CurrencySettingsPage />;
    case 'users':
      return <UsersPage />;
    case 'branches':
      return <BranchesPage />;
    case 'backup':
      return <BackupRestorePage />;
    case 'datasync':
      return <DataSyncPage />;
    case 'system':
      return <SystemHealthPage />;
    case 'notifications':
      return <NotificationCenterPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};
