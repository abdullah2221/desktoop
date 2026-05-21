import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Database, RotateCcw, Save, Settings2, ShieldCheck } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';

type Tab = 'backup' | 'restore' | 'integrity' | 'settings';

export const BackupRestorePage: React.FC = () => {
  const { notify } = useErp();
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  const [history, setHistory] = useState<Array<Record<string, any>>>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [integrity, setIntegrity] = useState<Record<string, any> | null>(null);
  const [restorePath, setRestorePath] = useState('');
  const [validation, setValidation] = useState<Record<string, any> | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [backupRows, backupSettings] = await Promise.all([
      window.api.backup.list(),
      window.api.backup.getSettings()
    ]);
    setHistory(backupRows);
    setSettings(backupSettings);
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    setBusy(true);
    try {
      const result = await window.api.backup.create();
      await load();
      notify(result.success ? 'success' : 'error', result.success ? `Backup created: ${result.file_path}` : 'Backup failed validation.');
    } finally {
      setBusy(false);
    }
  };

  const runIntegrity = async () => {
    setBusy(true);
    try {
      setIntegrity(await window.api.backup.integrityCheck());
    } finally {
      setBusy(false);
    }
  };

  const validateRestore = async (path: string) => {
    setRestorePath(path);
    setConfirmRestore(false);
    if (!path.trim()) {
      setValidation(null);
      return;
    }
    setValidation(await window.api.backup.validate(path));
  };

  const restore = async () => {
    setBusy(true);
    try {
      const result = await window.api.backup.restore(restorePath);
      notify('success', `Restore completed. Restart required. Safety backup: ${result.safety_backup_path}`);
      setConfirmRestore(false);
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    const updated = await window.api.backup.updateSettings(settings);
    setSettings(updated);
    notify('success', 'Backup settings saved.');
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'backup', label: 'Backup', icon: Save },
    { id: 'restore', label: 'Restore', icon: RotateCcw },
    { id: 'integrity', label: 'Integrity Check', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings2 }
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`px-4 py-2 text-sm font-semibold rounded-[4px] inline-flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab(tab.id)}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="Manual Backup">
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-5">Create a timestamped SQLite backup. The backup is validated and recorded in backup history.</p>
              <Button fullWidth onClick={createBackup} disabled={busy}><Database className="w-4 h-4 mr-2" />Create Backup</Button>
              <div className="text-[11px] text-slate-500">Last backup: {settings.last_backup_at || 'Never'}</div>
            </div>
          </Card>
          <Card className="xl:col-span-2" title="Backup History">
            <BackupHistoryTable rows={history} onUseRestore={(path) => { setActiveTab('restore'); validateRestore(path); }} />
          </Card>
        </div>
      )}

      {activeTab === 'restore' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="Restore Database">
            <div className="space-y-3">
              <Input id="restore-path" label="Backup File Path" value={restorePath} onChange={(e) => validateRestore(e.target.value)} />
              {validation && <Badge variant={validation.valid ? 'success' : 'danger'}>{validation.message}</Badge>}
              <Button fullWidth variant="danger" disabled={!validation?.valid || busy} onClick={() => setConfirmRestore(true)}><RotateCcw className="w-4 h-4 mr-2" />Restore Selected Backup</Button>
            </div>
          </Card>
          <Card className="xl:col-span-2" title="Available Backups">
            <BackupHistoryTable rows={history} onUseRestore={(path) => validateRestore(path)} />
          </Card>
        </div>
      )}

      {activeTab === 'integrity' && (
        <Card title="Database Integrity Check" headerActions={<Button size="sm" onClick={runIntegrity} disabled={busy}>Run Check</Button>}>
          {!integrity ? <p className="text-xs text-slate-500">Run an integrity check to verify SQLite pages, foreign keys, file size, and last backup state.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Summary label="Integrity" value={integrity.integrity} ok={integrity.integrity === 'ok'} />
              <Summary label="Foreign Key Issues" value={String(integrity.foreignKeyIssues)} ok={integrity.foreignKeyIssues === 0} />
              <Summary label="Database Size" value={`${Number(integrity.databaseSize || 0).toLocaleString()} bytes`} />
              <Summary label="Last Backup" value={integrity.lastBackup?.created_at || 'None'} />
            </div>
          )}
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card title="Automatic Backup Settings">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2">
              <input type="checkbox" checked={settings.automatic_backup_enabled === 'true'} onChange={(e) => setSettings((p) => ({ ...p, automatic_backup_enabled: e.target.checked ? 'true' : 'false' }))} />
              Daily backup enabled
            </label>
            <Input id="retention-count" label="Keep Last N Backups" type="number" value={settings.retention_count || '10'} onChange={(e) => setSettings((p) => ({ ...p, retention_count: e.target.value }))} />
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2">
              <input type="checkbox" checked={settings.backup_before_migrations !== 'false'} onChange={(e) => setSettings((p) => ({ ...p, backup_before_migrations: e.target.checked ? 'true' : 'false' }))} />
              Backup before migrations
            </label>
            <Button onClick={saveSettings}>Save Settings</Button>
          </div>
          <div className="mt-4 p-3 border border-slate-200 rounded-[6px] bg-slate-50 text-xs text-slate-500">Export/import placeholders are reserved here for products, customers, suppliers, and future Excel/CSV workflows.</div>
        </Card>
      )}

      {confirmRestore && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[6px] bg-danger-light text-danger-red flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Database Restore</h3>
                <p className="text-xs text-slate-500 mt-1 leading-5">This will replace the active database after creating a safety backup. Restart the app after restore completes.</p>
              </div>
            </div>
            <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-[4px] p-3 break-all">{restorePath}</div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRestore(false)}>Cancel</Button>
              <Button variant="danger" onClick={restore} disabled={busy}>Confirm Restore</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Summary: React.FC<{ label: string; value: string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className="border border-slate-200 bg-white rounded-[6px] p-3">
    <div className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{label}</div>
    <div className={`mt-1 text-sm font-bold ${ok === undefined ? 'text-slate-900' : ok ? 'text-success-green' : 'text-danger-red'}`}>{value}</div>
  </div>
);

const BackupHistoryTable: React.FC<{ rows: Array<Record<string, any>>; onUseRestore: (path: string) => void }> = ({ rows, onUseRestore }) => (
  <table className="erp-table text-xs">
    <thead><tr><th>Date</th><th>File</th><th>Type</th><th>Status</th><th>Size</th><th>Actions</th></tr></thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{row.created_at}</td>
          <td className="max-w-[280px] truncate" title={row.file_path}>{row.file_name}</td>
          <td>{row.backup_type}</td>
          <td><Badge variant={row.status === 'success' ? 'success' : row.status === 'pruned' ? 'warning' : 'danger'}>{row.status}</Badge></td>
          <td>{Number(row.file_size || 0).toLocaleString()} bytes</td>
          <td><Button size="sm" variant="secondary" onClick={() => onUseRestore(String(row.file_path))}>Use for Restore</Button></td>
        </tr>
      ))}
    </tbody>
  </table>
);
