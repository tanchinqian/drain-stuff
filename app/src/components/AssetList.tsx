import { useState } from 'react';
export default function AssetList({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: string; detail: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = items.filter((i) =>
    (i.id + ' ' + i.detail).toLowerCase().includes(search.toLowerCase()),
  );
  const group = (id: string) =>
    /^[A-D]\d+-D$/.test(id)
      ? 'Houses'
      : id.startsWith('B-')
        ? 'Batches'
        : /^[SITR]\d+$/.test(id)
          ? 'Drainage'
          : 'Site';
  const item = (i: { id: string; detail: string }) => (
    <button key={i.id} aria-pressed={value === i.id} onClick={() => onChange(i.id)}>
      <strong className="record-id">{i.id}</strong>
      <small>{i.detail}</small>
    </button>
  );
  return (
    <aside className="master-list asset-list" aria-label={label}>
      <input
        type="search"
        aria-label={'Search ' + label.toLowerCase()}
        placeholder="Find an asset"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button aria-pressed={!value} onClick={() => onChange('')}>
        All assets
      </button>
      {['Drainage', 'Batches', 'Site', 'Houses'].map((g) => {
        const rows = filtered.filter((i) => group(i.id) === g);
        return rows.length ? (
          g === 'Houses' ? (
            <details className="asset-group" key={g} open={search ? true : undefined}>
              <summary>Houses ({rows.length})</summary>
              {rows.map(item)}
            </details>
          ) : (
            <section key={g}>
              <h3>{g}</h3>
              {rows.map(item)}
            </section>
          )
        ) : null;
      })}
      {!filtered.length && <p>No matching assets.</p>}
    </aside>
  );
}
