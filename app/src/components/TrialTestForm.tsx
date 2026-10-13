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
    [texture, setTexture] = useState(trial.soilTexture);
  const write = useWrite(
    () =>
      api.test(trial.featureId, {
        phase: trial.baselineDone ? 'retest' : 'baseline',
        metric,
        value: Number(value),
        pointId: point,
        n: trial.repeatsPerPoint,
        soilTexture: texture,
      }),
    'Test recorded at the marked point.',
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
      <form onSubmit={submit}>
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
              {['Clay loam · synthetic', 'Sandy loam · synthetic', 'Sand · synthetic'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SearchableSelect>
          </div>
          <label className="field">
            Test phase
            <input readOnly value={trial.baselineDone ? 'Re-test' : 'Baseline before treatment'} />
          </label>
          <div className="field">
            <span>Marked point</span>
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
            <input readOnly value={trial.repeatsPerPoint} />
          </label>
        </div>
        <button
          type="submit"
          className="primary"
          disabled={write.isPending || (!trial.baselineDone && texture === 'Not recorded')}
          style={{ marginTop: 15 }}
        >
          Record {trial.baselineDone ? 're-test' : 'baseline point'}
        </button>
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
      <h3>Test history · synthetic</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Point</th>
              <th>Phase</th>
              <th>Measurement</th>
              <th>n</th>
            </tr>
          </thead>
          <tbody>
            {trial.tests.slice(-9).map((t, i) => (
              <tr key={i}>
                <td>{dateTime(t.t)}</td>
                <td>{t.pointId}</td>
                <td>{t.phase}</td>
                <td>
                  {t.value} {t.unit}
                </td>
                <td>{t.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
