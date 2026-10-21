import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { DragControls, OrbitControls, Edges } from '@react-three/drei';
import {
  Box3,
  Line,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector3,
  InstancedMesh,
  PCFSoftShadowMap,
  Color,
} from 'three';
import type { Config, Fault, Part, PartId, Sensor } from '../api/types';
import FaultCallouts from './FaultCallouts';
import { faultConfirmed } from './faultCues';
import { createDrainParts, palette } from './geometry';
import { useSelection } from '../state';
import { createPhysicsGeometry } from './physicsGeometry';
import { PhysicsWater, DimensionLines, type ModelPhysics } from './PhysicsOverlay';
import PhysicsSection from '../components/PhysicsSection';
import FitCamera from './FitCamera';
import PartHighlight from './PartHighlight';
import SensorMarkers from './SensorMarkers';
import { createCompostParts } from './compostGeometry';
import { sensorMarkers } from '../api/sensorViews';
import SectionCaps from './SectionCaps';
import { moistureTexture, wetMaterial } from './soilMaterial';
import { StormRain, rainCount, useReducedMotion } from './WaterEffects';
import { drainDesign } from '../simulation/physics/design';
import CatchmentContext from './CatchmentContext';
import SceneLabels, { type SceneLabel } from './SceneLabels';
import FaultDeposits from './FaultDeposits';
import StormAtmosphere from './StormAtmosphere';
import CutPlane from './CutPlane';
import { cutNormal, cutSample, type CameraPreset } from './sceneMetrics';
export type Assembly = 'exploded' | 'assembled' | 'section';
export type ViewMode = 'Operator' | 'Debug' | 'Troubleshoot';
export type Offsets = Partial<Record<PartId, [number, number, number]>>;
export interface Props {
  roofPath?:boolean;
  sceneFaults?: Fault[];
  onShowFault?: (fault: Fault) => void;
  pulseFault?: string;
  lowQuality?: boolean;
  cameraPreset?: CameraPreset;
  recordQuality?: boolean;
  cutActive?: boolean;
  onCutChange?: (value: number) => void;
  physicalFaults?: PartId[];
  onSectionSample?: (depth: number, across: number) => void;
  inspectionActive?: boolean;
  onInspect?: (id?: PartId) => void;
  onPerformance?: (fps: number, quality: string) => void;
  physics?: ModelPhysics;
  dimensionsVisible?: boolean;
  kind?: 'drainage' | 'compost';
  dimensions: Config['schematic'];
  sensors: Sensor[];
  showSensors: boolean;
  featureId: string;
  parts: Part[];
  mode: ViewMode;
  assembly: Assembly;
  explode: number;
  cutAxis: 'X' | 'Y' | 'Z';
  cutPosition: number;
  offsets: Offsets;
  onMove: (id: PartId, position: [number, number, number]) => void;
  move: boolean;
  isolate: boolean;
  hidden: PartId[];
  labels: boolean;
  wireframe: boolean;
  edges: boolean;
  reset: number;
}
export const shifts = (id: PartId, e: number): [number, number, number] => {
  const offsets: Record<PartId, [number, number, number]> = {
    planting: [0, 4.5, 0],
    mulch: [0, 3.5, 0],
    ponding: [0, 5.1, 0],
    media: [0, 2.4, 0],
    transition: [0, 1.5, 0],
    drainage: [0, 0.7, 0],
    underdrain: [0, 0.2, 1.2],
    liner: [-0.6, -0.3, 0],
    inlet: [-0.8, 0, 0],
    pretreat: [-0.2, 0.4, -1.2],
    energy: [-0.6, 0.2, -1.6],
    sock: [-0.3, 1.1, 1.6],
    checkdam: [0, 1.6, -1.7],
    cleanout: [0, 0.7, 0.8],
    overflow: [0.6, 0.8, -0.5],
    outfall: [1.2, 0, 0],
    intake: [-0.5, 0.5, 0],
    bay: [0, 0.6, 0],
    bulking: [-0.5, 0.3, 1.1],
    cover: [0, 2.1, 0],
    base: [0, -0.35, 0],
    sump: [0.5, 0.6, 0.5],
    curing: [0.9, 0.5, 0],
    weather: [1, 1, 0],
  };
  return offsets[id].map((v) => v * e) as [number, number, number];
};
function Model(props: Props) {
  const [hovered, setHovered] = useState<PartId>();
  const [draggingCut, setDraggingCut] = useState(false);
  const design = props.physics ? drainDesign(props.physics.config) : undefined;
  const invalidate = useThree((s) => s.invalidate);
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const groups = useMemo(
    () =>
      props.kind === 'compost'
        ? createCompostParts()
        : props.physics
          ? createPhysicsGeometry(props.physics.config)
          : createDrainParts(props.featureId, props.dimensions),
    [props.featureId, props.kind, props.dimensions, props.physics?.config],
  );
  useEffect(
    () => () => {
      const geometries = new Set<import('three').BufferGeometry>();
      const materials = new Set<Material>();
      Object.values(groups).forEach((group) =>
        group?.traverse((object) => {
          if (object instanceof Mesh || object instanceof Line) {
            geometries.add(object.geometry);
            (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
              materials.add(m),
            );
          }
        }),
      );
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        if (m instanceof MeshStandardMaterial) {
          m.map?.dispose();
          m.normalMap?.dispose();
        }
        m.dispose();
      });
    },
    [groups],
  );
  const normal: [number, number, number] = props.physics
    ? cutNormal(props.cutAxis)
    : [
        props.cutAxis === 'X' ? -1 : 0,
        props.cutAxis === 'Y' ? -1 : 0,
        props.cutAxis === 'Z' ? -1 : 0,
      ];
  const plane = useMemo(
      () => new Plane(new Vector3(...normal), props.cutPosition),
      [props.cutAxis, !!props.physics],
    ),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  plane.constant = props.cutPosition;
  const windTime = useRef(0);
  const reduced = useReducedMotion();
  useFrame((_, delta) => {
    if (!reduced) windTime.current += Math.min(0.1, delta);
    groups.planting?.traverse((o) => {
      if (
        o instanceof Mesh &&
        o.material instanceof MeshStandardMaterial &&
        o.material.userData.wind
      )
        o.material.userData.wind.value = windTime.current;
    });
  });
  const e = props.assembly === 'exploded' ? props.explode / 100 : 0;
  const field = props.physics?.frame?.soil;
  const texture = useMemo(() => {
    if (!field) return;
    const texture = moistureTexture(field);
    texture.userData.amendmentDepth = props.physics?.amendment?.depth ?? 0;
    return texture;
  }, [field, props.physics?.amendment?.depth]);
  useEffect(() => {
    if (!texture || !field) return;
    for (const id of ['media', 'mulch', 'transition', 'drainage'] as const)
      groups[id]?.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial)
          wetMaterial(o.material, texture, field.width, field.depth);
      });
    invalidate();
    return () => texture.dispose();
  }, [field, texture, groups, invalidate]);
  useEffect(() => {
    const clog = props.physics?.frame?.cell.clog ?? 0;
    groups.sock?.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.userData.dryColor ??= o.material.color.clone();
        o.material.color.copy(o.material.userData.dryColor).multiplyScalar(1 - 0.5 * clog);
      }
    });
  }, [props.physics?.frame?.cell.clog, groups]);
  useEffect(() => {
    groups.planting?.traverse((o) => {
      if (o instanceof InstancedMesh && o.name === 'tropical-groundcover')
        o.count = props.physicalFaults?.includes('planting') ? 145 : 580;
    });
  }, [groups, props.physicalFaults?.includes('planting')]);
  useLayoutEffect(() => {
    plane.normal.set(...normal);
    plane.constant = props.cutPosition;
    props.parts.forEach((part) => {
      groups[part.partId]?.traverse((object) => {
        if (object.userData.sectionFace)
          object.visible =
            props.assembly === 'section' &&
            (props.physics ? props.cutAxis === 'X' : props.cutAxis === 'Z') &&
            props.cutPosition === 0;
        if (!(object instanceof Mesh) && !(object instanceof Line)) return;
        const materials: Material[] = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          material.clippingPlanes = props.assembly === 'section' ? [plane] : [];
          const dim = !part.installed || (props.mode === 'Troubleshoot' && part.status === 'ok');
          const baseOpacity = Number(material.userData.baseOpacity ?? 1);
          material.opacity = dim ? baseOpacity * (!part.installed ? 0.25 : 0.4) : baseOpacity;
          material.transparent = dim || baseOpacity < 1 || object instanceof Line;
          material.depthWrite = !dim && baseOpacity === 1;
          if (material instanceof MeshStandardMaterial)
            material.wireframe = !part.installed || (props.mode === 'Debug' && props.wireframe);
          if (props.physics && material instanceof MeshStandardMaterial) {
            material.userData.unflaggedColour ??= material.color.clone();
            material.color.copy(material.userData.unflaggedColour);
            const finding=props.sceneFaults?.find(f=>f.partId===part.partId);
            if(finding) material.color.lerp(new Color(faultConfirmed(finding)?'#a94d39':'#c49a45'),.34);
            material.userData.faultTint=!!finding;
          }
          material.needsUpdate = true;
        });
        if (object instanceof Line) object.visible = props.edges || props.mode === 'Debug';
      });
    });
    invalidate();
  }, [
    invalidate,
    groups,
    plane,
    props.assembly,
    props.cutAxis,
    props.cutPosition,
    props.mode,
    props.wireframe,
    props.edges,
    props.parts,
    props.sceneFaults,
  ]);
  const fitBounds = useMemo(() => {
    if (!design) return undefined;
    if (props.cameraPreset === 'fault' && groups[selected])
      return (groups[selected]!.userData.localBounds as Box3).clone().expandByScalar(.7);
    if (props.cameraPreset === 'inlet')
      return new Box3().setFromCenterAndSize(
        new Vector3(-design.length / 2, props.physics!.config.values.crest.value / 2, 0),
        new Vector3(2, 1.4, 1.8),
      );
    if (props.cameraPreset === 'overview')
      return new Box3(
        new Vector3(
          -design.length / 2 - design.catchment.roadWidth - 1,
          design.bottomY,
          -design.topWidth / 2 - 2,
        ),
        new Vector3(
          design.length / 2 + 2,
          design.catchment.roofArea > 0 ? 5.3 : 2,
          design.topWidth / 2 + 2,
        ),
      );
    if (props.featureId !== 'R1') return undefined;
    const bounds = new Box3();
    Object.values(groups).forEach((g) => {
      if (g?.userData.localBounds) bounds.union(g.userData.localBounds);
    });
    return bounds;
  }, [groups, props.featureId, props.cameraPreset, selected]);
  const fitTarget = fitBounds?.getCenter(new Vector3());
  const annotations: SceneLabel[] = [];
  const f = props.physics?.frame;
  const cutReading = props.physics
    ? cutSample(props.physics.config, f, props.cutAxis, props.cutPosition)
    : undefined;
  const stageFlow: Partial<Record<PartId, number>> = {
    inlet: f?.flux.inlet,
    pretreat: f?.flux.inlet,
    sock: f?.flux.inlet,
    ponding: f?.flux.inlet,
    media: f?.flux.infiltration,
    underdrain: f?.flux.drain,
    outfall: f?.flux.outfall,
    overflow: f?.flux.overflow,
  };
  const addPartLabel = (id: PartId, prefix = '') => {
    const part = props.parts.find((p) => p.partId === id),
      geometry = groups[id];
    if (!part || !geometry || props.hidden.includes(id) || annotations.some((a) => a.id === id))
      return;
    const b = geometry.userData.localBounds as Box3,
      anchor = b.getCenter(new Vector3());
    const shift = shifts(id, e),
      offset = props.offsets[id] ?? [0, 0, 0];
    anchor.add(new Vector3(...shift)).add(new Vector3(...offset));
    let text = prefix + part.name;
    const q = stageFlow[id];
    if (q !== undefined) {
      const stage = {
        inlet: 'Inlet',
        pretreat: 'Chamber',
        sock: 'Screen',
        ponding: 'Chamber',
        media: 'Media',
        underdrain: 'Underdrain',
        outfall: 'Outfall',
        overflow: 'Overflow',
      };
      text = stage[id as keyof typeof stage] + ' · ' + (q * 60000).toFixed(1) + ' L/min';
    }
    annotations.push({ id, text, anchor: [anchor.x, anchor.y, anchor.z] });
  };
  if (props.labels) {
    if (props.inspectionActive) addPartLabel(selected);
    if (hovered) addPartLabel(hovered);
    if (props.mode === 'Troubleshoot')
      (['inlet', 'media', 'underdrain', 'outfall', 'overflow'] as PartId[]).forEach((id) =>
        addPartLabel(id),
      );
    if (design && field && cutReading && cutReading.front !== null && props.assembly === 'section')
      annotations.push({
        id: 'wetting-front',
        text: `Wetting front ${(cutReading.front * 1000).toFixed(0)} mm`,
        anchor: [
          props.cutAxis === 'Y' ? props.cutPosition : 0,
          -design.mulchDepth - cutReading.front,
          props.cutAxis === 'X' ? props.cutPosition : 0,
        ],
      });
    if (props.physics && props.dimensionsVisible && design) {
      annotations.push({
        id: 'datum',
        text: 'RL 0.00 m · local datum',
        anchor: [-design.length / 2, 0, 0],
      });
      annotations.push({
        id: 'length',
        text: `${design.length.toFixed(2)} m · length`,
        anchor: [0, design.bottomY - 0.2, design.bedWidth / 2 + 0.3],
      });
      annotations.push({
        id: 'depth',
        text: `${(-design.bottomY).toFixed(2)} m · depth`,
        anchor: [design.length / 2 + 0.3, design.bottomY / 2, -design.bedWidth / 2],
      });
    }
    props.parts
      .filter((p) => p.installed && p.sensorIds.length && p.status !== 'ok')
      .forEach((p, i) =>
        addPartLabel(p.partId, `${i + 1} ${p.status === 'fault' ? 'Fault' : 'Watch'} · `),
      );
  }
  if (
    props.physics?.config.kind === 'inlet' &&
    props.physics.config.values.sediment.value > 0 &&
    !annotations.some((a) => a.id === 'sediment')
  )
    annotations.push({
      id: 'sediment',
      text: `Sediment ${(props.physics.config.values.sediment.value * 1000).toFixed(0)} mm · entered level`,
      anchor: [0, props.physics.config.values.sediment.value, 0],
    });
  return (
    <>
      <FitCamera
        transition
        bounds={fitBounds}
        direction={fitBounds ? [-9, 9, 12] : undefined}
        width={
          props.physics
            ? Math.max(
                props.physics.config.kind === 'inlet' ? 4 : 7,
                props.physics.config.values.length.value +
                  (props.assembly === 'exploded' ? 7 : design!.catchment.roadWidth + 2.5),
              )
            : props.kind === 'compost'
              ? 11.6
              : 13.5
        }
        height={
          props.physics && props.assembly !== 'exploded'
            ? props.physics.config.kind === 'inlet'
              ? 2.7
              : 4.7
            : props.kind === 'compost'
              ? 8
              : 9.6
        }
        controlsRef={controls}
        enabled={!props.move && !draggingCut}
        target={
          fitTarget
            ? [fitTarget.x, fitTarget.y, fitTarget.z]
            : props.physics && props.assembly !== 'exploded'
              ? [-0.4, -0.1, -0.4]
              : [1.2, 1.2, 0]
        }
      />
      {props.physics ? (
        <StormAtmosphere
          physics={props.physics}
          low={!!props.lowQuality}
          record={props.recordQuality}
        />
      ) : (
        <>
          <color attach="background" args={['#E2DCCB']} />
          <ambientLight intensity={1.35} />
          <directionalLight position={[-6, 13, 8]} intensity={1.65} />
        </>
      )}
      {props.physics ? (
        <CatchmentContext
          roofPath={props.roofPath}
          physics={props.physics}
          low={!!props.lowQuality}
        />
      ) : (
        <mesh position={[1.2, -1.12, 0]}>
          <boxGeometry args={[10.35, 0.05, 4.55]} />
          <meshStandardMaterial color={palette.ground} />
          <Edges color={palette.ink3} />
        </mesh>
      )}
      <SceneLabels labels={props.sceneFaults?.length ? [] : annotations} />
      {!!props.sceneFaults?.length && props.onShowFault && <FaultCallouts
        items={props.sceneFaults.flatMap(fault=>{
          const g=groups[fault.partId];if(!g)return [];
          const b=g.userData.localBounds as Box3, p=b.getCenter(new Vector3());p.y=b.max.y;
          return [{fault,anchor:[p.x,p.y,p.z] as [number,number,number]}];
        })} onSelect={props.onShowFault} pulse={props.pulseFault} />}
      {design && props.assembly === 'section' && props.onCutChange && (
        <CutPlane
          design={design}
          axis={props.cutAxis}
          plane={plane}
          inlet={props.physics?.config.kind === 'inlet'}
          visible={!!props.cutActive}
          onChange={props.onCutChange}
          onDrag={setDraggingCut}
        />
      )}
      {props.physics && props.dimensionsVisible && props.assembly !== 'exploded' && (
        <DimensionLines config={props.physics.config} />
      )}
      {props.physics && <StormRain physics={props.physics} low={props.lowQuality} record={props.recordQuality} />}
      <group name="drain-parts">
        {props.parts.map((part, partIndex) => {
          const id = part.partId,
            base = shifts(id, e),
            offset = props.offsets[id] || [0, 0, 0],
            position = base.map((v, i) => v + offset[i]) as [number, number, number];
          const geometry = groups[id];
          if (!geometry) return null;
          geometry.name = id;
          geometry.userData.physicalPart = true;
          const visible = !props.hidden.includes(id) && (!props.isolate || selected === id);
          const content = (
            <group
              visible={visible}
              onPointerMove={(event) => {
                if (props.physics && props.assembly === 'section')
                  props.onSectionSample?.(
                    -(event.point.y - position[1]) - design!.mulchDepth,
                    event.point.z - position[2],
                  );
              }}
            >
              <primitive
                object={geometry}
                onPointerOver={() => setHovered(id)}
                onPointerOut={() => setHovered(undefined)}
                onClick={(event: { stopPropagation: () => void }) => {
                  event.stopPropagation();
                  select(id);
                  props.onInspect?.(id);
                }}
              />
              {props.assembly === 'section' &&
                part.installed &&
                ['media', 'transition', 'drainage', 'mulch', 'liner', 'inlet'].includes(id) && (
                  <SectionCaps
                    key={props.cutAxis}
                    group={geometry}
                    plane={plane}
                    physics={props.physics}
                    orderBase={10 + partIndex * 100}
                  />
                )}
              {props.physics && part.installed && (
                <>
                  <FaultDeposits
                    id={id}
                    physics={props.physics}
                    plane={props.assembly === 'section' ? plane : undefined}
                    confirmed={!!props.physicalFaults?.includes(id)}
                    finding={props.sceneFaults?.find(f=>f.partId===id)}
                  />
                  <PhysicsWater
                    id={id}
                    physics={props.physics}
                    plane={props.assembly === 'section' ? plane : undefined}
                    low={props.lowQuality}
                  />
                </>
              )}
              {props.showSensors &&
                part.installed &&
                (props.mode === 'Debug' || selected === id) && (
                  <SensorMarkers
                    sensors={sensorMarkers(props.sensors).filter((s) => s.partId === id)}
                  />
                )}
              {part.installed &&
                part.sensorIds.length > 0 &&
                part.status !== 'ok' &&
                (props.sceneFaults?.some(f=>f.partId===id) || props.mode === 'Troubleshoot' || (props.inspectionActive && selected === id)) && (
                  <PartHighlight
                    natural={!!props.physics}
                    group={geometry}
                    status={part.status}
                    plane={props.assembly === 'section' ? plane : undefined}
                  />
                )}
              {props.inspectionActive &&
                selected === id &&
                part.status === 'ok' &&
                (props.physics ? (
                  <PartHighlight
                    natural
                    group={geometry}
                    status="ok"
                    plane={props.assembly === 'section' ? plane : undefined}
                  />
                ) : (
                  <SelectedBounds
                    group={geometry}
                    plane={props.assembly === 'section' ? plane : undefined}
                  />
                ))}
            </group>
          );
          return props.move ? (
            <DragControls
              key={id}
              matrix={new Matrix4().makeTranslation(...position)}
              autoTransform={false}
              onDragStart={() => select(id)}
              onDrag={(matrix) => {
                const p = new Vector3().setFromMatrixPosition(matrix);
                props.onMove(id, [p.x - base[0], p.y - base[1], p.z - base[2]]);
              }}
              onDragEnd={() => {
                if (controls.current) controls.current.enabled = !props.move;
              }}
            >
              {content}
            </DragControls>
          ) : (
            <group key={id} position={position}>
              {content}
            </group>
          );
        })}
      </group>
    </>
  );
}
function SelectedBounds({
  group,
  plane,
}: {
  group: NonNullable<ReturnType<typeof createDrainParts>[PartId]>;
  plane?: Plane;
}) {
  const box = useMemo(() => group.userData.localBounds as Box3, [group]),
    size = box.getSize(new Vector3()),
    centre = box.getCenter(new Vector3());
  return (
    <mesh position={centre}>
      <boxGeometry args={[size.x + 0.04, size.y + 0.04, size.z + 0.04]} />
      <meshBasicMaterial visible={false} />
      <Edges color={palette.ink} clippingPlanes={plane ? [plane] : []} />
    </mesh>
  );
}
export default function DrainScene(props: Props) {
  const [automaticLow, setAutomaticLow] = useState(false);
  const [fps, setFps] = useState(0);
  const low = !props.recordQuality && (props.lowQuality || automaticLow);
  return (
    <div
      className={'scene cad-scene' + (props.featureId === 'R1' ? ' channel-scene' : '')}
      aria-label={
        props.kind === 'compost'
          ? 'Selectable 3D compost bay parts'
          : 'Selectable 3D drainage parts'
      }
      data-model-kind={props.physics?.config.kind}
      data-frame-second={props.physics?.frame?.second}
      data-ponding-mm={(props.physics?.frame?.ponding ?? 0) * 1000}
      data-explode={props.explode}
      data-part-count={props.parts.length}
      data-quality={props.recordQuality ? 'record' : low ? 'low' : 'high'}
      data-rain-count={rainCount(props.physics?.frame?.rain ?? 0, low, props.recordQuality)}
      data-cut-axis={props.cutAxis}
      data-cut-position={props.cutPosition}
      data-camera-preset={props.cameraPreset ?? 'default'}
      data-pipe-fill={props.physics?.frame?.pipeFill ?? 0}
      data-pipe-velocity={props.physics?.frame?.pipeVelocity ?? 0}
      data-underdrain-flow={props.physics?.frame?.flux.drain ?? 0}
      data-overflow-visible={(props.physics?.frame?.flux.overflow ?? 0) > 0}
    >
      <Canvas
        key={props.reset}
        onPointerMissed={() => props.onInspect?.()}
        orthographic
        camera={{
          position: props.physics ? [-18, 11, 16] : [19, 15, 23],
          zoom: 32,
          near: 0.1,
          far: 180,
        }}
        dpr={props.recordQuality ? 2 : low ? 1 : [1, 1.5]}
        shadows={{ type: PCFSoftShadowMap }}
        frameloop="demand"
        gl={{ antialias: !low, localClippingEnabled: true, stencil: true }}
        fallback={
          props.physics ? (
            <PhysicsSection {...props.physics} />
          ) : (
            <p>3D unavailable. All parts and readings remain available in the part list.</p>
          )
        }
      >
        <RenderBudget
          active={
            props.mode === 'Debug' ||
            (!!props.physics?.frame &&
              (props.physics.frame.ponding > 0 ||
                props.physics.frame.rain > 0 ||
                props.physics.frame.flux.outfall > 0))
          }
          low={!!low}
          onBudget={(measured, nextLow) => {
            setFps(measured);
            setAutomaticLow(nextLow);
            props.onPerformance?.(
              measured,
              props.recordQuality ? 'Record' : props.lowQuality || nextLow ? 'Low' : 'High',
            );
          }}
        />
        <Model {...props} lowQuality={low} />
      </Canvas>
      {props.physics && <span className="scene-design-stamp">Typical design, not surveyed</span>}
      {props.physics?.frame && <span className="scene-rain-status">
        {props.physics.frame.rain > 0 ? `Rain: ${props.physics.frame.rain * 3.6e6 >= 50 ? 'Heavy' : props.physics.frame.rain * 3.6e6 >= 10 ? 'Moderate' : 'Light'} ${(props.physics.frame.rain * 3.6e6).toFixed(1)} mm/h` : 'Rain stopped'}
      </span>}
      {props.mode === 'Debug' && (
        <output className="scene-performance">
          {fps ? fps.toFixed(0) + ' FPS' : 'Measuring FPS'} ·{' '}
          {props.recordQuality ? 'Record' : low ? 'Low' : 'High'} quality
        </output>
      )}
    </div>
  );
}

