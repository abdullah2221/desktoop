import React from 'react';
import { 
  ShoppingBag, 
  Layers, 
  Users, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Coins, 
  Database,
  BookOpen,
  FileText,
  Percent,
  Landmark,
  ClipboardList,
  Building2,
  Target,
  Repeat,
  UserRoundCheck,
  Timer,
  BadgeDollarSign,
  Warehouse,
  Activity,
  Undo2,
  Bell
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasPermission?: (permission: string) => boolean;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  hasPermission = () => true,
  userRole = ''
}) => {
  const roleKey = userRole.toLowerCase();
  const isCashierRole = roleKey.includes('cashier');
  const cashierAllowed = new Set([
    'dashboard', 'pos', 'sales', 'customers', 'inventory', 'sales_returns', 'notifications'
  ]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
    { id: 'pos', label: 'POS / Billing', icon: CreditCard, badge: 'Active', permission: 'pos.sale.create' },
    { id: 'sales', label: 'Sales / Receipts', icon: FileText, permission: ['sales.view.own', 'sales.view.branch', 'sales.view.all', 'pos.sale.create'] },
    { id: 'customers', label: 'Customers / Khata', icon: Users, permission: ['customers.view', 'khata.view'] },
    { id: 'inventory', label: 'Products / Inventory', icon: Layers, permission: 'inventory.product.edit' },
    { id: 'warehouse', label: 'Warehouse / Stock', icon: Warehouse, permission: ['inventory.view.branch', 'inventory.transfer', 'inventory.adjust'] },
    { id: 'purchases', label: 'Purchases / Suppliers', icon: ShoppingBag, permission: 'purchase.create' },
    { id: 'suppliers', label: 'Suppliers', icon: Users, permission: 'supplier.edit' },
    { id: 'expenses', label: 'Expenses', icon: Coins, permission: 'purchase.create' },
    { id: 'banking', label: 'Banking', icon: Landmark, permission: 'banking.manage' },
    { id: 'accounting', label: 'Accounting', icon: BookOpen, permission: 'accounting.journal.create' },
    { id: 'reports', label: 'Reports', icon: ClipboardList, permission: 'reports.view' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
    { id: 'employees', label: 'Employees', icon: UserRoundCheck, permission: 'employees.manage' },
    { id: 'time', label: 'Time', icon: Timer, permission: ['time.track', 'time.approve'] },
    { id: 'automation', label: 'Automation', icon: Repeat, permission: 'automation.manage' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings.edit' },
    { id: 'users', label: 'Users & Roles', icon: Settings, permission: 'users.manage' },
    { id: 'backup', label: 'Backup & Restore', icon: Database, permission: ['backup.manage', 'backup.view', 'backup.create', 'backup.restore', 'backup.export', 'backup.import', 'settings.edit'] },
    { id: 'system', label: 'System Health', icon: Activity, permission: null },

    // Secondary modules retained for completeness, kept below primary workflow
    { id: 'budgets', label: 'Budgets & P&L', icon: Target, permission: ['budget.manage', 'reports.view'] },
    { id: 'sales_returns', label: 'Sales Returns', icon: Undo2, permission: 'returns.view' },
    { id: 'purchase_returns', label: 'Purchase Returns', icon: Undo2, permission: 'returns.view' },
    { id: 'taxes', label: 'Taxes', icon: Percent, permission: 'taxes.manage' },
    { id: 'currency', label: 'Currencies', icon: BadgeDollarSign, permission: 'currency.manage' },
    { id: 'branches', label: 'Branches & Classes', icon: Building2, permission: 'branch.manage' },
    { id: 'datasync', label: 'Data Sync (Excel/CSV)', icon: Repeat, permission: ['data.import', 'data.export'] }
  ].filter((item) => {
    if (isCashierRole && !cashierAllowed.has(item.id)) return false;
    return !item.permission || (Array.isArray(item.permission) ? item.permission.some(hasPermission) : hasPermission(item.permission));
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm h-screen">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Logo Section */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <div className="p-2 bg-primary-blue text-white rounded-[4px]">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-slate-800 uppercase">SwiftPOS ERP</h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Retail Accounting</span>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
          <nav className="space-y-1 pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-primary-blue text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                      isActive ? 'bg-[#015481] text-white' : 'bg-primary-light text-primary-blue'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Local Environment Chip */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="p-3 bg-white rounded-[6px] border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-success-green">
            <span className="w-2 h-2 rounded-full bg-success-green"></span>
            <span>Offline-First Engine</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>SQLite Database: Setup Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
