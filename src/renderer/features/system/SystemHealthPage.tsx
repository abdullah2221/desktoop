import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  FileText, 
  Activity, 
  FileCode, 
  RotateCw, 
  AlertTriangle, 
  Info,
  Server,
  FolderOpen,
  User,
  GitBranch,
  Coins
} from 'lucide-react';

interface AppInfo {
  appName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  installPath: string;
  userDataPath: string;
}

interface DatabaseStatus {
  dbPath: string;
  sizeInBytes: number;
  journalMode: string;
  foreignKeys: boolean;
  backupPath: string;
  lastBackupAt: string;
  lastBackupPath: string;
  integrityStatus: string;
}

interface LogStatus {
  logFilePath: string;
  logsDirectory: string;
  logLines: string[];
}

interface DiagnosticsReport {
  sqliteOk: boolean;
  backupDirOk: boolean;
  logsDirOk: boolean;
  freeSpaceOk: boolean;
  integrityStatus: string;
  activeBranch: string;
  activeUser: string;
  baseCurrency: string;
  environmentMode: string;
}

export const SystemHealthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'info' | 'database' | 'logs' | 'diagnostics' | 'backup'>('info');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [logStatus, setLogStatus] = useState<LogStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      // Fetch data safely using contextBridge exposed methods
      const info = await window.api.system.getAppInfo();
      const db = await window.api.system.getDatabaseStatus();
      const logs = await window.api.system.getLogStatus();
      const diag = await window.api.system.getDiagnostics();

      setAppInfo(info);
      setDbStatus(db);
      setLogStatus(logs);
      setDiagnostics(diag);
    } catch (err) {
      console.error('Failed to load system state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupMessage(null);
    try {
      const result = await window.api.system.backup();
      setBackupMessage(`Database backup created successfully: ${result.filename}`);
      // Refresh DB status
      const updatedDb = await window.api.system.getDatabaseStatus();
      setDbStatus(updatedDb);
    } catch (err: any) {
      setBackupMessage(`Backup failed: ${err.message || err}`);
    } finally {
      setBackingUp(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <RotateCw className="w-8 h-8 text-primary-blue animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Checking enterprise security and database parameters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with Premium design */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-success-green" />
            System Health & Diagnostics Panel
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Enterprise administration control center, SQLite replication state, startup security indicators, and rotating logs.
          </p>
        </div>
        <button
          onClick={fetchSystemData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-[4px] border border-slate-200 transition-all cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 bg-white p-1 rounded-t-[6px] border-t border-x">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'info'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Info className="w-4 h-4" />
          App Info
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'database'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          Database State
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Active Logs
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Diagnostics Checks
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-4 h-4" />
          Backup Status
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-b-[6px] p-6 shadow-sm">
        
        {/* App Info Panel */}
        {activeTab === 'info' && appInfo && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Production Build Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Application Name</label>
                  <span className="text-sm font-semibold text-slate-700">{appInfo.appName}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Product Version</label>
                  <span className="text-sm font-bold text-primary-blue">{appInfo.version}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Build Environment</label>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    appInfo.environment === 'production' 
                      ? 'bg-success-light text-success-green' 
                      : appInfo.environment === 'staging' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {appInfo.environment}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Install Directory</label>
                  <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{appInfo.installPath}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">UserData Directory</label>
                  <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{appInfo.userDataPath}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database State Panel */}
        {activeTab === 'database' && dbStatus && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">SQLite Active Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Database Location</label>
                  <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{dbStatus.dbPath}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">File Size</label>
                  <span className="text-sm font-semibold text-slate-700">{formatBytes(dbStatus.sizeInBytes)}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">SQLite Journal Mode</label>
                  <span className="text-sm font-bold text-success-green">{dbStatus.journalMode.toUpperCase()} Mode</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Foreign Key Constraints</label>
                  <span className="text-sm font-semibold text-slate-700">
                    {dbStatus.foreignKeys ? 'ON (Strict Verification)' : 'OFF'}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Integrity Check Status</label>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    dbStatus.integrityStatus === 'ok' ? 'text-success-green' : 'text-rose-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    {dbStatus.integrityStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Panel */}
        {activeTab === 'logs' && logStatus && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800">Enterprise Rotating Logs</h3>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border px-2 py-0.5 rounded">Active File: app.log</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Log File Path</label>
                <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{logStatus.logFilePath}</span>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Live Viewer (Last 80 lines)</label>
                <div className="bg-slate-900 text-indigo-200 p-4 rounded-[6px] font-mono text-xs overflow-x-auto max-h-[350px] overflow-y-auto space-y-1 mt-1 border border-slate-800 shadow-inner">
                  {logStatus.logLines.length > 0 ? (
                    logStatus.logLines.map((line, idx) => {
                      let colorClass = 'text-slate-300';
                      if (line.includes('[ERROR]')) colorClass = 'text-rose-400 font-bold';
                      if (line.includes('[WARN]')) colorClass = 'text-amber-400';
                      if (line.includes('[INFO]')) colorClass = 'text-emerald-400';
                      return (
                        <div key={idx} className={`${colorClass} whitespace-pre-wrap leading-relaxed`}>
                          {line}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-slate-500 italic">No log entries found in active file.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Panel */}
        {activeTab === 'diagnostics' && diagnostics && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">System Diagnostics Matrix</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-100 bg-slate-50 p-4 rounded-[6px] flex items-center gap-3">
                <Database className="w-5 h-5 text-primary-blue" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SQLite Core</span>
                  <span className="text-xs font-bold text-slate-700">
                    {diagnostics.sqliteOk ? 'Healthy & Integrated' : 'Fault Detected'}
                  </span>
                </div>
              </div>
              <div className="border border-slate-100 bg-slate-50 p-4 rounded-[6px] flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary-blue" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Backup Folders</span>
                  <span className="text-xs font-bold text-slate-700">
                    {diagnostics.backupDirOk ? 'Active & Read-Write' : 'Missing / Inactive'}
                  </span>
                </div>
              </div>
              <div className="border border-slate-100 bg-slate-50 p-4 rounded-[6px] flex items-center gap-3">
                <FileCode className="w-5 h-5 text-primary-blue" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Logs Storage</span>
                  <span className="text-xs font-bold text-slate-700">
                    {diagnostics.logsDirOk ? 'Rotating (OK)' : 'Write Restricted'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-[6px] p-4 bg-slate-50 border-slate-200 mt-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                <Server className="w-4 h-4 text-slate-500" />
                App Deployment Variables
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-400 block">Active Branch:</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                    {diagnostics.activeBranch}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block">Authenticated User:</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {diagnostics.activeUser}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block">Base Currency:</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    {diagnostics.baseCurrency}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block">Execution Mode:</span>
                  <span className="font-bold text-slate-700 uppercase">{diagnostics.environmentMode}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Status Panel */}
        {activeTab === 'backup' && dbStatus && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800">Operational Backup Parameters</h3>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border px-2 py-0.5 rounded">Local Storage Replications</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Backups Directory Path</label>
                <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{dbStatus.backupPath}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Last Automated Backup Timestamp</label>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-50 border p-2 rounded block">{dbStatus.lastBackupAt}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Last Backup File Destination</label>
                  <span className="text-xs font-mono bg-slate-50 border p-2 rounded block break-all text-slate-600">{dbStatus.lastBackupPath}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">Trigger Immediate Data Replication</span>
                  <span className="text-[11px] text-slate-500 block">Forces an instant full binary clone of erp.db into your backups directory.</span>
                </div>
                <button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="px-4 py-2 bg-primary-blue hover:bg-[#005c91] text-white text-xs font-bold rounded-[4px] border border-transparent shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {backingUp ? 'Replicating SQL Engine...' : 'Run Backup Now'}
                </button>
              </div>

              {backupMessage && (
                <div className={`p-4 rounded-[6px] text-xs font-semibold flex items-center gap-2 border ${
                  backupMessage.includes('failed')
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <Info className="w-4 h-4 shrink-0" />
                  {backupMessage}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
