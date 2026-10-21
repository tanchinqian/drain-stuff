import { DrawerFooter } from './Drawer';
import DataTable from './DataTable';
import Term from './Term';
import { displayName, formatValue } from '../utils';
import SearchableSelect from './SearchableSelect';
import { useState, type FormEvent } from 'react';
import type { Metric, TrialDetail } from '../api/types';
import { api } from '../api/client';
import { useWrite } from '../hooks';
import { dateTime } from '../utils';
export default function TrialTestForm({ trial }: { trial: TrialDetail }) {
  const [metric, setMetric] = useState<Metric>('infiltration_mm_hr'),
    [point, setPoint] = useState(trial.featureId + '-P1'),
    [value, setValue] = useState('13'),
    [texture, setTexture] = useState(trial.soilTexture.split(' · ')[0]),
    [repeats, setRepeats] = useState(trial.repeatsPerPoint);
  const write = useWrite(
    () =>
      api.test(trial.featureId, {
        phase: trial.baselineDone ? 'retest' : 'baseline',
        metric,
        value: Number(value),
        pointId: point,
        n: repeats,
        soilTexture: texture,
      }),
    'Saved to trial record ' + trial.featureId,
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    write.mutate();
  }
  return (
    <section className="panel">
      <h2>Measurement protocol</h2>
      <div className="notice">Pilot, small sample, not proof</div>
      <p>
        <strong>{trial.method}</strong> · locked for this trial
      </p>
      <p className="sub">
        {trial.markedPoints} marked points · {trial.repeatsPerPoint} repeats per point · n ={' '}
        {trial.n}
      </p>
      <p className="small">Saves to trial record {trial.featureId}.</p>
      <form id="TrialTestForm" onSubmit={submit}>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <span>Soil texture</span>
            <SearchableSelect
              label="Soil texture"
              value={texture}
              disabled={trial.baselineDone}
              onChange={(e) => setTexture(e.target.value)}
            >
              <option value="Not recorded">Choose texture</option>
              {['Clay loam', 'Sandy loam', 'Sand'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SearchableSelect>
          </div>
          <label className="field">
            Test phase
            <input readOnly value={trial.baselineDone ? 'Re-test' : 'Baseline before treatment'} />
          </label>
          <div className="field">
            <span>
              <Term text="Marked points" />
            </span>
            <SearchableSelect
              label="Marked point"
              value={point}
              onChange={(e) => setPoint(e.target.value)}
            >
              {Array.from(
                { length: trial.markedPoints },
                (_, i) => trial.featureId + '-P' + (i + 1),
              ).map((id) => (
                <option key={id}>{id}</option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Measurement</span>
            <SearchableSelect
              label="Measurement"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="infiltration_mm_hr">Infiltration, mm/h</option>
              {trial.baselineDone && (
                <>
                  <option value="drain_down_h">Drain-down, h</option>
                  <option value="sediment_mm">Sediment, mm</option>
                </>
              )}
            </SearchableSelect>
          </div>
          <label className="field">
            Measured value
            <input
              type="number"
              min="0"
              max="1000"
              step=".1"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="field">
            Repeats at this point
            <input
              type="number"
              min="1"
              max="20"
              value={repeats}
              onChange={(e) => setRepeats(Number(e.target.value))}
            />
          </label>
        </div>
        <DrawerFooter>        <button
          type="submit" form="TrialTestForm"
          className="primary"
          disabled={write.isPending || (!trial.baselineDone && texture === 'Not recorded')}
          style={{ marginTop: 15 }}
        >
          Record {trial.baselineDone ? 're-test' : 'baseline point'}
        </button></DrawerFooter>
        {write.error && (
          <p role="alert" className="error">
            {write.error.message}
          </p>
        )}
      </form>
      {!trial.baselineDone && (
        <p className="takeaway">
          Record the baseline at every marked point before compost allocation.
        </p>
      )}
      <hr className="divider" />
      <h3>Test history</h3>
      <DataTable
        id={'test-history-' + trial.featureId}
        rows={trial.tests.map((t, i) => ({ ...t, id: String(i) }))}
        rowId={(r) => r.id}
        columns={[
          { key: 'time', label: 'Time', value: (t) => dateTime(t.t) },
          { key: 'point', label: 'Marked points', value: (t) => t.pointId },
          { key: 'phase', label: 'Phase', value: (t) => displayName(t.phase) },
          { key: 'value', label: 'Measurement', value: (t) => formatValue(t.value, t.unit) },
          { key: 'n', label: 'Repeats', value: (t) => t.n },
        ]}
      />
    </section>
  );
}
