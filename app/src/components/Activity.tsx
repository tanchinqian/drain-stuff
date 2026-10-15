import { useActivity } from '../state';
import { timeLabel } from '../utils';
export default function Activity() {
  const rows = useActivity((s) => s.entries).filter((e) => e.page === location.pathname);
  return (
    <details className="panel page-activity">
      <summary>Save history ({rows.length})</summary>
      {rows.length ? (
        <ol>
          {rows.map((e) => (
            <li key={e.id}>
              <strong>{e.action}</strong>
              <p className="small">
                {e.user} · {timeLabel(e.t)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p>No changes saved on this page yet.</p>
      )}
    </details>
  );
}
