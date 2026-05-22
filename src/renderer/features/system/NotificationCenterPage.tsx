import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, CircleAlert, CircleDotDashed, CircleOff, Info } from 'lucide-react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import type { NotificationItem } from '../../shared/types';

type NotificationTab = 'all' | 'inventory' | 'customers' | 'suppliers' | 'system' | 'dismissed';

const tabs: Array<{ id: NotificationTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customers', label: 'Customers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'system', label: 'System' },
  { id: 'dismissed', label: 'Dismissed' }
];

export const NotificationCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRows = async (tab: NotificationTab = activeTab) => {
    setLoading(true);
    try {
      const data = await window.api.notifications.getAll(tab);
      setRows((data || []) as NotificationItem[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(activeTab);
  }, [activeTab]);

  const counts = useMemo(() => {
    const next = { unread: 0, critical: 0 };
    for (const row of rows) {
      if (row.status === 'unread') next.unread += 1;
      if (row.severity === 'critical') next.critical += 1;
    }
    return next;
  }, [rows]);

  const markRead = async (id: string) => {
    await window.api.notifications.markRead(id);
    await loadRows();
  };

  const dismiss = async (id: string) => {
    await window.api.notifications.dismiss(id);
    await loadRows();
  };

  const markAll = async () => {
    await window.api.notifications.markAllRead();
    await loadRows();
  };

  return (
    <div className="space-y-4">
      <Card title="Notification Center" subtitle="Operational alerts, due reminders, and system events">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] border ${activeTab === tab.id ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">Unread: {counts.unread}</span>
            <span className="px-2 py-1 rounded bg-red-50 text-red-700">Critical: {counts.critical}</span>
            <Button size="sm" onClick={markAll}><CheckCheck className="w-3.5 h-3.5" /> Mark all as read</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {loading && <Card><p className="text-xs text-slate-500">Loading notifications...</p></Card>}
        {!loading && rows.length === 0 && (
          <Card>
            <div className="text-xs text-slate-500 flex items-center gap-2"><CircleOff className="w-4 h-4" /> No notifications in this tab.</div>
          </Card>
        )}
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {row.severity === 'critical' ? <CircleAlert className="w-4 h-4 text-red-600" /> : row.severity === 'warning' ? <CircleDotDashed className="w-4 h-4 text-amber-600" /> : <Info className="w-4 h-4 text-sky-600" />}
                  <span className="font-bold text-slate-800">{row.title}</span>
                  <span className="text-[10px] uppercase bg-slate-100 px-1.5 py-0.5 rounded">{row.category}</span>
                  {row.status === 'unread' && <span className="text-[10px] uppercase bg-primary-light text-primary-blue px-1.5 py-0.5 rounded">Unread</span>}
                </div>
                <p className="text-xs text-slate-600">{row.message}</p>
                <p className="text-[10px] text-slate-400">{row.created_at} {row.due_date ? `• due ${row.due_date}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {row.status !== 'read' && row.status !== 'dismissed' && (
                  <button className="text-[11px] font-semibold text-primary-blue hover:underline" onClick={() => markRead(row.id)}>Mark read</button>
                )}
                {row.status !== 'dismissed' && (
                  <button className="text-[11px] font-semibold text-slate-500 hover:underline" onClick={() => dismiss(row.id)}>Dismiss</button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.api.notifications.scan()}><Bell className="w-3.5 h-3.5" /> Run alert scan</Button>
      </div>
    </div>
  );
};
