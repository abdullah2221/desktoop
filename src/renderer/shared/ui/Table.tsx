import React from 'react';

export interface TableColumn<T> {
  header: string;
  accessor: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available'
}: TableProps<T>) {
  return (
    <div className="w-full overflow-hidden border border-slate-200 rounded-[8px] shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`
                    ${col.align === 'center' ? 'text-center' : ''}
                    ${col.align === 'right' ? 'text-right' : ''}
                    ${col.className || ''}
                  `}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400 text-xs">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={keyExtractor(row, rowIdx)}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`
                        ${col.align === 'center' ? 'text-center' : ''}
                        ${col.align === 'right' ? 'text-right' : ''}
                        ${col.className || ''}
                      `}
                    >
                      {col.accessor(row, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
