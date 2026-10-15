import SearchableSelect from './SearchableSelect';
import { useState, type FormEvent } from 'react';
import type { BatchDetail, Config, TrialDetail } from '../api/types';
import { api } from '../api/client';
import { useWrite } from '../hooks';
export default function AllocationForm({
  trial,
  batches,
  config,
}: {
  trial: TrialDetail;
  batches: BatchDetail[];
  config: Config;
}) {
  const [batchId, setBatchId] = useState(
      batches.find((b) => b.maturityGate === 'passed')?.id || batches[0]?.id || '',
    ),
    [doseLabel, setDoseLabel] = useState(config.pilotDoses[0].label),
    [appliedBy, setAppliedBy] = useState('Trial crew'),
    [depth, setDepth] = useState(String((trial.amendedDepthM ?? 0.15) * 1000));
  const batch = batches.find((b) => b.id === batchId),
    dose = config.pilotDoses.find((d) => d.label === doseLabel)!;
  const reason = !trial.baselineDone
    ? 'Baseline is missing. Record all marked points first.'
    : trial.arm !== 'compost'
      ? 'This arm receives no compost.'
      : !batch
        ? 'Choose a batch.'
        : batch.maturityGate !== 'passed'
          ? batch.gateReason || 'Maturity gate is blocked.'
          : dose.lPerM2 > config.doseCapLPerM2
            ? 'Pilot dose exceeds the configured cap.'
            : !trial.guardrails.noOpenDrainContact
              ? 'Record the no open-drain contact confirmation first.'
              : !appliedBy.trim()
                ? 'Record who applied the batch.'
                : null;
  const write = useWrite(
    () =>
      api.allocate(batchId, {
        featureId: trial.featureId,
        doseLabel,
        lPerM2: dose.lPerM2,
        appliedBy,
        amendedDepthM: Number(depth) / 1000,
      }),
    'Saved compost allocation to trial record ' + trial.featureId,
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    write.mutate();
  }
  return (
    <section className="panel">
      <h2>Allocate mature compost</h2>
      <p className="sub">Labelled pilot doses; no fixed target</p>
      <form onSubmit={submit}>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <span>Batch</span>
            <SearchableSelect
              label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {b.maturityGate === 'passed' ? 'Mature' : b.gateReason}
                </option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Pilot dose</span>
            <SearchableSelect
              label="Pilot dose"
              value={doseLabel}
              onChange={(e) => setDoseLabel(e.target.value)}
            >
              {config.pilotDoses.map((d) => (
                <option key={d.label}>{d.label}</option>
              ))}
            </SearchableSelect>
          </div>
          <label className="field">
            Labelled dose, L/m²
            <input readOnly type="number" value={dose.lPerM2} max={config.doseCapLPerM2} />
          </label>
          <label className="field">
            Amended soil depth, mm
            <input
              required
              type="number"
              min="1"
              max="1000"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
          </label>
          <label className="field">
            Applied by
            <input required value={appliedBy} onChange={(e) => setAppliedBy(e.target.value)} />
          </label>
        </div>
        <div className="notice">
          Dose cap: {config.doseCapLPerM2} L/m². This is a guardrail, not a treatment target.
        </div>
        {reason && (
          <p className="error" id="allocation-reason">
            {reason}
          </p>
        )}
        <button
          className="primary"
          type="submit"
          aria-describedby={reason ? 'allocation-reason' : undefined}
          disabled={Boolean(reason) || write.isPending}
          style={{ marginTop: 14 }}
        >
          Allocate to {trial.featureId}
        </button>
        {write.error && (
          <p className="error" role="alert">
            {write.error.message}
          </p>
        )}
      </form>
    </section>
  );
}