function RenderBudget({
  onBudget,
  active,
  low,
}: {
  onBudget: (fps: number, low: boolean) => void;
  active: boolean;
  low: boolean;
}) {
  const gl = useThree((s) => s.gl),
    invalidate = useThree((s) => s.invalidate),
    elapsed = useRef(0),
    count = useRef(0),
    metadataTime = useRef(0),
    wasActive = useRef(false),
    stable = useRef(0);
  const warmup = useRef(0),
    slowWindows = useRef(0);
  useFrame(({ scene, camera }, delta) => {
    if (active) invalidate();
    const surface = scene.getObjectByName('ponded-water');
    const element = gl.domElement.closest<HTMLElement>('.cad-scene');
    metadataTime.current += delta;
    if (element && (!active || metadataTime.current >= 0.2)) {
      metadataTime.current = 0;
      element.dataset.waterSurfaceHeight = surface
        ? new Box3().setFromObject(surface).max.y.toString()
        : '0';
      const pipe =
        scene.getObjectByName('pipe-water-underdrain') ??
        scene.getObjectByName('pipe-water-outfall');
      element.dataset.renderedPipeFill = String(pipe?.userData.fill ?? 0);
      element.dataset.renderedPipeSpeed = String(pipe?.userData.velocity ?? 0);
      let outlines = 0;
      scene.traverse((o) => {
        if (o.name === 'fault-outline') outlines++;
      });
      element.dataset.faultOutlines = String(outlines);
      const outlined: string[] = [];
      let clipped = true;
      scene.traverse((o) => {
        if (o.name !== 'fault-outline') return;
        outlined.push(o.userData.partId);
        o.traverse((line) => {
          if (line instanceof Mesh) {
            const materials = Array.isArray(line.material) ? line.material : [line.material];
            clipped &&= materials.every((m) => !!m.clippingPlanes?.length);
          }
        });
      });
      element.dataset.outlineParts = outlined.join(',');
      element.dataset.outlineClipped = String(outlines > 0 && clipped);
      element.dataset.drawCalls = String(gl.info.render.calls);
      const planes = new Set<Plane>();
      let contextClipped = 0, assemblyClipped = 0, assemblyMeshes = 0;
      scene.getObjectByName('catchment-context')?.traverse((o) => {
        if (o instanceof Mesh && (Array.isArray(o.material) ? o.material : [o.material]).some(m => m.clippingPlanes?.length)) contextClipped++;
      });
      scene.getObjectByName('drain-parts')?.traverse((o) => {
        if (!(o instanceof Mesh) || o.userData.sectionPass) return;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        if (materials.some(m => m.clippingPlanes?.length)) {
          assemblyClipped++;
          materials.forEach(m => m.clippingPlanes?.forEach((p: Plane) => planes.add(p)));
        }
        assemblyMeshes++;
      });
      element.dataset.contextClipped = String(contextClipped);
      element.dataset.assemblyClipped = String(assemblyClipped);
      element.dataset.assemblyMeshes = String(assemblyMeshes);
      element.dataset.activePlanes = String(planes.size);
      element.dataset.mistVisible = String(!!scene.getObjectByName('ground-mist'));
      const flows: Record<string, { discharge: number; width: number; velocity: number }> = {};
      scene.traverse((o) => {
        if (typeof o.userData.discharge === 'number')
          flows[o.name] = {
            discharge: o.userData.discharge,
            width: o.userData.width,
            velocity: o.userData.velocity,
          };
      });
      element.dataset.flowElements = JSON.stringify(flows);
      const cut = scene.getObjectByName('section-cut-plane');
      element.dataset.planePosition = String(
        cut?.userData.position ?? element.dataset.cutPosition ?? 0,
      );
      if (cut) {
        const point = cut.getWorldPosition(new Vector3()),
          a = point.clone().project(camera),
          direction = new Vector3(...cutNormal(cut.userData.axis)),
          b = point.clone().sub(direction).project(camera),
          rect = gl.domElement.getBoundingClientRect();
        element.dataset.cutPlaneScreen = JSON.stringify({
          x: ((a.x + 1) * rect.width) / 2,
          y: ((1 - a.y) * rect.height) / 2,
          dx: ((b.x - a.x) * rect.width) / 2,
          dy: (-(b.y - a.y) * rect.height) / 2,
        });
      }
      const deposits: string[] = [];
      scene.traverse((o) => {
        if (o.userData.confirmedFault) deposits.push(o.name.replace('confirmed-deposit-', ''));
      });
      element.dataset.depositParts = deposits.join(',');
      let tintCount=0, obstructionCount=0;
      scene.traverse(o=>{
        if(o instanceof Mesh && !o.userData.sectionPass && (Array.isArray(o.material)?o.material:[o.material]).some(m=>m.userData.faultTint)) tintCount++;
        if(o.userData.faultFinding) obstructionCount++;
      });
      element.dataset.faultTintCount=String(tintCount);
      element.dataset.faultObstructionCount=String(obstructionCount);
      element.dataset.rainBounds = JSON.stringify(
        scene.getObjectByName('storm-rain')?.userData.bounds ?? null,
      );
      const model = scene.getObjectByName('drain-parts');
      if (model) {
        const bounds = new Box3(),
          xs: number[] = [];
        model.traverse((part) => {
          if (!part.userData.physicalPart) return;
          part.traverse((mesh) => {
            if (mesh instanceof Mesh && mesh.visible && !mesh.userData.sectionFace)
              bounds.union(new Box3().setFromObject(mesh));
          });
        });
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z])
              xs.push(new Vector3(x, y, z).project(camera).x);
        element.dataset.projectedWidth = String((Math.max(...xs) - Math.min(...xs)) / 2);
      }
      element.dataset.inletSpeed = String(
        scene.getObjectByName('gutter-flow')?.userData.speed ?? 0,
      );
      element.dataset.jetVisible = String(!!scene.getObjectByName('outfall-jet'));
      element.dataset.spillVisible = String(!!scene.getObjectByName('overflow-spill'));
    }
    if (!active) {
      wasActive.current = false;
      elapsed.current = 0;
      count.current = 0;
      return;
    }
    // A demand-rendered idle gap is not a sample of active rendering performance.
    if (!wasActive.current) {
      wasActive.current = true;
      elapsed.current = count.current = stable.current = 0;
      return;
    }
    elapsed.current += Math.min(delta, 2);
    if (warmup.current < 3) {
      warmup.current += Math.min(delta, 0.1);
      elapsed.current = 0;
      count.current = 0;
      return;
    }
    count.current++;
    if (elapsed.current < 2) return;
    const fps = count.current / elapsed.current;
    gl.domElement.dataset.renderFps = fps.toFixed(1);
    stable.current = fps >= 55 ? stable.current + elapsed.current : 0;
    slowWindows.current = fps < 45 ? slowWindows.current + 1 : 0;
    onBudget(fps, low ? stable.current < 8 : slowWindows.current >= 2);
    elapsed.current = 0;
    count.current = 0;
  });
  return null;
}
