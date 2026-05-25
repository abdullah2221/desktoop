import React from 'react';
import { DashboardMetricDetail } from '../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  data: DashboardMetricDetail | null;
  loading: boolean;
}

export const DashboardDateDetailDrawer: React.FC<Props> = ({ open, onClose, data, loading }) => {
  if (!open) return null;

  const columns = data?.columns || [];
  const rows = data?.rows || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex justify-end">
      <div className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{data?.title || 'Detail'}</h3>
            <p className="text-xs text-slate-500">Metric detail drilldown</p>
          </div>
          <button onClick={onClose} className="text-xs font-semibold text-slate-600 hover:text-slate-800">Close</button>
        </div>

        <div className="p-4 space-y-4">
          {loading && <p className="text-xs text-slate-500">Loading detail...</p>}

          {!loading && data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(data.summary || {}).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 border border-slate-200 rounded-[6px] p-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{key.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">{String(value)}</div>
                  </div>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="text-xs text-slate-500">No data found for selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="erp-table text-xs">
                    <thead>
                      <tr>{columns.map((col) => <th key={col}>{col.replace(/_/g, ' ')}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx}>
                          {columns.map((col) => <td key={col}>{String(row[col] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
