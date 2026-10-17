import { Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Fault } from '../api/types';
import { api } from '../api/client';
import { useBoard } from '../triage';
import SearchableSelect from './SearchableSelect';
import { DrawerFooter, drawerSaved } from './Drawer';
const states = ['detected', 'confirmed', 'assigned', 'cleared', 'verified', 'closed'];
const actions = {
  detected: 'confirm',
  confirmed: 'assign',
  assigned: 'clear',
  cleared: 'verify',
  verified: 'close',
  closed: 'reopen',
} as const;
export default function WorkOrderPanel({ fault }: { fault: Fault }) {
  const workRef=useRef<HTMLElement>(null);
  const cache = useQueryClient(),
    jobId = useBoard((s) => s.jobId);
  const state = fault.workOrder?.state ?? (fault.status === 'closed' ? 'closed' : 'detected');
  const [note, setNote] = useState(''),
    [assignee, setAssignee] = useState(''),
    [kind, setKind] = useState('storm-rerun'),
    [sensorId, setSensorId] = useState(''),
    [value, setValue] = useState(''),
    [path, setPath] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const sensors = useQuery({
    queryKey: ['work-sensors', fault.featureId],
    queryFn: () => api.sensors({ ownerId: fault.featureId }),
  });
  const crews = useQuery({ queryKey: ['work-crews'], queryFn: () => api.faults() });
  const evidence = fault.workOrder?.evidence?.data as
    { before?: { overflowM3: number }; after?: { overflowM3: number }; path?: string } | undefined;
  async function save(action: (typeof actions)[keyof typeof actions]) {
    setBusy(true);
    setError('');
    try {
      await api.faultLifecycle(fault.id, action, {
        note,
        ...(action === 'assign' ? { assignee } : {}),
        ...(action === 'verify'
          ? {
              evidence:
                kind === 'photo'
                  ? { type: 'photo', path }
                  : kind === 'sensor'
                    ? {
                        type: 'sensor',
                        sensorId,
                        value: Number(value),
                        unit: sensors.data?.find((s) => s.sensorId === sensorId)?.unit ?? '',
                      }
                    : { type: 'storm-rerun', stormRunId: jobId },
            }
          : {}),
      });
      drawerSaved(workRef.current);
      setNote('');
      await cache.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="work-order" ref={workRef}>
      <h3>Work order</h3>
      <ol className="workflow-steps">
        {states.map((s) => (
          <li
            key={s}
            aria-current={s === state ? 'step' : undefined}
            className={s === state ? 'current' : states.indexOf(s) < states.indexOf(state) ? 'complete' : ''}
          >
            <span className="step-dot" aria-hidden="true">{states.indexOf(s) < states.indexOf(state) ? <Check size={12}/> : null}</span>
            {s[0].toUpperCase() + s.slice(1)}
          </li>
        ))}
      </ol>
      <p>
        {fault.workOrder?.assignee ? 'Assigned to ' + fault.workOrder.assignee : 'No crew assigned'}
      </p>
      <label className="field">
        Required note
        <textarea value={note} aria-describedby="work-note-help" maxLength={2000} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p id="work-note-help" className="small">{!note.trim() ? 'Add a note to ' + actions[state] + '.' : 'This note will be saved in the audit trail.'}{state === 'confirmed' && !assignee.trim() ? ' Choose the crew receiving the work.' : ''}</p>
      {state === 'confirmed' && (
        <label className="field">
          Crew or contractor
          <input
            list={'crews-' + fault.id}
            value={assignee}
            maxLength={80}
            onChange={(e) => setAssignee(e.target.value)}
          />
          <datalist id={'crews-' + fault.id}>
            {Array.from(new Set(crews.data?.map((f) => f.workOrder?.assignee).filter(Boolean))).map(
              (n) => (
                <option key={n} value={n} />
              ),
            )}
          </datalist>
        </label>
      )}
      {state === 'cleared' && (
        <>
          <label className="field">
            Verification method
            <SearchableSelect
              label="Verification method"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="storm-rerun">Storm re-run</option>
              <option value="sensor">Trusted sensor reading</option>
              <option value="photo">Photo evidence</option>
            </SearchableSelect>
          </label>
          {kind === 'storm-rerun' && (
            <p className="small">
              {jobId
                ? 'Uses the latest board run. It must include this confirmed fault. Before/after use the same saved rainfall and other inputs.'
                : 'Run a storm from Overview after confirming this fault, then return here.'}
            </p>
          )}
          {kind === 'sensor' && (
            <>
              <label className="field">
                Sensor
                <SearchableSelect
                  label="Verification sensor"
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                >
                  <option value="">Choose a sensor</option>
                  {sensors.data
                    ?.filter((s) => s.status === 'ok')
                    .map((s) => (
                      <option key={s.sensorId} value={s.sensorId}>
                        {s.sensorId} · {s.metric} ({s.unit})
                      </option>
                    ))}
                </SearchableSelect>
              </label>
              <label className="field">
                Observed value
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            </>
          )}
          {kind === 'photo' && (
            <label className="field">
              Evidence photo · JPEG, PNG or WebP, up to 5 MB
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Choose a photo under 5 MB');
                    return;
                  }
                  setBusy(true);
                  setError('');
                  try {
                    const data = await new Promise<string>((res, rej) => {
                      const r = new FileReader();
                      r.onload = () => res(String(r.result).split(',')[1]);
                      r.onerror = rej;
                      r.readAsDataURL(file);
                    });
                    setPath((await api.uploadPhoto(data)).path);
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              {path && <span className="small">Photo saved for this verification</span>}
            </label>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <DrawerFooter><div className="actions">
        <button className="primary"
          disabled={
            busy ||
            !note.trim() ||
            (state === 'confirmed' && !assignee.trim()) ||
            (state === 'cleared' &&
              (kind === 'photo' ? !path : kind === 'sensor' ? !sensorId || value === '' : !jobId))
          }
          onClick={() => save(actions[state])}
        >
          {busy
            ? 'Saving…'
            : {
                detected: 'Confirm fault',
                confirmed: 'Assign crew',
                assigned: 'Record cleared',
                cleared: 'Verify clearance',
                verified: 'Close work order',
                closed: 'Reopen fault',
              }[state]}
        </button>
        {['cleared', 'verified'].includes(state) && (
          <button disabled={busy || !note.trim()} onClick={() => save('reopen')}>
            Reopen fault
          </button>
        )}
      </div></DrawerFooter>
      {evidence?.before && evidence.after && (
        <p className="takeaway">
          Verification re-run: overflow {evidence.before.overflowM3.toFixed(3)} →{' '}
          {evidence.after.overflowM3.toFixed(3)} m³. Relative ranking, not a prediction.
        </p>
      )}
      <p className="small">
        Confirming changes future rankings. Run the board again after a change. Never enter a
        chamber or lift a cover alone.
      </p>
    </section>
  );
}
