import type { ModelPhysics } from '../three/PhysicsOverlay';
import FlowStrip from './FlowStrip';
import PhysicsControls from './PhysicsControls';
import PhysicsSection from './PhysicsSection';
import SearchableSelect from './SearchableSelect';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Config, Fault, Part, PartId, Sensor } from '../api/types';
import { legacyParts } from '../api/modelCatalog';
import { sensorMarkers } from '../api/sensorViews';
import { useSelection } from '../state';
import DrainScene, { type Assembly, type Offsets, type ViewMode } from '../three/DrainScene';
import PartPanel from './PartPanel';
import SensorPositions from './SensorPositions';
import { AssemblyControls, AssemblyModes, PartControls } from './ModelControls';
export default function ModelWorkspace({
  ownerId,
  parts: sourceParts,
  sensors,
  config,
  faults,
  kind = 'drainage',
  physics,
  summary,
}: {
  physics?: ModelPhysics;
  summary?: ReactNode;
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
  const [flat, setFlat] = useState(false),
    [dimensionsVisible, setDimensionsVisible] = useState(false);
  const [inspectionActive, setInspectionActive] = useState(kind === 'compost');
  const [cameraPreset,setCameraPreset]=useState<'overview'|'inlet'>('overview');
  const [quality, setQuality] = useState('High');
  const [lowQuality, setLowQuality] = useState(false);

  const [params] = useSearchParams();
  const [showSensors, setShowSensors] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const [mode, setMode] = useState<ViewMode>('Operator'),
    [assembly, setAssembly] = useState<Assembly>(physics ? 'section' : 'exploded'),
    [explode, setExplode] = useState(65),
    [cutAxis, setCutAxis] = useState<'X' | 'Y' | 'Z'>(physics ? 'Z' : 'X'),
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
    setInspectionActive(kind === 'compost'||!!params.get('part'));
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
    <div className={'model-workspace ' + (kind === 'compost' ? 'compost-model' : '')}>
      <div className="field mobile-part-picker">
        <span>Model part</span>
        <SearchableSelect
          label="Model part"
          value={selected}
          onChange={(e) => {
            select(e.target.value as PartId);
            setInspectionActive(true);
          }}
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
                onClick={() => {
                  select(p.partId);
                  setInspectionActive(true);
                }}
              >
                <span className={'status-mark ' + p.status} />
                {p.name}
                {!p.installed && <small>Not installed</small>}
              </button>
            ))}
        </aside>
        <section className="panel model-card">
          <div className="model-mode">
            {physics && mode==='Debug' && (
              <output className="quality-status">{lowQuality ? 'Low' : quality} quality</output>
            )}
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
          </div>

          <AssemblyModes {...controlProps}/>
          {ownerId==='R1' && <div className="actions camera-presets"><button aria-pressed={cameraPreset==='overview'} onClick={()=>{setCameraPreset('overview');setReset(v=>v+1);}}>Fit channel</button><button aria-pressed={cameraPreset==='inlet'} onClick={()=>{setCameraPreset('inlet');setReset(v=>v+1);}}>Inspect inlet close-up</button></div>}
          {physics && flat ? (
            <PhysicsSection {...physics} />
          ) : (
            <DrainScene
              physics={physics}
              cameraPreset={cameraPreset}
              inspectionActive={inspectionActive}
              onInspect={(id) => {
                setInspectionActive(!!id);
                if (id) select(id);
              }}
              onPerformance={(_, value) => setQuality(value)}
              lowQuality={lowQuality}
              dimensionsVisible={dimensionsVisible}
              featureId={ownerId}
              kind={kind}
              dimensions={config.schematic}
                sensors={sensors.filter(s=>kind==='compost'||!!s.deviceId)}
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
          )}
          <p className="small">
            {physics
              ? 'Water level follows the storm model. RL is the local level datum.'
              : 'Select a part to inspect its readings and checks.'}
          </p>
          {physics && (
            <>
              <div className="physics-view-controls">
                {mode==='Debug' && <label>
                  <input
                    type="checkbox"
                    checked={lowQuality}
                    onChange={(e) => setLowQuality(e.target.checked)}
                  />{' '}
                  Low quality
                </label>}
                <label>
                  <input
                    type="checkbox"
                    checked={flat}
                    onChange={(e) => setFlat(e.target.checked)}
                  />{' '}
                  2D section
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={dimensionsVisible}
                    onChange={(e) => setDimensionsVisible(e.target.checked)}
                  />{' '}
                  Dimensions
                </label>
              </div>
              <PhysicsControls ownerId={ownerId} />
              <FlowStrip ownerId={ownerId} compact={!inspectionActive} />
            </>
          )}
          {showSensors && (
            <SensorPositions
              showPositions={mode === 'Debug'}
              sensors={sensorMarkers(sensors.filter(s=>kind==='compost'||!!s.deviceId)).filter(
                (s) => mode === 'Debug' || s.partId === selected,
              )}
            />
          )}
          {summary}
          <div className="part-settings">
            <details className="view-controls" open={mode==='Debug'}><summary>View controls</summary>
              <AssemblyControls {...controlProps}/><PartControls {...controlProps}/>
            </details>
          </div>
        </section>
        <PartPanel
          ownerId={ownerId}
          part={part}
          config={config}
          fault={faults.find(
            (f) => f.featureId === ownerId && f.partId === selected && f.status !== 'closed',
          )}
          mode={mode}
          sensors={sensors.filter((s) => part.sensorIds.includes(s.sensorId))}
          diagnosisFault={faults.find((f) => f.featureId === ownerId && f.partId === selected &&
            f.status !== 'closed' && !f.id.startsWith('SIM-'))}
          model={physics?.frame ? {
            second: physics.frame.second,
            rainfallMmHr: physics.frame.rain * 3.6e6,
            pondingMm: physics.frame.ponding * 1000,
            infiltrationLMin: physics.frame.flux.infiltration * 60000,
            outletLMin: physics.frame.flux.outfall * 60000,
            overflowLMin: physics.frame.flux.overflow * 60000,
            moisture: physics.frame.moisture,
          } : undefined}
        />
      </div>
    </div>
  );
}
