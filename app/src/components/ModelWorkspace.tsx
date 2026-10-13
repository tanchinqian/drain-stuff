import SearchableSelect from './SearchableSelect';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Config, Fault, Part, PartId, Sensor } from '../api/types';
import { legacyParts } from '../api/modelCatalog';
import { sensorMarkers } from '../api/sensorViews';
import { useSelection } from '../state';
import DrainScene, { type Assembly, type Offsets, type ViewMode } from '../three/DrainScene';
import PartPanel from './PartPanel';
import SensorPositions from './SensorPositions';
import { AssemblyControls, PartControls } from './ModelControls';
export default function ModelWorkspace({
  ownerId,
  parts: sourceParts,
  sensors,
  config,
  faults,
  kind = 'drainage',
}: {
  ownerId: string;
  parts: Part[];
  sensors: Sensor[];
  config: Config;
  faults: Fault[];
  kind?: 'drainage' | 'compost';
}) {
  const parts = useMemo(
    () =>
      sourceParts.map((p) =>
        p.installed && sensors.some((s) => p.sensorIds.includes(s.sensorId) && s.status !== 'ok')
          ? { ...p, status: 'offline' as const }
          : p,
      ),
    [sourceParts, sensors],
  );
  const [params] = useSearchParams();
  const [showSensors, setShowSensors] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const [mode, setMode] = useState<ViewMode>('Operator'),
    [assembly, setAssembly] = useState<Assembly>('exploded'),
    [explode, setExplode] = useState(65),
    [cutAxis, setCutAxis] = useState<'X' | 'Y' | 'Z'>('X'),
    [cutPosition, setCutPosition] = useState(0),
    [offsets, setOffsets] = useState<Offsets>({}),
    [move, setMove] = useState(false),
    [isolate, setIsolate] = useState(false),
    [hidden, setHidden] = useState<PartId[]>([]),
    [labels, setLabels] = useState(true),
    [wireframe, setWireframe] = useState(false),
    [edges, setEdges] = useState(true),
    [reset, setReset] = useState(0);
  useEffect(() => {
    const requested = params.get('part') ?? '';
    select(
      parts.find((p) => p.partId === (legacyParts[requested] ?? requested))?.partId ??
        parts.find((p) => p.installed && p.status !== 'ok')?.partId ??
        parts.find((p) => p.installed)!.partId,
    );
    setOffsets({});
    setHidden([]);
    setIsolate(false);
  }, [ownerId, params.get('part'), select]);
  const controlProps = {
    selected,
    mode,
    setMode,
    assembly,
    setAssembly,
    explode,
    setExplode,
    cutAxis,
    setCutAxis,
    cutPosition,
    setCutPosition,
    offsets,
    setOffsets,
    move,
    setMove,
    isolate,
    setIsolate,
    hidden,
    setHidden,
    labels,
    setLabels,
    wireframe,
    setWireframe,
    edges,
    setEdges,
    reset,
    setReset,
    showSensors,
    setShowSensors,
  };
  const part = parts.find((p) => p.partId === selected);
  if (!part) return null;
  return (
    <>
      <div className="panel-heading">
        <div className="segments">
          {(['Operator', 'Debug', 'Troubleshoot'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setShowSensors(value === 'Debug');
                setMove(false);
              }}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="small">Illustrative CAD-style assembly · synthetic readings</span>
      </div>
      <div className="field mobile-part-picker">
        <span>Model part</span>
        <SearchableSelect
          label="Model part"
          value={selected}
          onChange={(e) => select(e.target.value as PartId)}
        >
          {parts.map((p) => (
            <option key={p.partId} value={p.partId}>
              {p.name}
              {p.installed ? ' - ' + p.status : ' - Not installed'}
            </option>
          ))}
        </SearchableSelect>
      </div>
      <div className="detail-grid">
        <aside className="part-list" aria-label="Model parts">
          <input
            type="search"
            aria-label="Search model parts"
            placeholder="Search parts…"
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
          />
          {!parts.some((p) => p.name.toLowerCase().includes(partSearch.trim().toLowerCase())) && (
            <p className="small" role="status">
              No matching parts.
            </p>
          )}
          {parts
            .filter((p) => p.name.toLowerCase().includes(partSearch.trim().toLowerCase()))
            .map((p) => (
              <button
                key={p.partId}
                className={
                  p.installed && p.sensorIds.length ? 'part-status-' + p.status : undefined
                }
                title={
                  !p.installed || !p.sensorIds.length
                    ? 'Check by eye: not installed or not monitored'
                    : undefined
                }
                aria-pressed={selected === p.partId}
                onClick={() => select(p.partId)}
              >
                <span className={'status-mark ' + p.status} />
                {p.name}
                {!p.installed && <small>Not installed</small>}
              </button>
            ))}
        </aside>
        <section className="panel">
          <DrainScene
            featureId={ownerId}
            kind={kind}
            dimensions={config.schematic}
            sensors={sensors}
            showSensors={showSensors}
            parts={parts}
            mode={mode}
            assembly={assembly}
            explode={explode}
            cutAxis={cutAxis}
            cutPosition={cutPosition}
            offsets={offsets}
            onMove={(partId, position) =>
              setOffsets((previous) => ({ ...previous, [partId]: position }))
            }
            move={mode === 'Debug' && move}
            isolate={isolate}
            hidden={hidden}
            labels={labels}
            wireframe={wireframe}
            edges={edges}
            reset={reset}
          />
          <p className="small">{config.schematic.label}</p>
          {showSensors && (
            <SensorPositions
              showPositions={mode === 'Debug'}
              sensors={sensorMarkers(sensors).filter(
                (s) => mode === 'Debug' || s.partId === selected,
              )}
            />
          )}
          <div className="part-settings">
            <AssemblyControls {...controlProps} />
            <PartControls {...controlProps} />
          </div>
        </section>
        <PartPanel
          part={part}
          config={config}
          fault={faults.find(
            (f) => f.featureId === ownerId && f.partId === selected && f.status !== 'closed',
          )}
          mode={mode}
          sensors={sensors.filter((s) => part.sensorIds.includes(s.sensorId))}
        />
      </div>
    </>
  );
}
