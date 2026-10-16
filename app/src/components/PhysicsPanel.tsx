import DataTable from './DataTable';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TrialDetail } from '../api/types';
import {
  conductivityNotice,
  validateConfig,
  scenarios,
  type ParameterKey,
  type Scenario,
} from '../simulation/physics/config';
import { frameAt, useSimulation } from '../simulation/physics/store';
import { usePhysics } from '../simulation/physics/view';
import { runCsv } from '../simulation/physics/export';
import type { Pattern } from '../simulation/physics/rainfall';
import SearchableSelect from './SearchableSelect';
import ChartFrame from './ChartFrame';
import { testMean } from '../utils';
import PhysicsSection from './PhysicsSection';

export default function PhysicsPanel({ ownerId, trial }: { ownerId: string; trial?: TrialDetail }) {
  const { run, config, frame } = usePhysics(ownerId),
    base = useSimulation((s) => s.configs[ownerId]),
    pattern = useSimulation((s) => s.pattern),
    scenario = useSimulation((s) => s.scenario),
    runs = useSimulation((s) => s.runs),
    second = useSimulation((s) => s.second);
  const [rainEditor, setRainEditor] = useState(false),
    [error, setError] = useState(''),
    [drawn, setDrawn] = useState('0, 0\n10, 30\n20, 63\n30, 20');
  const state = useSimulation.getState();
  if (!config || !base) return null;
  const v = base.values,
    latest = trial ? testMean(trial.tests, 'retest') : undefined;
  const points = (run?.frames ?? []).filter(
    (f, i, all) => i === 0 || f.second % 60 < 0.001 || i === all.length - 1,
  );
  const rows = points.map((f) => [
    Number((f.second / 60).toFixed(2)),
    Number((f.rain * 3.6e6).toFixed(2)),
    Number((f.flux.inlet * 60000).toFixed(2)),
    Number((f.flux.outfall * 60000).toFixed(2)),
    Number((f.flux.overflow * 60000).toFixed(2)),
    Number((f.ponding * 1000).toFixed(2)),
  ]);
  const maxFlow = Math.max(1, ...rows.flatMap((r) => r.slice(2, 5))),
    maxStage = Math.max(1, ...rows.map((r) => r[5]));
  const line = (col: number, max: number) =>
    rows
      .map(
        (r, i) =>
          `${i ? 'L' : 'M'}${45 + (680 * r[0]) / Math.max(1, rows.at(-1)?.[0] ?? 1)},${180 - (150 * r[col]) / max}`,
      )
      .join(' ');
  const save = () => {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([runCsv(run)], { type: 'text/csv;charset=utf-8' })),
      a = document.createElement('a');
    a.href = url;
    a.download = `${ownerId}-model-run.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const update = (key: ParameterKey, value: number) => {
    try {
      const c = structuredClone(base);
      c.values[key].value = value;
      validateConfig(c);
      state.parameter(ownerId, key, value);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid parameter');
    }
  };
  return (
    <div className="physics-analysis" id="storm-controls">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Storm settings · {ownerId}</h2>
            <p className="sub">Adjust rainfall and drainage settings for the current storm.</p>
          </div>
          <button disabled={!run} onClick={save}>
            Export run CSV
          </button>
        </div>
        <div className="physics-fields">
          <label className="field">
            Peak rain · {(v.peak.value * 3.6e6).toFixed(0)} mm/h
            <input
              aria-label="Rain intensity"
              type="range"
              min="0"
              max="120"
              step="1"
              value={v.peak.value * 3.6e6}
              onChange={(e) => state.weather('peak', Number(e.target.value) / 3.6e6)}
            />
            <small>Shared storm</small>
          </label>
          <label className="field">
            Duration · {v.duration.value / 60} min
            <input
              aria-label="Rain duration"
              type="range"
              min="5"
              max="120"
              step="5"
              value={v.duration.value / 60}
              onChange={(e) => state.weather('duration', Number(e.target.value) * 60)}
            />
            <small>Shared storm</small>
          </label>
          <label className="field">
            Rain pattern
            <SearchableSelect
              label="Rain pattern"
              value={pattern}
              onChange={(e) => {
                const next = e.target.value as Pattern;
                if (next === 'drawn') {
                  setRainEditor(true);
                  setError('Enter and apply a rainfall pattern below.');
                } else state.setPattern(next);
              }}
            >
              <option value="alternating-block">Alternating blocks</option>
              <option value="uniform">Uniform</option>
              <option value="drawn">User-entered pattern</option>
            </SearchableSelect>
          </label>
          <label className="field">
            Scenario
            <SearchableSelect
              label="Simulation scenario"
              value={scenario}
              onChange={(e) => state.setScenario(e.target.value as Scenario)}
            >
              {scenarios.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SearchableSelect>
          </label>
          <label className="field">
            Tailwater · {v.tailwater.value.toFixed(2)} m
            <input
              aria-label="Tailwater level"
              type="range"
              min="0"
              max="1.5"
              step=".05"
              value={v.tailwater.value}
              onChange={(e) => {
                state.setScenario('Normal');
                state.weather('tailwater', Number(e.target.value));
              }}
            />
            <small>Relative to outfall invert</small>
          </label>
          <label className="field">
            Conductivity · {ownerId} · mm/h
            <input
              aria-label="Hydraulic conductivity"
              type="number"
              min="0"
              max="500"
              step="1"
              value={Number((v.ks.value * 3.6e6).toFixed(4))}
              onChange={(e) => update('ks', Number(e.target.value) / 3.6e6)}
            />
            <small>n = {base.sampleCount}</small>
          </label>
        </div>
        <p>{conductivityNotice}. Compost allocation does not change conductivity.</p>
        {latest && (
          <button
            onClick={() =>
              state.parameter(ownerId, 'ks', latest.value / 3.6e6, 'trial-record', latest.n)
            }
          >
            Load trial re-test: {latest.value.toFixed(1)} mm/h · n = {latest.n}
          </button>
        )}
        <p className="small">
          High river tailwater can prevent discharge. A household-scale pilot cannot fix river
          overflow. Scenarios override the corresponding parameters; effective values are listed
          below.
        </p>
        <details open={rainEditor} onToggle={(e) => setRainEditor(e.currentTarget.open)}>
          <summary>Enter a rain pattern</summary>
          <label className="field">
            One minute, intensity (mm/h) pair per line. Start at minute 0; end before the duration.
            <textarea
              aria-label="Drawn rainfall points"
              value={drawn}
              onChange={(e) => setDrawn(e.target.value)}
              rows={5}
            />
          </label>
          <button
            onClick={() => {
              const rain = drawn
                .trim()
                .split('\n')
                .map((line) => {
                  const values = line.split(',').map(Number);
                  return { second: values[0] * 60, intensity: values[1] / 3.6e6 };
                });
              if (
                rain.length < 2 ||
                rain[0].second !== 0 ||
                rain.some(
                  (p, i) =>
                    !Number.isFinite(p.second) ||
                    !Number.isFinite(p.intensity) ||
                    p.intensity < 0 ||
                    p.second < 0 ||
                    p.second >= v.duration.value ||
                    (i > 0 && p.second <= rain[i - 1].second),
                )
              ) {
                setError(
                  'Use at least two increasing times, starting at 0, with nonnegative rain inside the duration.',
                );
                return;
              }
              state.setPattern('drawn', rain);
              setError('');
            }}
          >
            Apply entered pattern
          </button>
        </details>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      <ChartFrame
        title="Storm response"
        subtitle="Shared clock; rate and stage use separate labelled scales"
        headers={[
          'Minute',
          'Rain mm/h',
          'Inlet L/min',
          'Outlet L/min',
          'Overflow L/min',
          'Ponding mm',
        ]}
        rows={rows}
        takeaway="Inlet, outlet and overflow use the left flow scale. Dashed ponding uses the right depth scale. Rain is shown in the separate strip; table and CSV contain exact values."
      >
        <div className="plot-axis-labels">
          <span>Flow: 0 to {maxFlow.toFixed(0)} L/min</span>
          <span>Ponding: 0 to {maxStage.toFixed(0)} mm</span>
        </div>
        <svg
          className="physics-hydrograph"
          preserveAspectRatio="none"
          viewBox="40 20 690 165"
          role="img"
          aria-label="Hydrograph of inlet, outlet, overflow and ponding"
        >
          <path d="M45 25V180H725" stroke="#6f665a" fill="none" />
          {[
            [2, '#2f2b26'],
            [3, '#b07a12'],
            [4, '#8e3a2e'],
            [5, '#7b4daf'],
          ].map(([col, color]) => (
            <path
              key={col}
              d={line(Number(col), col === 5 ? maxStage : maxFlow)}
              fill="none"
              stroke={String(color)}
              strokeWidth="2"
              strokeDasharray={col === 5 ? '5 3' : undefined}
            />
          ))}
          <line
            x1={45 + (680 * (second / 60)) / Math.max(1, rows.at(-1)?.[0] ?? 1)}
            x2={45 + (680 * (second / 60)) / Math.max(1, rows.at(-1)?.[0] ?? 1)}
            y1="25"
            y2="180"
            stroke="#6f665a"
            strokeDasharray="2 4"
          />
        </svg>
        <div className="plot-axis-labels">
          <span>0 min</span>
          <span>{rows.at(-1)?.[0] ?? 0} min</span>
        </div>
        <p className="plot-legend">
          Brown: inlet; ochre: outlet; oxblood: overflow; dashed purple: ponding.
        </p>
        <p className="plot-legend">Rain: peak {(v.peak.value * 3.6e6).toFixed(0)} mm/h</p>
        <svg
          viewBox="0 0 800 80"
          role="img"
          aria-label="Rain intensity strip in millimetres per hour"
        >
          {rows.map((r, i) => (
            <rect
              key={i}
              x={45 + (i * 680) / Math.max(1, rows.length)}
              y={65 - (r[1] / Math.max(1, v.peak.value * 3.6e6)) * 40}
              width={Math.max(1, 680 / Math.max(1, rows.length))}
              height={(r[1] / Math.max(1, v.peak.value * 3.6e6)) * 40}
              fill="#b2663a"
            />
          ))}
        </svg>
      </ChartFrame>
      {frame && (
        <section className="panel">
          <h2>Water balance at minute {Math.floor(second / 60)}</h2>
          <p className="small">
            Effective runoff input = stored water + outlet + overflow + seepage +
            evapotranspiration. Storage includes upstream nodes and depression storage.
          </p>
          <div className="balance-bars">
            {[
              ['Stored', frame.storage],
              ['Outlet', frame.cumulative.outlet],
              ['Overflow', frame.cumulative.overflow],
              ['Seepage', frame.cumulative.seepage],
              ['ET', frame.cumulative.et],
            ].map(([name, value]) => (
              <div key={name}>
                <span>
                  {name}: {Number(value).toFixed(4)} m³
                </span>
                <meter
                  min="0"
                  max={Math.max(1e-9, frame.cumulative.input)}
                  value={Number(value)}
                  aria-label={String(name) + ' volume'}
                />
              </div>
            ))}
          </div>
          <p>
            Input {frame.cumulative.input.toFixed(4)} m³ · residual{' '}
            {frame.balanceResidual.toExponential(2)} m³ · relative error{' '}
            {frame.relativeError.toExponential(2)}
          </p>
          <details>
            <summary>View as table · current model outputs</summary>
            <DataTable
              id={'model-outputs-' + ownerId}
              rows={[
                ...Object.entries(frame.cell).map(([name, value]) => ({
                  name,
                  value,
                  unit: name === 'clog' ? 'fraction' : 'm³',
                })),
                ...Object.entries(frame.flux).map(([name, value]) => ({
                  name: name + ' flow',
                  value: value * 60000,
                  unit: 'L/min',
                })),
              ]}
              rowId={(r) => r.name}
              columns={[
                {
                  key: 'name',
                  label: 'Quantity',
                  value: (r) => r.name.replace(/^./, (c) => c.toUpperCase()),
                },
                { key: 'value', label: 'Value', value: (r) => Number(r.value.toFixed(3)) },
                { key: 'unit', label: 'Unit', value: (r) => r.unit },
              ]}
            />
          </details>
        </section>
      )}
      {ownerId.startsWith('S') && (
        <section className="panel">
          <h2>Same storm, three conductivities</h2>
          <p>
            {conductivityNotice}. Identical swale dimensions and weather by default; edits to other
            parameters make this a configuration comparison.
          </p>
          <div className="physics-comparison">
            {['S3', 'S2', 'S1'].map((id) => {
              const r = runs[id],
                f = frameAt(r, second);
              return (
                <div key={id}>
                  <h3>
                    <Link to={'/feature/' + id}>
                      {id} ·{' '}
                      {id === 'S3' ? 'Control' : id === 'S2' ? 'Decompaction' : 'Compost arm'}
                    </Link>
                  </h3>
                  {r && <PhysicsSection config={r.config} frame={f} />}
                  <p>
                    {((r?.config.values.ks.value ?? 0) * 3.6e6).toFixed(1)} mm/h · n ={' '}
                    {r?.config.sampleCount ?? 0}
                  </p>
                  <p>
                    Ponding {((f?.ponding ?? 0) * 1000).toFixed(1)} mm · outlet{' '}
                    {((f?.flux.drain ?? 0) * 60000).toFixed(1)} L/min
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
