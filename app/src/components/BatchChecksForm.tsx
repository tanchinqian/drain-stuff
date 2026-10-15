import RecordHistory from './RecordHistory';
import { displayName } from '../utils';
import Term from './Term';
import { useState, type FormEvent } from 'react';
import type { BatchChecks, BatchDetail } from '../api/types';
import { api } from '../api/client';
import { useWrite } from '../hooks';
import PhotoSlot from './PhotoSlot';
export default function BatchChecksForm({ batch }: { batch: BatchDetail }) {
  const [checks, setChecks] = useState<BatchChecks>(batch.checks);
  const write = useWrite(
    () => api.batchChecks(batch.id, checks),
    'Saved to batch ' + batch.id + ' check log',
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    write.mutate();
  }
  const checkbox = (
    key:
      | 'ambientReached'
      | 'didNotReheat'
      | 'manualMaturity'
      | 'intakeChecked'
      | 'plasticsFound'
      | 'glassFound'
      | 'bayCovered'
      | 'sumpChecked'
      | 'rainExpected'
      | 'puddles'
      | 'pests',
    label: string,
  ) => (
    <label className="check" key={key}>
      <input
        type="checkbox"
        checked={checks[key]}
        onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <section className="panel">
      <h2>Intake, maturity and leachate checks</h2>
      <p className="small">Saves to batch {batch.id} check log.</p>
      <form onSubmit={submit}>
        <h3 style={{ marginTop: 20 }}>Intake check</h3>
        <PhotoSlot
          label="Drop-off photo"
          value={checks.photoUrl}
          onChange={(photo) => setChecks({ ...checks, photoUrl: photo })}
        />
        {checkbox('intakeChecked', 'Human intake check completed')}
        {checkbox('plasticsFound', 'Plastic found — hold this batch')}
        {checkbox('glassFound', 'Glass found — hold this batch')}
        <p className="small">
          Vision model stub: no image analysis is connected. The human checklist records the result.
        </p>
        <hr className="divider" />
        <h3>Human reference checks</h3>
        <fieldset>
          <legend>Squeeze test</legend>
          <div className="segments">
            {(['dry', 'ok', 'wet'] as const).map((v) => (
              <button
                type="button"
                aria-pressed={checks.squeeze === v}
                key={v}
                onClick={() => setChecks({ ...checks, squeeze: v })}
              >
                {v === 'ok' ? 'OK' : v === 'dry' ? 'Dry' : 'Wet'}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Smell log</legend>
          <div className="segments">
            {(['normal', 'ammonia', 'putrid', 'sour'] as const).map((v) => (
              <button
                type="button"
                aria-pressed={checks.smell === v}
                key={v}
                onClick={() => setChecks({ ...checks, smell: v })}
              >
                {v === 'normal'
                  ? 'Normal'
                  : v === 'ammonia'
                    ? 'Ammonia'
                    : v === 'putrid'
                      ? 'Putrid or rotten egg'
                      : 'Sour'}
              </button>
            ))}
          </div>
        </fieldset>
        {checkbox('puddles', 'Puddles observed on the base')}
        {checkbox('pests', 'Pests observed  -  visual only')}
        <label className="field">
          Measured sump level, cm
          <input
            type="number"
            required
            min="0"
            max="200"
            value={checks.sumpLevelCm}
            onChange={(e) => setChecks({ ...checks, sumpLevelCm: Number(e.target.value) })}
          />
        </label>
        <hr className="divider" />
        <h3>
          <Term text="Maturity gate" />
        </h3>
        <label className="field">
          Measured ambient temperature, °C
          <input
            required
            type="number"
            min="0"
            max="60"
            step=".1"
            value={checks.ambientTempC}
            onChange={(e) => setChecks({ ...checks, ambientTempC: Number(e.target.value) })}
          />
          <span className="field-note">Compare this value with the measured pile temperature.</span>
        </label>
        {checkbox('ambientReached', 'Temperature fell to measured ambient')}
        {checkbox('didNotReheat', 'Temperature did not reheat after turning')}
        {checkbox('manualMaturity', 'Manual maturity checks passed')}
        <div className="notice">
          {batch.maturityGate === 'passed'
            ? 'Maturity gate passed. Allocation still requires a feature baseline and a labelled dose.'
            : batch.gateReason || 'Complete all maturity checks before allocation.'}
        </div>
        <hr className="divider" />
        <h3>Leachate guard · {batch.bay}</h3>
        {checkbox('rainExpected', 'Rain is expected')}
        {checkbox('bayCovered', 'Bay cover checked')}
        {checkbox('sumpChecked', 'Sump checked')}
        <button
          type="submit"
          className="primary"
          disabled={write.isPending}
          style={{ marginTop: 14 }}
        >
          Save batch checks
        </button>
        {write.error && (
          <p className="error" role="alert">
            {write.error.message}
          </p>
        )}
      </form>
      <RecordHistory
        entries={(batch.checkHistory ?? []).map((r) => ({
          ...r,
          action: batch.id + ' checks saved',
          note: `Squeeze: ${displayName(r.checks.squeeze)}; smell: ${displayName(r.checks.smell)}; cover: ${r.checks.bayCovered ? 'checked' : 'pending'}; sump ${r.checks.sumpLevelCm} cm`,
        }))}
        title="Check history"
      />
    </section>
  );
}
