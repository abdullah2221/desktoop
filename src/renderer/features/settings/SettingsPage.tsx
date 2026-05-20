import React, { useState, useEffect } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { 
  Database, 
  Download, 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';

interface DbStats {
  products: number;
  customers: number;
  sales: number;
  expenses: number;
  auditLogs: number;
}

export const SettingsPage: React.FC = () => {
  const {
    storeName,
    storePhone,
    storeAddress,
    storeNTN,
    setStoreName,
    setStorePhone,
    setStoreAddress,
    setStoreNTN,
    notify
  } = useErp();

  // Diagnostics & Backup states
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  const fetchStats = async () => {
    if (!window.api || !window.api.system) return;
    setLoadingStats(true);
    try {
      const dbStats = await window.api.system.getStats();
      setStats(dbStats);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleBackup = async () => {
    if (!window.api || !window.api.system) return;
    setBackingUp(true);
    setBackupPath(null);
    try {
      const path = await window.api.system.backup();
      setBackupPath(path);
      await fetchStats(); // Refresh stats counts if audit log increased
    } catch (err) {
      console.error('Database backup failed:', err);
      notify('error', 'Backup process failed. Verify directory permissions.');
    } finally {
      setBackingUp(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Top Card: Settings panel */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">POS ERP Business Details</h3>
          <p className="text-xs text-slate-500">Configure receipt headers, local tax rates, and active storefront details.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Side: Text Inputs */}
          <div className="space-y-4">
            <Input
              label="Store / Business Name"
              id="settings-store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="font-bold text-slate-800 text-xs"
            />

            <Input
              label="Phone Number"
              id="settings-store-phone"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="font-mono text-xs"
            />

            <Input
              label="FBR NTN Number"
              id="settings-store-ntn"
              value={storeNTN}
              onChange={(e) => setStoreNTN(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Right Side: Address and Monospaced Receipt Preview */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="settings-store-address" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Store Address
              </label>
              <textarea 
                id="settings-store-address"
                rows={3}
                className="erp-input text-xs"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] text-xs leading-relaxed space-y-1">
              <span className="font-bold text-slate-700">Receipt Design Preview:</span>
              <p className="font-mono text-[10px] text-slate-500 select-all leading-normal bg-white p-2.5 rounded-[4px] border border-slate-200/50 mt-1 whitespace-pre-wrap">
                ====================================<br/>
                {storeName}<br/>
                {storeAddress}<br/>
                TEL: {storePhone} | NTN: {storeNTN}<br/>
                ====================================
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Database Management & Diagnostics Diagnostics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: DB Row stats counts */}
        <div className="md:col-span-2">
          <Card 
            title="SQLite Database Tables Inspection"
            headerActions={
              <button 
                onClick={fetchStats}
                disabled={loadingStats}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                title="Refresh Table Stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
              </button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Products In Catalog', value: stats?.products ?? 0, desc: 'SKU Inventory Items' },
                { label: 'Customers Logged', value: stats?.customers ?? 0, desc: 'Udhaar Ledgers' },
                { label: 'Sales Invoices', value: stats?.sales ?? 0, desc: 'Transaction Records' },
                { label: 'Expenses Logged', value: stats?.expenses ?? 0, desc: 'Sundry and Utilities' },
                { label: 'Audit Activity Logs', value: stats?.auditLogs ?? 0, desc: 'Local History Tracks' }
              ].map((stat, i) => (
                <div key={i} className="p-3 border border-slate-200 rounded-[6px] bg-slate-50/50 space-y-1 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-tight">{stat.label}</span>
                  <h4 className="text-lg font-extrabold text-slate-800 font-mono leading-none">{stat.value}</h4>
                  <span className="text-[9px] text-slate-400 font-medium block leading-none">{stat.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Database Backup panel */}
        <div>
          <Card title="Offline DB Backup Utility">
            <div className="space-y-4 text-left">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Store backups are created locally. Copying the file preserves the transaction histories and inventory stock levels securely.
              </p>

              <Button
                variant="primary"
                fullWidth
                onClick={handleBackup}
                disabled={backingUp}
                className="py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{backingUp ? 'Creating Backup...' : 'Backup SQLite Database'}</span>
              </Button>

              {backupPath && (
                <div className="p-3 bg-success-light border border-success-green/20 rounded-[4px] space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-success-green text-[10px] uppercase">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Backup Completed Successfully</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono select-all leading-normal bg-white p-1.5 rounded border border-slate-100/50 overflow-x-auto">
                    {backupPath}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-success-green" />
                <span>Private Local SQLite Storage (DHA Branch)</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
