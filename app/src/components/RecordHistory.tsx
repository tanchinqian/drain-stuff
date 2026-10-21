import { useState } from 'react';
import type { AuditEntry } from '../api/types';
import { timeLabel } from '../utils';
export default function RecordHistory({
  entries,
  title = 'Record history',
}: {
  entries: AuditEntry[];
  title?: string;
}) {
  const [all, setAll] = useState(false);
  const unique = new Map<string, AuditEntry>();
  for (const e of [...entries].sort((a, b) => Date.parse(b.t) - Date.parse(a.t))) {
    const key = e.action + '|' + (e.note ?? '') + '|' + e.user;
    if (!unique.has(key)) unique.set(key, e);
  }
  const grouped = [...unique.values()];
  return (
    <details className="record-history">
      <summary>
        {title} ({entries.length})
      </summary>
      {!entries.length ? (
        <p>Save a record update to start the history.</p>
      ) : (
        <>
          <ol>
            {(all ? grouped : grouped.slice(0, 5)).map((e) => (
              <li key={e.id}>
                <strong>{e.action}</strong>
                {e.note && <p>{e.note}</p>}
                <p className="small">
                  {e.user} · {timeLabel(e.t)}
                </p>
              </li>
            ))}
          </ol>
          {grouped.length > 5 && (
            <button onClick={() => setAll(!all)}>
              {all ? 'Show latest five' : 'Show all (' + grouped.length + ')'}
            </button>
          )}
        </>
      )}
    </details>
  );
}
