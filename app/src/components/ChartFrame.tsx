import { useState, type ReactNode } from 'react';
import { exportCsv } from '../utils';
export default function ChartFrame({
  title,
  subtitle,
  headers,
  rows,
  children,
  takeaway,
  hasData = rows.some((row) => row.slice(1).some((value) => typeof value === 'number')),
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number | null)[][];
  children: ReactNode;
  takeaway: string;
  hasData?: boolean;
}) {
  const [table, setTable] = useState(false);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="sub">{subtitle} · synthetic</p>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((v, j) => (
                    <td key={j}>{v ?? 'No reading'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="chart-area"
          role="group"
          aria-label={title + '. Synthetic chart. View as table is available.'}
        >
          {children}
        </div>
      )}
      <p className="takeaway">{takeaway}</p>
    </section>
  );
}
