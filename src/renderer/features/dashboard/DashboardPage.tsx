import React from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useErp } from '../../app/providers/ErpContext';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { DashboardDateDetailDrawer } from './DashboardDateDetailDrawer';
import { DashboardFilter, DashboardMetricDetail, DashboardOverview } from '../../shared/types';

const money = (v: number) => `Rs. ${Number(v || 0).toLocaleString()}`;
const COLORS = ['#005f8f', '#22c55e', '#f59e0b', '#e11d48', '#8b5cf6', '#14b8a6', '#64748b'];

export const DashboardPage: React.FC = () => {
  const { accessibleBranches, activeBranchId, activeUser } = useErp();
  const [dateFrom, setDateFrom] = React.useState(new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = React.useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = React.useState(activeBranchId || '');
  const [cashierId, setCashierId] = React.useState('');
  const [registerId, setRegisterId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [overview, setOverview] = React.useState<DashboardOverview | null>(null);
  const [trend, setTrend] = React.useState<any[]>([]);
  const [payment, setPayment] = React.useState<any[]>([]);
  const [topProducts, setTopProducts] = React.useState<any[]>([]);
  const [shifts, setShifts] = React.useState<any[]>([]);
  const [recent, setRecent] = React.useState<any[]>([]);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailData, setDetailData] = React.useState<DashboardMetricDetail | null>(null);

  React.useEffect(() => {
    setBranchId(activeBranchId || '');
  }, [activeBranchId]);

  const filters: DashboardFilter = {
    date_from: dateFrom,
    date_to: dateTo,
    branch_id: branchId || undefined,
    cashier_id: cashierId || undefined,
    register_id: registerId || undefined
  };

  const load = async () => {
    setLoading(true);
    try {
      const [o, s, p, t, a, sh] = await Promise.all([
        window.api.dashboard.getOverview(filters),
        window.api.dashboard.getSalesTrend(filters),
        window.api.dashboard.getPaymentBreakdown(filters),
        window.api.dashboard.getTopProducts(filters),
        window.api.dashboard.getRecentActivity(filters),
        window.api.dashboard.getShiftSummary(filters)
      ]);
      setOverview(o);
      setTrend(s.rows || []);
      setPayment(p.rows || []);
      setTopProducts(t.rows || []);
      setRecent(a.rows || []);
      setShifts(sh.rows || []);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [dateFrom, dateTo, branchId]);

  const openMetricDetail = async (metric: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await window.api.dashboard.getMetricDetail(metric, filters);
      setDetailData(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const metrics = overview?.metrics || {};
  const cards = [
    { key: 'today_pos_sales', label: 'Today POS Sales', metric: 'pos_sales' },
    { key: 'today_invoice_sales', label: 'Today Invoice Sales', metric: 'invoice_sales' },
    { key: 'total_collections', label: 'Total Collections', metric: 'invoice_sales' },
    { key: 'cash_in_hand', label: 'Cash in Hand', metric: 'cash_in_hand' },
    { key: 'khata_outstanding', label: 'Khata Outstanding', metric: 'khata_due' },
    { key: 'supplier_payables', label: 'Supplier Payables', metric: 'khata_due' },
    { key: 'today_expenses', label: 'Today Expenses', metric: 'expenses' },
    { key: 'gross_profit_estimate', label: 'Gross Profit Est.', metric: 'top_products' },
    { key: 'net_profit_estimate', label: 'Net Profit Est.', metric: 'top_products' },
    { key: 'total_returns', label: 'Returns', metric: 'returns' },
    { key: 'total_discounts', label: 'Discounts', metric: 'discounts' },
    { key: 'low_stock_items', label: 'Low Stock Items', metric: 'low_stock' },
    { key: 'open_shifts', label: 'Open Shifts', metric: 'open_shifts' },
    { key: 'cash_short_over', label: 'Cash Short/Over', metric: 'cash_in_hand' },
    { key: 'pending_invoices', label: 'Pending Invoices', metric: 'invoice_sales' },
    { key: 'overdue_customers', label: 'Overdue Customers', metric: 'khata_due' }
  ] as const;

  return (
    <div className="space-y-4">
      <Card title="Dashboard Filters">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div><label className="text-[10px] font-bold uppercase text-slate-500">From</label><input className="erp-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div><label className="text-[10px] font-bold uppercase text-slate-500">To</label><input className="erp-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Branch</label>
            <select className="erp-input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {accessibleBranches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
            </select>
          </div>
          <div><label className="text-[10px] font-bold uppercase text-slate-500">Cashier</label><input className="erp-input" value={cashierId} onChange={(e) => setCashierId(e.target.value)} placeholder="Cashier ID" /></div>
          <div><label className="text-[10px] font-bold uppercase text-slate-500">Register</label><input className="erp-input" value={registerId} onChange={(e) => setRegisterId(e.target.value)} placeholder="Register ID" /></div>
          <div className="flex items-end"><Button onClick={load} disabled={loading}>Refresh</Button></div>
        </div>
      </Card>

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <button key={c.key} onClick={() => openMetricDetail(c.metric)} className="text-left bg-white border border-slate-200 rounded-[6px] p-3 hover:border-primary-blue">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{c.label}</div>
            <div className="text-sm font-extrabold text-slate-800 mt-1">{money(metrics[c.key] || 0)}</div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Sales Trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#005f8f" strokeWidth={2} />
                <Line type="monotone" dataKey="transactions" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Payment Breakdown">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={payment} dataKey="amount" nameKey="payment_method" outerRadius={85}>
                  {payment.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Products">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#005f8f" />
                <Bar dataKey="profit" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Shift Summary">
          <table className="erp-table text-xs">
            <thead><tr><th>Cashier</th><th>Register</th><th>Status</th><th>Expected</th><th>Diff</th></tr></thead>
            <tbody>
              {shifts.slice(0, 8).map((s: any) => (
                <tr key={s.id}><td>{s.cashier_name}</td><td>{s.register_id}</td><td>{s.status}</td><td>{money(s.expected_cash)}</td><td>{money(s.difference || 0)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent Activity">
          <table className="erp-table text-xs">
            <thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {recent.slice(0, 8).map((r: any, idx: number) => (
                <tr key={idx}><td>{r.created_at}</td><td>{r.action}</td><td>{r.details}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <DashboardDateDetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)} data={detailData} loading={detailLoading} />
    </div>
  );
};
