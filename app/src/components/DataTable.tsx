import { useState, type ReactNode } from 'react';
import { Search, ChevronDown, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { exportCsv, displayName, formatValue } from '../utils';
import Term from './Term';
export interface Column<T> {
  key: string;
  width?: string;
  label: string;
  value: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
}
export interface TableFilter<T> {
  key: string;
  label: string;
  value: (row: T) => string;
}
function ValueText({ value }: { value: string | number | null }) {
  if (value === null) return <>No reading</>;
  if (typeof value === 'number') return <>{formatValue(value)}</>;
  const match = value.match(/^(.*) (mm\/h|L\/min|mm|cm|m|h|°C|%|kg|L\/m²)$/);
  return match ? (
    <>
      {match[1]} <Term text={match[2]} />
    </>
  ) : (
    <>{value}</>
  );
}
export default function DataTable<T>({
  id,
  rows,
  columns,
  rowId,
  filters = [],
  onSelect,
  actions,
  loading = false,
}: {
  id: string;
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  filters?: TableFilter<T>[];
  onSelect?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  loading?: boolean;
}) {
  const [search, setSearch] = useState(''),
    [sort, setSort] = useState({ key: '', direction: 1 }),
    [picks, setPicks] = useState<Record<string, string[]>>({}),
    [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(10),
    [compact, setCompact] = useState(false);
  const [visible, setVisible] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('columns-' + id) || 'null');
      return Array.isArray(saved) && saved.some((k) => columns.some((c) => c.key === k))
        ? saved
        : columns.map((c) => c.key);
    } catch {
      return columns.map((c) => c.key);
    }
  });
  const matches = rows.filter(
    (row) =>
      columns
        .map((c) => c.value(row))
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      filters.every((f) => !picks[f.key]?.length || picks[f.key].includes(f.value(row))),
  );
  const column = columns.find((c) => c.key === sort.key);
  const sorted = [...matches].sort((a, b) => {
    if (!column) return 0;
    const x = column.value(a),
      y = column.value(b);
    return (
      sort.direction *
      (typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true }))
    );
  });
  const last = Math.max(0, Math.ceil(sorted.length / pageSize) - 1),
    current = Math.min(page, last),
    shown = sorted.slice(current * pageSize, (current + 1) * pageSize),
    cols = columns.filter((c) => visible.includes(c.key));
  const toggle = (key: string, value: string) => {
    setPicks((s) => ({
      ...s,
      [key]: s[key]?.includes(value)
        ? s[key].filter((v) => v !== value)
        : [...(s[key] ?? []), value],
    }));
    setPage(0);
  };
  const label = id.replaceAll('-', ' ');
  return (
    <div className={'data-table ' + (compact ? 'compact' : '')}>
      <div className="table-toolbar">
        <label className="table-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label={'Search ' + label}
            placeholder={'Search ' + label}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        {filters.map((f) => (
          <details key={f.key} className="table-filter" name="record-table-menu">
            <summary>
              {f.label}
              {!!picks[f.key]?.length && (
                <span className="filter-count">{picks[f.key].length}</span>
              )}
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <fieldset>
              <legend>{f.label}</legend>
              {Array.from(new Set(rows.map((row) => f.value(row))))
                .sort()
                .map((value) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={picks[f.key]?.includes(value) ?? false}
                      onChange={() => toggle(f.key, value)}
                    />
                    {displayName(value || 'Unassigned')}
                  </label>
                ))}
            </fieldset>
          </details>
        ))}
        <details className="table-filter" name="record-table-menu">
          <summary>
            Columns
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <fieldset>
            <legend>Visible columns</legend>
            {columns.map((c) => (
              <label key={c.key}>
                <input
                  type="checkbox"
                  checked={visible.includes(c.key)}
                  disabled={visible.length === 1 && visible.includes(c.key)}
                  onChange={() => {
                    const next = visible.includes(c.key)
                      ? visible.filter((k) => k !== c.key)
                      : [...visible, c.key];
                    setVisible(next);
                    try {
                      localStorage.setItem('columns-' + id, JSON.stringify(next));
                    } catch {
                      /* Preferences are optional. */
                    }
                  }}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
        </details>
        <button aria-pressed={compact} onClick={() => setCompact(!compact)}>
          {compact ? 'Comfortable rows' : 'Compact rows'}
        </button>
        {(search || Object.values(picks).some((p) => p.length > 0)) && (
          <button
            onClick={() => {
              setSearch('');
              setPicks({});
              setPage(0);
            }}
          >
            Clear filters
          </button>
        )}
        <button
          onClick={() =>
            exportCsv(
              id,
              cols.map((c) => c.label),
              sorted.map((r) => cols.map((c) => c.value(r) ?? 'No reading')),
            )
          }
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <p role="status">Loading records...</p>
      ) : (
        <>
          <div className="table-wrap">
            <table aria-label={label}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      aria-sort={
                        sort.key === c.key
                          ? sort.direction === 1
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        className="sort-label"
                        aria-label={'Sort by ' + c.label}
                        onClick={() =>
                          setSort({
                            key: c.key,
                            direction: sort.key === c.key ? -sort.direction : 1,
                          })
                        }
                      >
                        {c.label}
                        {sort.key === c.key ? (
                          sort.direction === 1 ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} aria-hidden="true" />
                        )}
                      </button>
                      <Term text={c.label} helpOnly />
                    </th>
                  ))}
                  {actions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={rowId(row)}>
                    {cols.map((c, i) => (
                      <td key={c.key} title={String(c.value(row) ?? 'No reading')}>
                        {i === 0 && onSelect ? (
                          <button
                            className={'row-open ' + (c.key === 'id' ? 'record-id' : '')}
                            onClick={() => onSelect(row)}
                          >
                            {c.render ? c.render(row) : c.value(row)}
                          </button>
                        ) : c.render ? (
                          c.render(row)
                        ) : (
                          <ValueText value={c.value(row)} />
                        )}
                      </td>
                    ))}
                    {actions && (
                      <td>
                        <div className="row-actions">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!shown.length && (
            <p className="empty" role="status">
              No records match these filters.
            </p>
          )}
          <div className="table-pagination">
            <span>{sorted.length} records</span>
            <label>
              Rows per page{' '}
              <select
                aria-label={'Rows per page for ' + label}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                {[10, 20, 25].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous page
            </button>
            <span>
              Page {current + 1} of {last + 1}
            </span>
            <button disabled={current === last} onClick={() => setPage(current + 1)}>
              Next page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
