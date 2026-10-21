import type { ModelPhysics } from '../three/PhysicsOverlay';
import FlowStrip from './FlowStrip';
import PhysicsControls from './PhysicsControls';
import PhysicsSection from './PhysicsSection';
import SearchableSelect from './SearchableSelect';
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StormResult } from '../../../shared/src/contract';
import { useSceneCuts } from '../three/sceneCuts';
import { useSearchParams } from 'react-router-dom';
import type { Config, Fault, Part, PartId, Sensor } from '../api/types';
import { legacyParts } from '../api/modelCatalog';
import { sensorMarkers } from '../api/sensorViews';
import { useSelection } from '../state';
import DrainScene, { type Assembly, type Offsets, type ViewMode } from '../three/DrainScene';
import PartPanel from './PartPanel';
import SensorPositions from './SensorPositions';
import { AssemblyControls, AssemblyModes, PartControls } from './ModelControls';
import SectionCutControls from './SectionCutControls';
import { cutRange, type CutAxis, type CameraPreset } from '../three/sceneMetrics';
import { drainDesign } from '../simulation/physics/design';
import { confirmed } from '../../../shared/src/physics/faults';
import { activeSceneFaults, faultTitle, faultWaterEffect } from '../three/faultCues';
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
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default');
  const [pulseFault,setPulseFault]=useState<string>();
  const sceneFaults=useMemo(()=>activeSceneFaults(faults,ownerId),[faults,ownerId]);
  const initialCut = useMemo(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem('drain-cut-' + ownerId) ?? 'null');
      return v && ['X', 'Y', 'Z'].includes(v.axis) && Number.isFinite(v.position)
        ? v
        : { axis: 'X', position: 0 };
    } catch {
      return { axis: 'X', position: 0 };
    }
  }, [ownerId]);
  const [cutActive, setCutActive] = useState(false),
    [sampleDepth, setSampleDepth] = useState<number>(),
    [sampleAcross, setSampleAcross] = useState<number>();
  const [recordQuality, setRecordQuality] = useState(false);
  const [quality, setQuality] = useState('High');
  const [lowQuality, setLowQuality] = useState(false);

  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const replay = queryClient.getQueryData<{ result?: StormResult }>([
    'storm-job',
    params.get('stormRunId'),
  ]);
  const savedFaults = replay?.result?.rows.find((row) => row.asset === ownerId)?.faultIds;
  const [showSensors, setShowSensors] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const [mode, setMode] = useState<ViewMode>('Operator'),
    [assembly, setAssembly] = useState<Assembly>(physics ? 'section' : 'exploded'),
    [explode, setExplode] = useState(65),
    [cutAxis, setCutAxis] = useState<CutAxis>(initialCut.axis),
    [cutPosition, setCutPosition] = useState(initialCut.position as number),
    [offsets, setOffsets] = useState<Offsets>({}),
    [move, setMove] = useState(false),
    [isolate, setIsolate] = useState(false),
    [hidden, setHidden] = useState<PartId[]>([]),
    [labels, setLabels] = useState(true),
    [wireframe, setWireframe] = useState(false),
    [edges, setEdges] = useState(!physics),
    [reset, setReset] = useState(0);
  useLayoutEffect(() => {
    if (!physics) return;
    useSceneCuts.getState().remember(ownerId, cutAxis, cutPosition);
    try {
      sessionStorage.setItem(
        'drain-cut-' + ownerId,
        JSON.stringify({ axis: cutAxis, position: cutPosition }),
      );
    } catch {
      /* Session memory remains usable when storage is unavailable. */
    }
  }, [ownerId, cutAxis, cutPosition, !!physics]);
  const changeCut = (value: number) => {
    setCutPosition(value);
    const range = physics ? cutRange(drainDesign(physics.config), cutAxis, physics.config.kind === 'inlet') : [-Infinity, Infinity];
    setAssembly(value <= range[0] || value >= range[1] ? 'assembled' : 'section');
  };
  const changeAxis = (axis: CutAxis) => {
    setCutAxis(axis);
    if (physics) {
      const [min, max] = cutRange(
        drainDesign(physics.config),
        axis,
        physics.config.kind === 'inlet',
      );
      setCutPosition(axis === 'Z' ? (min + max) / 2 : 0);
    }
    setAssembly('section');
  };
  useEffect(() => {
    const requested = params.get('part') ?? '';
    select(
      parts.find((p) => p.partId === (legacyParts[requested] ?? requested))?.partId ??
        parts.find((p) => p.installed && p.status !== 'ok')?.partId ??
        parts.find((p) => p.installed)!.partId,
    );
    setInspectionActive(kind === 'compost' || !!params.get('part'));
    if(params.get('showFault')==='1') setCameraPreset('fault');
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
  const selectedFault=sceneFaults.find(f=>f.partId===selected);
  const showFault=(fault:Fault)=>{select(fault.partId);setInspectionActive(true);setCameraPreset('fault');setHidden([]);setIsolate(false);};
  if (!part) return null;
  return (
    <div
      id="feature-parts"
      className={'model-workspace ' + (kind === 'compost' ? 'compost-model' : '')}
    >
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
              No matching parts; clear the search to show the assembly.
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
        <section className="panel model-card" id="feature-replay">
          <div className="model-mode">
            {physics && mode === 'Debug' && (
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

          <AssemblyModes {...controlProps} />
          {physics && <p className="small">Typical design, not surveyed</p>}
          {physics && (
            <div className="camera-presets">
              <SearchableSelect
                label="Camera preset"
                value={cameraPreset === 'default' || cameraPreset === 'fault' ? 'drain' : cameraPreset}
                onChange={(e) => {
                  const value = e.target.value as CameraPreset;
                  setCameraPreset(value);
                  setCutAxis(value === 'inlet' ? 'Y' : 'X');
                  setCutPosition(
                    value === 'inlet' ? -physics.config.values.length.value / 2 + 0.25 : 0,
                  );
                }}
              >
                {[
                  ['overview', 'Overview'],
                  ['drain', 'Drain'],
                  ['inlet', 'Inlet'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SearchableSelect>
              <button
                onClick={() => {
                  setCameraPreset('default');
                  setReset((v) => v + 1);
                }}
              >
                Return to default
              </button>
              {!!sceneFaults.length && <button onClick={()=>showFault(selectedFault??sceneFaults[0])}>Show fault</button>}
            </div>
          )}
          {physics && flat ? (
            <PhysicsSection
              {...physics}
              cutAxis={cutAxis}
              cutPosition={cutPosition}
              onSampleDepth={setSampleDepth}
              onSampleAcross={setSampleAcross}
            />
          ) : (
            <DrainScene
              physics={physics}
              sceneFaults={params.get('mode')==='cleared' ? [] : sceneFaults}
              onShowFault={showFault}
              pulseFault={pulseFault}
              cameraPreset={cameraPreset}
              recordQuality={recordQuality}
              cutActive={cutActive}
              onCutChange={changeCut}
              onSectionSample={(depth, across) => {
                setSampleDepth(depth);
                setSampleAcross(across);
              }}
              physicalFaults={
                params.get('mode') === 'cleared'
                  ? []
                  : faults
                      .filter(
                        (f) =>
                          f.featureId === ownerId &&
                          !f.id.startsWith('SIM-') &&
                          !['sensor_suspect', 'sensor_offline'].includes(f.type) &&
                          (savedFaults ? savedFaults.includes(f.id) : confirmed(f)),
                      )
                      .map((f) => f.partId)
              }
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
              sensors={sensors.filter((s) => kind === 'compost' || !!s.deviceId)}
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
          {physics && !!sceneFaults.length && params.get('mode')!=='cleared' && <div className="scene-faults">
            <ol aria-label="Faults in this scene">{sceneFaults.map((f,i)=><li key={f.id}>
              <button onMouseEnter={()=>setPulseFault(f.id)} onMouseLeave={()=>setPulseFault(undefined)} onFocus={()=>setPulseFault(f.id)} onBlur={()=>setPulseFault(undefined)} onClick={()=>showFault(f)}>{i+1} · {faultTitle(f)}</button>
            </li>)}</ol>
            {inspectionActive && selectedFault && <section className="scene-fault-detail" aria-label="Selected fault explanation">
              <strong>{faultTitle(selectedFault)}</strong>
              <p>{selectedFault.diagnosingInput}</p>
              <p className="small">Input: {selectedFault.sensorIds.join(', ')||'Human inspection'} · Rule: {selectedFault.ruleId}</p>
              <p>{faultWaterEffect(selectedFault)}</p>
              <a href={'/faults?fault='+selectedFault.id}>Open work order {selectedFault.id}</a>
            </section>}
          </div>}
          {physics && (
            <SectionCutControls
              physics={physics}
              axis={cutAxis}
              position={cutPosition}
              onAxis={changeAxis}
              onChange={changeCut}
              onReset={() => { setCutPosition(0); setAssembly('assembled'); }}
              onActive={setCutActive}
              sampleDepth={sampleDepth}
              sampleAcross={sampleAcross}
            />
          )}
          <p className="small">
            {physics
              ? "Water motion is drawn from the model's calculated flows. It is not a fluid simulation of the real site. RL is the local level datum."
              : 'Select a part to inspect its readings and checks.'}
          </p>
          {physics && (
            <>
              <div className="physics-view-controls">
                {mode === 'Debug' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={lowQuality}
                      onChange={(e) => setLowQuality(e.target.checked)}
                    />{' '}
                    Low quality
                  </label>
                )}
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
              sensors={sensorMarkers(
                sensors.filter((s) => kind === 'compost' || !!s.deviceId),
              ).filter((s) => mode === 'Debug' || s.partId === selected)}
            />
          )}
          {summary}
          <div className="part-settings">
            <details className="view-controls" open={mode === 'Debug'}>
              <summary>View controls</summary>
              {physics && (
                <SearchableSelect
                  label="Render quality"
                  value={recordQuality ? 'record' : 'adaptive'}
                  onChange={(e) => setRecordQuality(e.target.value === 'record')}
                >
                  <option value="adaptive">Adaptive</option>
                  <option value="record">Record</option>
                </SearchableSelect>
              )}
              <AssemblyControls {...controlProps} sectionControls={!physics} />
              <PartControls {...controlProps} />
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
          diagnosisFault={faults.find(
            (f) =>
              f.featureId === ownerId &&
              f.partId === selected &&
              f.status !== 'closed' &&
              !f.id.startsWith('SIM-'),
          )}
          model={
            physics?.frame
              ? {
                  second: physics.frame.second,
                  rainfallMmHr: physics.frame.rain * 3.6e6,
                  pondingMm: physics.frame.ponding * 1000,
                  infiltrationLMin: physics.frame.flux.infiltration * 60000,
                  outletLMin: physics.frame.flux.outfall * 60000,
                  overflowLMin: physics.frame.flux.overflow * 60000,
                  moisture: physics.frame.moisture,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
