import SearchableSelect from './SearchableSelect';
import { useState, type FormEvent } from 'react';
import type { Config, Guardrails, TrialDetail } from '../api/types';
import { api } from '../api/client';
import { DEMO_NOW } from '../api/mock/seed';
import { useWrite } from '../hooks';
import Status from './Status';
import PhotoSlot from './PhotoSlot';
export default function GuardrailForm({ trial, config }: { trial: TrialDetail; config: Config }) {
  const [checks, setChecks] = useState<Guardrails>(trial.guardrails),
    [sample, setSample] = useState(String(trial.guardrails.outletSample?.value ?? ''));
  const write = useWrite(
    () =>
      api.guardrails(trial.featureId, {
        ...checks,
        outletSample:
          checks.nutrientExport === 'not_tested'
            ? undefined
            : { t: DEMO_NOW, value: Number(sample), unit: 'mg/L' },
      }),
    'Guardrail checks recorded.',
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    write.mutate();
  }
  return (
    <section className="panel">
      <h2>Guardrail checks</h2>
      <p className="sub">Human recorded checks · synthetic</p>
      <form onSubmit={submit}>
        <div className="field" style={{ marginTop: 16 }}>
          <span>Nutrient-export check</span>
          <SearchableSelect
            label="Nutrient-export check"
            value={checks.nutrientExport}
            onChange={(e) =>
              setChecks({
                ...checks,
                nutrientExport: e.target.value as Guardrails['nutrientExport'],
              })
            }
          >
            <option value="not_tested">Not tested</option>
            <option value="pass">Human recorded pass</option>
            <option value="fail">Human recorded fail</option>
          </SearchableSelect>
        </div>
        {checks.nutrientExport !== 'not_tested' && (
          <label className="field" style={{ marginTop: 12 }}>
            Outlet sample result, mg/L
            <input
              type="number"
              min="0"
              max="1000"
              step=".01"
              required
              value={sample}
              onChange={(e) => setSample(e.target.value)}
            />
            <span className="field-note">
              Pass/fail is recorded by the practitioner; no nutrient threshold is inferred.
            </span>
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={checks.noOpenDrainContact}
            onChange={(e) => setChecks({ ...checks, noOpenDrainContact: e.target.checked })}
          />
          Compost is not placed in contact with an open drain
        </label>
        <div className="notice">
          Post-storm check after the first heavy rain following application. Rainfall reference:{' '}
          {config.heavyRainMmHr} mm/h · placeholder, to confirm.
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={checks.washoutChecked}
            onChange={(e) => setChecks({ ...checks, washoutChecked: e.target.checked })}
          />
          Washout checked
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={checks.cloggingChecked}
            onChange={(e) => setChecks({ ...checks, cloggingChecked: e.target.checked })}
          />
          Clogging checked
        </label>
        <PhotoSlot
          label="Post-storm photo"
          value={checks.postStormPhoto}
          onChange={(photo) => setChecks({ ...checks, postStormPhoto: photo })}
        />
        <div className="field">
          <span>Post-storm result</span>
          <SearchableSelect
            label="Post-storm result"
            value={checks.postStormCheck}
            onChange={(e) =>
              setChecks({
                ...checks,
                postStormCheck: e.target.value as Guardrails['postStormCheck'],
              })
            }
          >
            <option value="pending">Pending</option>
            <option value="ok">Checked, no issue recorded</option>
            <option value="issue">Issue recorded</option>
          </SearchableSelect>
        </div>
        <hr className="divider" />
        <Status status={checks.drainDownFlag ? 'watch' : 'ok'} />
        <p className="small">
          Standing-water watch if drain-down exceeds {config.drainDownLimitH} h · placeholder, to
          confirm.
        </p>
        <button
          type="submit"
          disabled={
            write.isPending ||
            (checks.postStormCheck !== 'pending' &&
              (!checks.washoutChecked || !checks.cloggingChecked))
          }
          style={{ marginTop: 15 }}
        >
          Save guardrail checks
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
