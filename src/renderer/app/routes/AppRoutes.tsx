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

export const AppRoutes: React.FC = () => {
  const { activeTab } = useErp();

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
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};
