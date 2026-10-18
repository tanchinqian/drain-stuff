import { useState } from 'react';
import Drawer from './Drawer';
import DataTable from './DataTable';
import { usePhysics } from '../simulation/physics/view';
import { useSimulation } from '../simulation/physics/store';
import { validateConfig, type ParameterKey } from '../simulation/physics/config';
import { formatValue } from '../utils';
const groups: Record<string, ParameterKey[]> = {
  Rainfall: [
    'peak',
    'duration',
    'recovery',
    'idfA',
    'idfB',
    'idfC',
    'idfD',
    'returnPeriod',
    'step',
  ],
  Catchment: [
    'roofArea',
    'pavedArea',
    'lawnArea',
    'roofC',
    'pavedC',
    'lawnC',
    'roofDepression',
    'pavedDepression',
    'lawnDepression',
    'overlandTime',
    'drainTime',
  ],
  Surface: ['length', 'width', 'sideSlope', 'sediment', 'clogPerVolume', 'sedimentClog'],
  Soil: [
    'mediaDepth',
    'transitionDepth',
    'gravelDepth',
    'porosity',
    'gravelVoid',
    'transitionVoid',
    'ks',
    'nativeKs',
    'et',
    'liner',
  ],
  Drain: [
    'drainC',
    'drainN',
    'drainOffset',
    'pipeDiameter',
    'pipeSlope',
    'manningN',
    'pipeLength',
    'inletArea',
    'inletPerimeter',
    'inletOpen',
    'sockOpen',
    'nodeArea',
    'sensorNoise',
    'sensorBias',
    'sensorDrift',
    'mountHeight',
  ],
  Overflow: ['crest', 'outfallInvert', 'tailwater', 'overflowLength', 'cw', 'co', 'gravity'],
};
const labels: Partial<Record<ParameterKey, string>> = {
  ks: 'Infiltration rate',
  nativeKs: 'Native soil infiltration rate',
  hco: 'Conductivity response',
  et: 'Evaporation demand',
  drainC: 'Drain coefficient',
  drainN: 'Drain exponent',
  inletOpen: 'Inlet open area',
  sockOpen: 'Sock open area',
  cw: 'Weir coefficient',
  co: 'Orifice coefficient',
  manningN: 'Pipe roughness',
  idfA: 'Rainfall coefficient A',
  idfB: 'Rainfall coefficient B',
  idfC: 'Rainfall coefficient C',
  idfD: 'Rainfall coefficient D',
};
const label = (key: ParameterKey) =>
  labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
function display(key: ParameterKey, unit: string) {
  if (['peak', 'ks', 'nativeKs', 'et'].includes(key)) return { scale: 3.6e6, unit: 'mm/h' };
  if (['duration', 'recovery', 'overlandTime', 'drainTime'].includes(key))
    return { scale: 1 / 60, unit: 'min' };
  if (
    [
      'porosity',
      'fieldCapacity',
      'wilting',
      'gravelVoid',
      'transitionVoid',
      'inletOpen',
      'sockOpen',
    ].includes(key)
  )
    return { scale: 100, unit: '%' };
  if (
    [
      'mediaDepth',
      'transitionDepth',
      'gravelDepth',
      'pipeDiameter',
      'drainOffset',
      'crest',
      'tailwater',
      'sediment',
      'suction',
      'sensorNoise',
      'sensorBias',
    ].includes(key)
  )
    return { scale: 1000, unit: 'mm' };
  if (key === 'drainC') return { scale: 1000, unit: 'L/(s · m^n)' };
  return { scale: 1, unit };
}
export default function ModelDetails({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const { config, frame } = usePhysics(ownerId),
    base = useSimulation((s) => s.configs[ownerId]);
  if (!base || !config) return null;
  return (
    <>
      <button onClick={() => setOpen(true)}>Model details</button>
      {open && (
        <Drawer title={'Model details · ' + ownerId} onClose={() => setOpen(false)}>
          <p>
            {config.kind === 'inlet'
              ? 'Inlet chamber model, uncalibrated.'
              : '2D soil water model (Richards equation), uncalibrated.'}{' '}
            The storm model uses your entered settings to calculate storage and flow. A compost dose
            does not set soil conductivity.
          </p>
          <p>Flow is drawn from the model's calculated discharge; it is not a fluid simulation.</p>
          {error && <p role="alert">{error}</p>}
          {Object.entries(groups).map(([group, keys]) => (
            <details key={group} className="model-group">
              <summary>{group}</summary>
              <DataTable
                id={'parameters-' + ownerId + '-' + group.toLowerCase()}
                rows={keys.map((key) => ({ key, ...base.values[key] }))}
                rowId={(p) => p.key}
                columns={[
                  {
                    key: 'name',
                    label: 'Parameter',
                    value: (p) => label(p.key),
                    render: (p) => <span title={p.key}>{label(p.key)}</span>,
                  },
                  {
                    key: 'value',
                    label: 'Entered value',
                    value: (p) => p.value * display(p.key, p.unit).scale,
                    render: (p) => {
                      const d = display(p.key, p.unit);
                      return (
                        <label className="field">
                          <span className="sr-only">{label(p.key)}</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            aria-label={label(p.key)}
                            key={p.value}
                            defaultValue={Number((p.value * d.scale).toPrecision(7))}
                            onBlur={(e) => {
                              const value = Number(e.target.value) / d.scale;
                              try {
                                const next = structuredClone(base);
                                next.values[p.key].value = value;
                                validateConfig(next);
                                if (['peak', 'duration', 'tailwater'].includes(p.key))
                                  useSimulation
                                    .getState()
                                    .weather(p.key as 'peak' | 'duration' | 'tailwater', value);
                                else useSimulation.getState().parameter(ownerId, p.key, value);
                                setError('');
                              } catch (err) {
                                setError(
                                  err instanceof Error ? err.message : 'Enter a valid value.',
                                );
                              }
                            }}
                          />
                          <small>{d.unit}</small>
                        </label>
                      );
                    },
                  },
                  {
                    key: 'effective',
                    label: 'Effective value',
                    value: (p) =>
                      formatValue(
                        config.values[p.key].value * display(p.key, p.unit).scale,
                        display(p.key, p.unit).unit,
                      ),
                  },
                  { key: 'equation', label: 'Equation', value: (p) => p.equation },
                ]}
              />
            </details>
          ))}
          <details className="model-group">
            <summary>Equations and balance</summary>
            <p>Surface storage: V = L × (b × h + z × h²).</p>
            <p>Infiltration: Q = Kₛ × (1 − clogging) × (1 + (h + suction) / media depth) × area.</p>
            <p>Drain: Q = C × max(head − offset, 0)ⁿ.</p>
            <p>Pipe capacity: Q = A × R⅔ × √slope / roughness.</p>
            <p>Overflow: Q = weir coefficient × width × head¹⋅⁵.</p>
            {frame && (
              <p>
                Time step {formatValue(frame.dt, 's')}. Water balance residual{' '}
                {frame.balanceResidual.toExponential(2)} m³.
              </p>
            )}
            <p>
              Forebay and sock share the inlet path level. Moisture shading shows equivalent wet
              depth from stored soil water. Pipe fill uses local hydraulic head.
            </p>
          </details>
          <footer>
            Parameter provenance: entered settings and trial test records. Field calibration,
            assumptions and coefficient status are documented in the model and backend handoff
            notes.
          </footer>
        </Drawer>
      )}
    </>
  );
}
