import { useState, type ReactNode } from 'react';
import { exportCsv, displayName, formatValue } from '../utils';
import Term from './Term';
export interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
}
export interface TableFilter<T> {
  key: string;
  label: string;
  value: (row: T) => string;
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
    [selected, setSelected] = useState<string[]>([]),
    [page, setPage] = useState(0),
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
  const last = Math.max(0, Math.ceil(sorted.length / 25) - 1),
    current = Math.min(page, last),
    shown = sorted.slice(current * 25, current * 25 + 25),
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
  return (
    <div className={'data-table ' + (compact ? 'compact' : '')}>
      <div className="table-toolbar">
        <label className="field">
          Search {id.replaceAll('-', ' ')}
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        {filters.map((f) => (
          <details key={f.key} className="table-filter">
            <summary>
              {f.label}
              {picks[f.key]?.length ? ` (${picks[f.key].length})` : ''}
            </summary>
            <fieldset>
              <legend>{f.label}</legend>
              {Array.from(new Set(rows.map(f.value)))
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
        <details className="table-filter">
          <summary>Columns</summary>
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
        <button
          onClick={() => {
            setSearch('');
            setPicks({});
            setPage(0);
          }}
        >
          Clear filters
        </button>
        <button
          onClick={() =>
            exportCsv(
              id,
              cols.map((c) => c.label),
              sorted
                .filter((r) => !selected.length || selected.includes(rowId(r)))
                .map((r) => cols.map((c) => c.value(r) ?? 'No reading')),
            )
          }
        >
          Export CSV{selected.length ? ` (${selected.length})` : ''}
        </button>
      </div>
      {loading ? (
        <p role="status">Loading records...</p>
      ) : (
        <>
          <div className="table-wrap">
            <table aria-label={id.replaceAll('-', ' ')}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label={'Select all visible ' + id}
                      checked={shown.length > 0 && shown.every((r) => selected.includes(rowId(r)))}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Array.from(new Set([...selected, ...shown.map(rowId)]))
                            : selected.filter((k) => !shown.some((r) => rowId(r) === k)),
                        )
                      }
                    />
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      aria-sort={
                        sort.key === c.key
                          ? sort.direction === 1
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <Term text={c.label} />
                      <button
                        aria-label={'Sort by ' + c.label}
                        onClick={() =>
                          setSort({
                            key: c.key,
                            direction: sort.key === c.key ? -sort.direction : 1,
                          })
                        }
                      >
                        Sort{sort.key === c.key ? (sort.direction === 1 ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  ))}
                  {actions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={rowId(row)} data-selected={selected.includes(rowId(row))}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={'Select ' + rowId(row)}
                        checked={selected.includes(rowId(row))}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, rowId(row)]
                              : selected.filter((k) => k !== rowId(row)),
                          )
                        }
                      />
                    </td>
                    {cols.map((c, i) => (
                      <td key={c.key}>
                        {i === 0 && onSelect ? (
                          <button className="row-open" onClick={() => onSelect(row)}>
                            {c.render ? c.render(row) : c.value(row)}
                          </button>
                        ) : c.render ? (
                          c.render(row)
                        ) : typeof c.value(row) === 'number' ? (
                          formatValue(Number(c.value(row)))
                        ) : (
                          (c.value(row) ?? 'No reading')
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
            <span>
              {sorted.length} records · {selected.length} selected
            </span>
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
