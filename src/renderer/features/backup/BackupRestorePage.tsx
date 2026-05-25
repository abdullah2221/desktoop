import React, { useEffect, useState } from 'react';
import { AlertTriangle, Database, FolderOpen, RotateCcw, Save, Settings2, ShieldCheck } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';

type Tab = 'create' | 'restore' | 'history' | 'settings' | 'security' | 'integrity';

export const BackupRestorePage: React.FC = () => {
  const { notify } = useErp();
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [history, setHistory] = useState<Array<Record<string, any>>>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [integrity, setIntegrity] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);

  const [backupType, setBackupType] = useState<'full' | 'data_only' | 'settings' | 'master_data' | 'accounting'>('full');
  const [backupDestination, setBackupDestination] = useState('');
  const [protectPassword, setProtectPassword] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupNotes, setBackupNotes] = useState('');

  const [restorePath, setRestorePath] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [validation, setValidation] = useState<Record<string, any> | null>(null);
  const [validating, setValidating] = useState(false);
  const [validatedAt, setValidatedAt] = useState<string>('');

  const load = async () => {
    const [backupRows, backupSettings] = await Promise.all([
      window.api.backup.getHistory(),
      window.api.backup.getSettings()
    ]);
    setHistory(backupRows);
    setSettings(backupSettings);
    if (!backupDestination) {
      const fromSettings = backupSettings.last_backup_path ? String(backupSettings.last_backup_path).split('/').slice(0, -1).join('/') : '';
      if (fromSettings) setBackupDestination(fromSettings);
    }
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    setBusy(true);
    try {
      const result = await window.api.backup.createFull({
        backupType,
        destinationDir: backupDestination || undefined,
        password: protectPassword ? backupPassword : undefined,
        notes: backupNotes
      });
      notify('success', `Backup created: ${result.file_path}`);
      await load();
    } catch (error: any) {
      notify('error', error?.message || 'Backup creation failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectDestination = async () => {
    const selected = await window.api.backup.selectBackupDestination();
    if (selected) setBackupDestination(selected);
  };

  const selectRestoreFile = async () => {
    const selected = await window.api.backup.selectBackupFile();
    if (!selected) return;
    setRestorePath(selected);
    setValidation(null);
    setValidatedAt('');
    await validateRestore(selected, restorePassword);
  };

  const validateRestore = async (path: string, password?: string) => {
    if (!path) {
      setValidation(null);
      setValidatedAt('');
      notify('error', 'Select a backup file first.');
      return;
    }
    setValidating(true);
    try {
      const result = await window.api.backup.validateFile(path, password);
      setValidation(result);
      setValidatedAt(new Date().toLocaleString());
      if (result?.requiresPassword) {
        notify('info', 'Backup is encrypted. Enter backup password and validate again.');
      } else if (result?.valid) {
        notify('success', 'Backup validation passed.');
      } else {
        notify('error', result?.message || 'Backup validation failed.');
      }
    } catch (error: any) {
      setValidation({
        valid: false,
        message: error?.message || 'Backup validation failed.',
        integrity: 'error',
        requiresPassword: false
      });
      setValidatedAt(new Date().toLocaleString());
      notify('error', error?.message || 'Backup validation failed.');
    } finally {
      setValidating(false);
    }
  };

  const restore = async () => {
    if (!restorePath) {
      notify('error', 'Select a backup file first.');
      return;
    }
    setBusy(true);
    try {
      const result = await window.api.backup.restoreFile({
        filePath: restorePath,
        password: restorePassword || undefined,
        adminPassword
      });
      notify('success', `Restore completed. Restart required. Safety backup: ${result.safety_backup_path}`);
    } catch (error: any) {
      notify('error', error?.message || 'Restore failed.');
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

  const saveSettings = async () => {
    const updated = await window.api.backup.updateSettings(settings);
    setSettings(updated);
    notify('success', 'Backup settings saved.');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          ['create', 'Create Backup'],
          ['restore', 'Restore Backup'],
          ['history', 'Backup History'],
          ['settings', 'Backup Settings'],
          ['security', 'Security'],
          ['integrity', 'Integrity Check']
        ].map(([id, label]) => (
          <button key={id} className={`px-4 py-2 text-sm font-semibold rounded-[4px] whitespace-nowrap ${activeTab === id ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab(id as Tab)}>{label}</button>
        ))}
      </div>

      {activeTab === 'create' && (
        <Card title="Create Full Store Backup">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="erp-input" value={backupType} onChange={(e) => setBackupType(e.target.value as any)}>
              <option value="full">Full Store Backup</option>
              <option value="data_only">Data Only Backup</option>
              <option value="settings">Settings Backup</option>
              <option value="master_data">Master Data Backup</option>
              <option value="accounting">Accounting Backup</option>
            </select>
            <Input label="Backup Destination" value={backupDestination} onChange={(e) => setBackupDestination(e.target.value)} />
            <div className="flex items-end"><Button variant="secondary" onClick={selectDestination}><FolderOpen className="w-4 h-4 mr-2" />Select Destination</Button></div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2">
              <input type="checkbox" checked={protectPassword} onChange={(e) => setProtectPassword(e.target.checked)} /> Password protect backup
            </label>
            <Input label="Backup Password" type="password" disabled={!protectPassword} value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} />
            <Input label="Notes" value={backupNotes} onChange={(e) => setBackupNotes(e.target.value)} />
          </div>
          <div className="mt-4"><Button onClick={createBackup} disabled={busy}><Save className="w-4 h-4 mr-2" />Create Backup</Button></div>
        </Card>
      )}

      {activeTab === 'restore' && (
        <Card title="Restore Backup">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Backup File (.erpbackup)" value={restorePath} onChange={(e) => setRestorePath(e.target.value)} />
            <div className="flex items-end"><Button variant="secondary" onClick={selectRestoreFile}><FolderOpen className="w-4 h-4 mr-2" />Select Backup File</Button></div>
            <Input label="Backup Password (if encrypted)" type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} />
            <Input label="Admin Password Confirmation" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => validateRestore(restorePath, restorePassword)} disabled={busy || validating}>
              {validating ? 'Validating...' : 'Validate Backup'}
            </Button>
            <Button variant="danger" onClick={restore} disabled={busy || !restorePath}><RotateCcw className="w-4 h-4 mr-2" />Restore</Button>
          </div>
          {!validation && (
            <div className="mt-3 border border-dashed border-slate-300 rounded-[6px] p-3 text-xs bg-slate-50 text-slate-600">
              Validate a `.erpbackup` file to see status, integrity, encryption, and restore preview metadata.
            </div>
          )}
          {validation && (
            <div className={`mt-3 border rounded-[6px] p-3 text-xs space-y-1 ${
              validation.requiresPassword
                ? 'border-amber-300 bg-amber-50'
                : validation.valid
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-rose-300 bg-rose-50'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <b>Validation:</b>{' '}
                  {validation.requiresPassword ? 'Password Required' : validation.valid ? 'Passed' : 'Failed'}
                </div>
                <Badge variant={validation.requiresPassword ? 'warning' : validation.valid ? 'success' : 'danger'}>
                  {validation.integrity || (validation.valid ? 'ok' : 'error')}
                </Badge>
              </div>
              <div><b>Message:</b> {validation.message || '-'}</div>
              <div><b>Validated At:</b> {validatedAt || '-'}</div>
              <div><b>Backup File:</b> {restorePath || '-'}</div>
              {validation.manifest && (
                <>
                  <div><b>Store:</b> {validation.manifest.store_name || '-'}</div>
                  <div><b>Created At:</b> {validation.manifest.created_at || '-'}</div>
                  <div><b>Created By:</b> {validation.manifest.created_by || '-'}</div>
                  <div><b>App Version:</b> {validation.manifest.app_version || '-'}</div>
                  <div><b>Tables:</b> {validation.manifest.tables_count || '-'}</div>
                  <div><b>Database Size:</b> {Number(validation.manifest.database_size || 0).toLocaleString()} bytes</div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card title="Backup History">
          <table className="erp-table text-xs">
            <thead><tr><th>Date</th><th>File</th><th>Type</th><th>Size</th><th>Integrity</th><th>Actions</th></tr></thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at}</td>
                  <td>{row.file_name}</td>
                  <td>{row.backup_type}</td>
                  <td>{Number(row.file_size || 0).toLocaleString()} bytes</td>
                  <td><Badge variant={row.integrity_status === 'ok' ? 'success' : 'warning'}>{row.integrity_status || '-'}</Badge></td>
                  <td className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={async () => {
                      setActiveTab('restore');
                      setRestorePath(String(row.file_path));
                      await validateRestore(String(row.file_path), restorePassword);
                    }}>Validate</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.api.backup.openBackupFolder(String(row.file_path).split('/').slice(0, -1).join('/'))}>Open Location</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card title="Backup Settings">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Input label="Retention Count" type="number" value={settings.retention_count || '10'} onChange={(e) => setSettings((p) => ({ ...p, retention_count: e.target.value }))} />
            <Input label="Auto Backup Interval (Minutes)" type="number" value={settings.auto_backup_interval_minutes || '1440'} onChange={(e) => setSettings((p) => ({ ...p, auto_backup_interval_minutes: e.target.value }))} />
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2"><input type="checkbox" checked={settings.automatic_backup_enabled === 'true'} onChange={(e) => setSettings((p) => ({ ...p, automatic_backup_enabled: e.target.checked ? 'true' : 'false' }))} />Auto backup enabled</label>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2"><input type="checkbox" checked={settings.backup_before_migrations !== 'false'} onChange={(e) => setSettings((p) => ({ ...p, backup_before_migrations: e.target.checked ? 'true' : 'false' }))} />Backup before migrations</label>
            <Button onClick={saveSettings}><Settings2 className="w-4 h-4 mr-2" />Save</Button>
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card title="Security">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2"><input type="checkbox" checked={settings.require_password_for_backup === 'true'} onChange={(e) => setSettings((p) => ({ ...p, require_password_for_backup: e.target.checked ? 'true' : 'false' }))} />Require password for backup</label>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2"><input type="checkbox" checked={settings.require_admin_password_for_restore !== 'false'} onChange={(e) => setSettings((p) => ({ ...p, require_admin_password_for_restore: e.target.checked ? 'true' : 'false' }))} />Require admin password for restore</label>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-2"><input type="checkbox" checked={settings.auto_safety_backup_before_restore !== 'false'} onChange={(e) => setSettings((p) => ({ ...p, auto_safety_backup_before_restore: e.target.checked ? 'true' : 'false' }))} />Auto safety backup before restore</label>
          </div>
          <div className="mt-3"><Button onClick={saveSettings}>Save Security Settings</Button></div>
        </Card>
      )}

      {activeTab === 'integrity' && (
        <Card title="Integrity Check" headerActions={<Button size="sm" onClick={runIntegrity} disabled={busy}><ShieldCheck className="w-4 h-4 mr-2" />Run Check</Button>}>
          {!integrity ? <p className="text-xs text-slate-500">Run integrity check to verify DB health and backup state.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Summary label="Integrity" value={integrity.integrity} ok={integrity.integrity === 'ok'} />
              <Summary label="Foreign Keys" value={String(integrity.foreignKeyIssues)} ok={integrity.foreignKeyIssues === 0} />
              <Summary label="DB Size" value={`${Number(integrity.databaseSize || 0).toLocaleString()} bytes`} />
              <Summary label="Last Backup" value={integrity.lastBackup?.created_at || 'None'} />
            </div>
          )}
        </Card>
      )}

      <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-[6px] p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5" />
        Restore will replace active database after creating safety backup and requires restart.
      </div>
    </div>
  );
};

const Summary: React.FC<{ label: string; value: string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className="border border-slate-200 bg-white rounded-[6px] p-3">
    <div className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{label}</div>
    <div className={`mt-1 text-sm font-bold ${ok === undefined ? 'text-slate-900' : ok ? 'text-success-green' : 'text-danger-red'}`}>{value}</div>
  </div>
);
