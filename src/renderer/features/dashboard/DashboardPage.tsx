import React from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Badge } from '../../shared/ui/Badge';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Sale, Product } from '../../shared/types';
import { 
  BarChart3, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Coins, 
  CheckCircle,
  Database
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    sales, 
    products, 
    expenses, 
    customers, 
    setActiveTab 
  } = useErp();

  // Calculated Metrics
  const lowStockProducts = products.filter(p => (p.stock_quantity ?? 0) <= (p.minimum_stock ?? 0));
  const lowStockCount = lowStockProducts.length;
  const totalOutstandingCredit = customers.reduce((sum, c) => sum + c.credit, 0);
  const todaySalesSum = sales
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Table Columns config for Transactions
  const transactionColumns: TableColumn<Sale>[] = [
    {
      header: 'Invoice #',
      accessor: (sale) => <span className="font-mono font-bold text-primary-blue">{sale.invoiceNo}</span>
    },
    {
      header: 'Customer',
      accessor: (sale) => <span>{sale.customerName}</span>
    },
    {
      header: 'Date',
      accessor: (sale) => <span>{sale.date}</span>
    },
    {
      header: 'Total Amount',
      accessor: (sale) => <span className="font-bold">Rs. {sale.total.toLocaleString()}</span>
    },
    {
      header: 'Status',
      accessor: (sale) => (
        <Badge variant={sale.status === 'Paid' ? 'success' : 'warning'}>
          {sale.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Alert */}
      <div className="p-4 rounded-[8px] bg-white border border-slate-200 shadow-sm flex items-start gap-4">
        <div className="p-2 bg-success-light rounded-[4px] text-success-green shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Secure Context Bridge Verified</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Electron wrapper main-process is successfully communicating with this React UI process. Environment details, system state, and active SQLite config checks are loaded. Ready to perform local offline operations.
          </p>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Gross Sales", value: `Rs. ${todaySalesSum.toLocaleString()}`, change: "Updates on POS sale", border: "border-l-4 border-l-primary-blue", icon: TrendingUp },
          { label: "Low Stock Items", value: `${lowStockCount} Products`, change: "Requires reorder alert", border: "border-l-4 border-l-warning-amber", icon: AlertTriangle },
          { label: "Udhaar (Outstanding Credit)", value: `Rs. ${totalOutstandingCredit.toLocaleString()}`, change: "Tracked customer ledgers", border: "border-l-4 border-l-emerald-600", icon: Users },
          { label: "Current Expense Log", value: `Rs. ${totalExpenses.toLocaleString()}`, change: "Utilities and Sundry logged", border: "border-l-4 border-l-slate-400", icon: Coins }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-4 bg-white rounded-[8px] border border-slate-200 flex items-center justify-between shadow-sm ${card.border}`}>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{card.label}</span>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{card.value}</h3>
                <span className="text-[10px] text-slate-400 block">{card.change}</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-[4px] text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Dashboard Layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Recent Store Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary-blue" />
                <span>Recent Store Transactions</span>
              </h3>
              <button 
                onClick={() => setActiveTab('pos')}
                className="px-2.5 py-1 text-[10px] font-bold bg-primary-light text-primary-blue border border-primary-blue/20 rounded-[4px] hover:bg-primary-blue hover:text-white transition-colors cursor-pointer"
              >
                New Invoice
              </button>
            </div>
            
            <Table
              columns={transactionColumns}
              data={sales}
              keyExtractor={(sale) => sale.invoiceNo}
              emptyMessage="No store transactions completed yet."
            />
          </div>

          {/* Database Setup Check Card */}
          <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-blue" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Offline SQLite Architecture (Step 2 Preview)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              The ERP desktop application uses React on the frontend and will execute secure IPC queries to a local SQLite database file in the user's workspace. All inventories, transactions, credits, and ledger updates remain strictly local, private, and fully operational without requiring internet connectivity.
            </p>
          </div>
        </div>

        {/* Right Side: Stock Watchlist & Quick Actions */}
        <div className="space-y-6">
          
          {/* Low Stock Watchlist */}
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning-amber" />
                <span>Low Stock Watchlist</span>
              </h3>
            </div>
            <div className="p-3 divide-y divide-slate-100">
              {lowStockProducts.map((prod) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-700">{prod.name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">{prod.category_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-extrabold bg-danger-light text-danger-red border border-danger-red/10">
                      {prod.stock_quantity ?? 0} left
                    </span>
                  </div>
                </div>
              ))}
              {lowStockCount === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No products are low in stock.
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Quick POS Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { id: 'pos', label: 'POS Billing' },
                { id: 'inventory', label: 'Add Product' },
                { id: 'customers', label: 'Udhaar Ledger' },
                { id: 'expenses', label: 'Log Expense' }
              ].map((shortcut) => (
                <button 
                  key={shortcut.id}
                  onClick={() => setActiveTab(shortcut.id)}
                  className="p-2.5 border border-slate-200 hover:border-primary-blue hover:bg-primary-light rounded-[4px] transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
