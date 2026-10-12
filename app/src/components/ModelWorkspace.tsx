import { useEffect, useState } from 'react';
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
  parts,
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
  const [params] = useSearchParams();
  const [showSensors, setShowSensors] = useState(true);
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const [mode, setMode] = useState<ViewMode>('Operator'),
    [assembly, setAssembly] = useState<Assembly>('exploded'),
    [explode, setExplode] = useState(65),
    [cutAxis, setCutAxis] = useState<'X' | 'Z'>('X'),
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
            <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
              {value}
            </button>
          ))}
        </div>
        <span className="small">Illustrative CAD-style assembly Â· synthetic readings</span>
      </div>
      <label className="field mobile-part-picker">
        Model part
        <select value={selected} onChange={(e) => select(e.target.value as PartId)}>
          {parts.map((p) => (
            <option key={p.partId} value={p.partId}>
              {p.name}
              {p.installed ? ' - ' + p.status : ' - Not installed'}
            </option>
          ))}
        </select>
      </label>
      <div className="detail-grid">
        <aside className="part-list" aria-label="Model parts">
          {parts.map((p) => (
            <button
              key={p.partId}
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
            move={move}
            isolate={isolate}
            hidden={hidden}
            labels={labels}
            wireframe={wireframe}
            edges={edges}
            reset={reset}
          />
          <p className="small">{config.schematic.label}</p>
          {showSensors && <SensorPositions sensors={sensorMarkers(sensors)} />}
          <div className="part-settings">
            <AssemblyControls {...controlProps} />
            <PartControls {...controlProps} />
          </div>
        </section>
        <PartPanel
          part={part}
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
