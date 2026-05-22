import React, { useState, useEffect } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import {
  Download,
  Upload,
  FileSpreadsheet,
  History,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  AlertCircle,
  Check,
  ChevronRight,
  Database,
  ArrowRight,
  RefreshCw,
  XCircle,
  Eye
} from 'lucide-react';

export const DataSyncPage: React.FC = () => {
  const { hasPermission } = useErp();
  const canImport = hasPermission('data.import') || hasPermission('ENTERPRISE_FULL');
  const canExport = hasPermission('data.export') || hasPermission('ENTERPRISE_FULL');

  // Tabs: 'export' | 'import' | 'templates' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'templates' | 'history'>(
    canImport ? 'import' : 'export'
  );

  // General Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- Export State ---
  const [exportEntity, setExportEntity] = useState<string>('products');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [exporting, setExporting] = useState<boolean>(false);
  const [lastExportPath, setLastExportPath] = useState<string>('');

  // --- Import State ---
  const [importEntity, setImportEntity] = useState<string>('products');
  const [importFile, setImportFile] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [atomicImport, setAtomicImport] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);

  // --- History State ---
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedJobErrors, setSelectedJobErrors] = useState<any[] | null>(null);
  const [errorModalJobId, setErrorModalJobId] = useState<string | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Job History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const imports = await window.api.datasync.getImportJobs();
      const exports = await window.api.datasync.getExportJobs();
      setImportHistory(imports || []);
      setExportHistory(exports || []);
    } catch (err: any) {
      console.error('Error fetching job history:', err);
      setNotification({ message: `Failed to load logs: ${err.message}`, type: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab]);

  // --- Download Template Trigger ---
  const handleDownloadTemplate = async (entity: string, format: 'csv' | 'xlsx') => {
    try {
      const res = await window.api.datasync.downloadTemplate(entity, format);
      if (res.success) {
        setNotification({
          message: `Template successfully saved to: ${res.filePath}`,
          type: 'success'
        });
      } else if (res.reason !== 'canceled') {
        setNotification({
          message: `Failed to save template: ${res.reason}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    }
  };

  // --- Choose Import File Trigger ---
  const handleChooseFile = async () => {
    try {
      const filePath = await window.api.datasync.chooseImportFile();
      if (filePath) {
        setImportFile(filePath);
        setImportPreview(null);
        setImportResult(null);
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    }
  };

  // --- Preview Import Trigger ---
  const handlePreviewImport = async () => {
    if (!importFile) {
      setNotification({ message: 'Please select a spreadsheet file first.', type: 'error' });
      return;
    }
    setPreviewLoading(true);
    setImportPreview(null);
    setImportResult(null);
    try {
      const res = await window.api.datasync.previewImport(importFile, importEntity);
      if (res.success && res.result) {
        setImportPreview(res.result);
        if (res.result.errorsCount > 0) {
          setNotification({
            message: `Found ${res.result.errorsCount} validation issues. Please review before committing.`,
            type: 'info'
          });
        }
      } else {
        setNotification({
          message: `Preview failed: ${res.reason || 'Invalid file format.'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Commit Import Trigger ---
  const handleCommitImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const res = await window.api.datasync.commitImport(
        importPreview.jobId,
        importPreview.previewRows,
        atomicImport
      );
      if (res.success && res.result) {
        setImportResult(res.result);
        setImportPreview(null);
        setImportFile(null);
        setNotification({
          message: `Import complete. ${res.result.inserted} added, ${res.result.skipped} skipped.`,
          type: 'success'
        });
      } else {
        setNotification({
          message: `Import failed: ${res.reason || 'Database transaction rolled back.'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  // --- Export Data Trigger ---
  const handleExportData = async () => {
    setExporting(true);
    setLastExportPath('');
    try {
      const res = await window.api.datasync.exportData(exportEntity, exportFormat);
      if (res.success && res.filePath) {
        setLastExportPath(res.filePath);
        setNotification({
          message: `Export completed successfully! Saved to ${res.filePath}`,
          type: 'success'
        });
      } else if (res.reason !== 'canceled') {
        setNotification({
          message: `Export failed: ${res.reason}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // --- Fetch and Show Job Errors ---
  const handleViewJobErrors = async (jobId: string) => {
    setErrorModalJobId(jobId);
    try {
      const errors = await window.api.datasync.getJobErrors(jobId);
      setSelectedJobErrors(errors || []);
    } catch (err: any) {
      setNotification({ message: `Failed to load job errors: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-blue animate-pulse" />
            Data Sync Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Perform enterprise-grade data sync. Batch import and export products, customers, suppliers, and ledger entries with active transaction rollback controls.
          </p>
        </div>

        {/* Global Notifications inside Header */}
        {notification && (
          <div className={`text-xs font-semibold px-4 py-2.5 rounded-[4px] shadow-sm animate-fade-in flex items-center gap-2 max-w-sm ${
            notification.type === 'success' ? 'bg-success-light border border-success-green/20 text-success-green' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' :
            'bg-sky-50 border border-sky-200 text-sky-700'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 bg-white rounded-[6px] p-1 shadow-sm gap-1">
        {canImport && (
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              activeSubTab === 'import'
                ? 'bg-primary-blue text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Spreadsheets
          </button>
        )}

        {canExport && (
          <button
            onClick={() => setActiveSubTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              activeSubTab === 'export'
                ? 'bg-primary-blue text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Live Data
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-primary-blue text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import Templates
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-primary-blue text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Sync History & Auditing
        </button>
      </div>

      {/* --- IMPORT TAB CONTENT --- */}
      {activeSubTab === 'import' && canImport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CONTROL BOX */}
          <div className="bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm space-y-5 h-fit">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-primary-blue" />
              Configure Import Job
            </h3>

            {/* Entity Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Select Data Destination</label>
              <select
                value={importEntity}
                onChange={(e) => {
                  setImportEntity(e.target.value);
                  setImportFile(null);
                  setImportPreview(null);
                  setImportResult(null);
                }}
                disabled={previewLoading || importing}
                className="w-full bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue"
              >
                <option value="products">Products Master File</option>
                <option value="customers">Customers Ledger</option>
                <option value="suppliers">Suppliers / Vendors Master</option>
                <option value="opening_stock">Opening Inventory stock</option>
              </select>
            </div>

            {/* Step 1: Select File */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">Select CSV or Excel Source File</label>
              <button
                onClick={handleChooseFile}
                disabled={previewLoading || importing}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-primary-blue bg-slate-50/50 hover:bg-slate-50 py-5 rounded-[4px] cursor-pointer group transition-all"
              >
                <div className="text-center">
                  <FileSpreadsheet className="w-6 h-6 text-slate-400 mx-auto mb-1 group-hover:text-primary-blue" />
                  <span className="text-xs font-bold text-slate-700 block">
                    {importFile ? 'Change spreadsheet file' : 'Choose source spreadsheet'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 block">CSV or XLSX format</span>
                </div>
              </button>
              {importFile && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[4px] overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">File Selected:</span>
                  <span className="text-[11px] font-semibold text-slate-700">{importFile.split('/').pop()}</span>
                </div>
              )}
            </div>

            {/* Step 2: Validate Toggle */}
            {importFile && (
              <button
                onClick={handlePreviewImport}
                disabled={previewLoading || importing}
                className="w-full flex items-center justify-center gap-2 bg-[#0284c7] hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-[4px] text-xs transition-all shadow-sm cursor-pointer"
              >
                {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {previewLoading ? 'Analyzing spreadsheet...' : 'Preview & Validate'}
              </button>
            )}

            {/* Step 3: Transaction Control */}
            {importPreview && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-200 p-3 rounded-[4px]">
                  <input
                    type="checkbox"
                    id="atomicToggle"
                    checked={atomicImport}
                    onChange={(e) => setAtomicImport(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="atomicToggle" className="text-[11px] font-semibold text-slate-700 leading-normal cursor-pointer select-none">
                    <span className="font-bold text-amber-800 block">Atomic Mode (Highly Recommended)</span>
                    Rollback and cancel the entire sync job if any validation errors are detected. Protects ledger integrity.
                  </label>
                </div>

                <button
                  onClick={handleCommitImport}
                  disabled={importing || (atomicImport && importPreview.errorsCount > 0)}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 px-4 rounded-[4px] text-xs transition-all shadow-sm cursor-pointer ${
                    atomicImport && importPreview.errorsCount > 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-success-green hover:bg-emerald-700 text-white'
                  }`}
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                  {importing ? 'Syncing to Database...' : 'Commit Import'}
                </button>

                {atomicImport && importPreview.errorsCount > 0 && (
                  <p className="text-[10px] text-red-500 font-semibold text-center">
                    Must fix validation errors or disable Atomic Mode to commit.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* PREVIEW CONTAINER */}
          <div className="lg:col-span-2 space-y-6">
            {/* NO FILE SELECTED STATE */}
            {!importFile && !importPreview && !importResult && (
              <div className="bg-white border border-slate-200 rounded-[6px] p-8 text-center shadow-sm space-y-3 flex flex-col justify-center items-center min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Awaiting Spreadsheet Source</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select a product list, supplier matrix, customer database, or opening stock Excel sheet on the left to begin secure system data validation.
                </p>
              </div>
            )}

            {/* PREVIEW LOADER */}
            {previewLoading && (
              <div className="bg-white border border-slate-200 rounded-[6px] p-8 text-center shadow-sm space-y-4 flex flex-col justify-center items-center min-h-[300px]">
                <RefreshCw className="w-10 h-10 text-primary-blue animate-spin" />
                <h4 className="text-sm font-bold text-slate-800">Processing file schema...</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Parsing cell rows, validating database schemas, and detecting possible entity conflicts. Please wait.
                </p>
              </div>
            )}

            {/* PREVIEW PARSED OUTPUT */}
            {importPreview && (
              <div className="bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Validation Matrix Review</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Job ID: {importPreview.jobId}</p>
                  </div>

                  {/* STATS CHIPS */}
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 rounded-[4px] text-slate-700 border border-slate-200">
                      Rows: {importPreview.totalRows}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 rounded-[4px] text-emerald-700 border border-emerald-100">
                      Valid: {importPreview.validCount}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-[4px] border ${
                      importPreview.errorsCount > 0
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      Errors: {importPreview.errorsCount}
                    </span>
                  </div>
                </div>

                {/* ERROR LISTING IF ANY */}
                {importPreview.errorsCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-[4px] p-3 space-y-2 max-h-40 overflow-y-auto">
                    <h4 className="text-[11px] font-bold text-red-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Critical Schema and Column Discrepancies ({importPreview.errorsCount})
                    </h4>
                    <ul className="space-y-1">
                      {importPreview.previewRows
                        .filter((r: any) => !r.isValid)
                        .map((r: any, idx: number) => (
                          <li key={idx} className="text-[10px] text-red-600 font-semibold list-disc list-inside">
                            Row {r.rowNumber}: <span className="font-bold">{r.errorReason}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* DATA TABLE PREVIEW */}
                <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r">Row</th>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r">Status</th>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payload Snippet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {importPreview.previewRows.slice(0, 50).map((row: any, idx: number) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}>
                            <td className="p-2 border-r font-bold text-slate-500 w-12 text-center">{row.rowNumber}</td>
                            <td className="p-2 border-r w-24">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                                row.isValid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {row.isValid ? 'Valid' : 'Failed'}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-600 max-w-md overflow-hidden text-ellipsis">
                              {JSON.stringify(row.payload)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.previewRows.length > 50 && (
                    <div className="bg-slate-50 p-2 text-center text-[10px] text-slate-500 border-t font-semibold">
                      Showing first 50 rows. Total of {importPreview.previewRows.length} rows parsed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IMPORT COMPLETED RESULTS */}
            {importResult && (
              <div className="bg-white border border-slate-200 rounded-[6px] p-6 shadow-sm text-center space-y-4">
                <div className="w-12 h-12 bg-success-light text-success-green border border-success-green/20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">Spreadsheet Sync Committed Successfully</h3>
                  <p className="text-xs text-slate-500">Transaction fully written. Ledger ledger and database entries updated.</p>
                </div>

                <div className="max-w-sm mx-auto grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded-[6px] bg-slate-50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created / Written</span>
                    <span className="text-lg font-bold text-slate-700 mt-1 block">{importResult.inserted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duplicate Skipped</span>
                    <span className="text-lg font-bold text-slate-700 mt-1 block">{importResult.skipped}</span>
                  </div>
                </div>

                <button
                  onClick={() => setImportResult(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-[4px] text-xs transition-all cursor-pointer"
                >
                  Dismiss & Load Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- EXPORT TAB CONTENT --- */}
      {activeSubTab === 'export' && canExport && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-6 shadow-sm max-w-xl mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-primary-blue" />
              Live Live Database Export
            </h3>
            <p className="text-xs text-slate-500">
              Select any table and export your clean dataset. Generates valid documents matching Excel formulas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Select Dataset Table</label>
              <select
                value={exportEntity}
                onChange={(e) => setExportEntity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue"
              >
                <option value="products">Products Inventory Master</option>
                <option value="customers">Customers Matrix</option>
                <option value="suppliers">Suppliers / Vendors Matrix</option>
                <option value="sales">Sales Invoice Journal</option>
                <option value="purchases">Purchase / Stock-In Journal</option>
                <option value="valuation">Inventory Valuation Summary</option>
                <option value="reports">Consolidated financial reports</option>
              </select>
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Select Format</label>
              <select
                value={exportFormat}
                onChange={(e: any) => setExportFormat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue"
              >
                <option value="xlsx">Excel File (.xlsx)</option>
                <option value="csv">Standard CSV File (.csv)</option>
              </select>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full bg-primary-blue hover:bg-blue-800 text-white font-bold py-2.5 rounded-[4px] text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
          >
            {exporting ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Play className="w-4.5 h-4.5" />}
            {exporting ? 'Generating Spreadsheet...' : `Export to ${exportFormat.toUpperCase()}`}
          </button>

          {/* Success Filepath alert */}
          {lastExportPath && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] flex items-start gap-2 animate-fade-in">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] font-semibold text-emerald-800 leading-normal">
                <span className="font-bold block">Export Complete!</span>
                File saved securely at: <span className="font-mono text-[10px] bg-white border px-1 py-0.5 rounded">{lastExportPath}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TEMPLATES TAB CONTENT --- */}
      {activeSubTab === 'templates' && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Download Excel/CSV Templates</h3>
            <p className="text-xs text-slate-500 mt-0.5">Use these pre-formatted sheets to layout your inventories and vendor matrices. Essential for successful schema validation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {[
              { id: 'products', name: 'Products Master', desc: 'SKU, name, standard cost, sales price, alert quantity.' },
              { id: 'customers', name: 'Customers Ledger', desc: 'Full name, email, phone, address, credit limit.' },
              { id: 'suppliers', name: 'Suppliers Matrix', desc: 'Company, contact person, phone, email, address.' },
              { id: 'opening_stock', name: 'Opening Stock', desc: 'SKU, initial balance quantities, cost per unit.' }
            ].map((tmpl) => (
              <div key={tmpl.id} className="border border-slate-200 hover:border-primary-blue rounded-[6px] p-4 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-slate-400" />
                    {tmpl.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{tmpl.desc}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleDownloadTemplate(tmpl.id, 'xlsx')}
                    className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-1.5 rounded-[4px] text-[10px] cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    XLSX
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate(tmpl.id, 'csv')}
                    className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-1.5 rounded-[4px] text-[10px] cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- HISTORY TAB CONTENT --- */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* TABLES GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Import Jobs */}
            <div className="bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0284c7]" />
                Recent Import Auditing Logs
              </h3>

              <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Records</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">Loading audit history...</td>
                        </tr>
                      ) : importHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">No import log entries found.</td>
                        </tr>
                      ) : (
                        importHistory.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold uppercase text-slate-600">{job.entity_type}</td>
                            <td className="p-2.5">
                              {job.inserted_rows || 0} / {job.total_rows || 0}
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                                job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                job.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                                'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {new Date(job.created_at).toLocaleString()}
                            </td>
                            <td className="p-2.5">
                              {job.errors_count > 0 && (
                                <button
                                  onClick={() => handleViewJobErrors(job.id)}
                                  className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Errors ({job.errors_count})
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Export Jobs */}
            <div className="bg-white border border-slate-200 rounded-[6px] p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                Recent Export Auditing Logs
              </h3>

              <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Records</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">Loading audit history...</td>
                        </tr>
                      ) : exportHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">No export log entries found.</td>
                        </tr>
                      ) : (
                        exportHistory.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold uppercase text-slate-600">{job.entity_type}</td>
                            <td className="p-2.5 font-bold text-slate-500 uppercase">{job.format}</td>
                            <td className="p-2.5">{job.total_rows || 0}</td>
                            <td className="p-2.5">
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                                job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                job.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {new Date(job.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* DETAIL MODAL IF SELECTED JOB ERRORS EXIST */}
          {selectedJobErrors && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-[8px] p-6 max-w-2xl w-full shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                      Job Validation Failure Audit
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Job UUID: {errorModalJobId}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobErrors(null);
                      setErrorModalJobId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-[4px] cursor-pointer"
                  >
                    Close Close
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-[4px] divide-y divide-slate-100">
                  {selectedJobErrors.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs font-semibold">No detailed cell anomalies recorded for this job. Check atomic mode logs.</div>
                  ) : (
                    selectedJobErrors.map((err, idx) => (
                      <div key={idx} className="p-3 text-[11px] font-semibold text-slate-700 bg-rose-50/20 flex gap-2">
                        <span className="font-bold text-slate-400 shrink-0">Row {err.row_number}:</span>
                        <div>
                          <p className="text-rose-600 font-bold">{err.error_reason}</p>
                          {err.raw_data && (
                            <p className="text-[10px] font-mono text-slate-400 mt-1 overflow-hidden text-ellipsis max-w-xl">
                              Raw cell values: {err.raw_data}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
