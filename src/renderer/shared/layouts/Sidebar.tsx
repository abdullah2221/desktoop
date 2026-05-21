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
  BookOpen
  ,
  FileText,
  Percent,
  Landmark,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasPermission?: (permission: string) => boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  hasPermission = () => true
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
    { id: 'pos', label: 'POS Billing', icon: CreditCard, badge: 'Active', permission: 'pos.sale.create' },
    { id: 'inventory', label: 'Inventory', icon: Layers, permission: 'inventory.product.edit' },
    { id: 'purchases', label: 'Purchases / Stock In', icon: ShoppingBag, permission: 'purchase.create' },
    { id: 'suppliers', label: 'Suppliers / Vendors', icon: Users, permission: 'supplier.edit' },
    { id: 'customers', label: 'Customers / Udhaar', icon: Users, permission: 'pos.sale.create' },
    { id: 'sales', label: 'Sales Invoices', icon: FileText, permission: 'pos.sale.create' },
    { id: 'taxes', label: 'Taxes', icon: Percent, permission: 'taxes.manage' },
    { id: 'banking', label: 'Banking', icon: Landmark, permission: 'banking.manage' },
    { id: 'expenses', label: 'Expense Ledger', icon: Coins, permission: 'purchase.create' },
    { id: 'accounting', label: 'Accounting', icon: BookOpen, permission: 'accounting.journal.create' },
    { id: 'reports', label: 'Reports', icon: ClipboardList, permission: 'reports.view' },
    { id: 'users', label: 'Users & Roles', icon: Settings, permission: 'users.manage' },
    { id: 'settings', label: 'Store Settings', icon: Settings, permission: 'settings.edit' }
  ].filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm">
      <div>
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
        <nav className="p-3 space-y-1">
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
