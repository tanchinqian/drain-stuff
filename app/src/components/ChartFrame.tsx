import DataTable from './DataTable';
import { useState, type ReactNode } from 'react';
import { exportCsv } from '../utils';
export default function ChartFrame({
  title,
  subtitle,
  headers,
  rows,
  children,
  takeaway,
  legend,
  hasData = rows.some((row) => row.slice(1).some((value) => typeof value === 'number')),
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number | null)[][];
  children: ReactNode;
  takeaway: string;
  legend?: ReactNode;
  hasData?: boolean;
}) {
  const [table, setTable] = useState(false);
  if(!hasData)return <p className="chart-empty" role="status"><strong>{title}</strong> · No readings in this range.</p>;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
        </div>
        <div className="inline">
          <button aria-pressed={table} onClick={() => setTable(!table)}>
            {table ? 'View as chart' : 'View as table'}
          </button>
          <button
            onClick={() =>
              exportCsv(
                title.toLowerCase().replaceAll(' ', '-'),
                headers,
                rows.map((r) => r.map((v) => v ?? 'No reading')),
              )
            }
          >
            Export
          </button>
        </div>
      </div>
      {!hasData ? (
        <p className="empty">No readings in this range</p>
      ) : table ? (
        <DataTable<{ cells: (string | number | null)[]; index: number }>
          id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
          rows={rows.map((cells, index) => ({ cells, index }))}
          rowId={(r) => String(r.index)}
          columns={headers.map((label, i) => ({ key: String(i), label, value: (r) => r.cells[i] }))}
        />
      ) : (
        <div
          className="chart-area"
          role="group"
          aria-label={title + '. View as table is available.'}
        >
          {children}
        </div>
      )}
      {legend}
      <p className="takeaway">{takeaway}</p>
    </section>
  );
}
