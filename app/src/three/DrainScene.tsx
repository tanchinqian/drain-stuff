import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { DragControls, Html, OrbitControls, Edges } from '@react-three/drei';
import { Box3, Line, Material, Matrix4, Mesh, MeshStandardMaterial, Plane, Vector3 } from 'three';
import type { Config, Part, PartId, Sensor } from '../api/types';
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
import { rainCount } from './WaterEffects';
import { drainDesign } from '../simulation/physics/design';
export type Assembly = 'exploded' | 'assembled' | 'section';
export type ViewMode = 'Operator' | 'Debug' | 'Troubleshoot';
export type Offsets = Partial<Record<PartId, [number, number, number]>>;
export interface Props {
  lowQuality?: boolean;
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
        if (m instanceof MeshStandardMaterial) m.map?.dispose();
        m.dispose();
      });
    },
    [groups],
  );
  const plane = useMemo(
      () =>
        new Plane(
          new Vector3(
            props.cutAxis === 'X' ? -1 : 0,
            props.cutAxis === 'Y' ? -1 : 0,
            props.cutAxis === 'Z' ? -1 : 0,
          ),
          props.cutPosition,
        ),
      [props.cutAxis, props.cutPosition],
    ),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const e = props.assembly === 'exploded' ? props.explode / 100 : 0;
  const field = props.physics?.frame?.soil;
  const texture = useMemo(() => (field ? moistureTexture(field) : undefined), [field]);
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
    plane.normal.set(
      props.cutAxis === 'X' ? -1 : 0,
      props.cutAxis === 'Y' ? -1 : 0,
      props.cutAxis === 'Z' ? -1 : 0,
    );
    plane.constant = props.cutPosition;
    props.parts.forEach((part) => {
      groups[part.partId]?.traverse((object) => {
        if (object.userData.sectionFace)
          object.visible =
            props.assembly === 'section' && props.cutAxis === 'Z' && props.cutPosition === 0;
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
  ]);
  return (
    <>
      <FitCamera
        width={
          props.physics
            ? Math.max(
                7,
                props.physics.config.values.length.value + (props.assembly === 'exploded' ? 7 : 4),
              )
            : props.kind === 'compost'
              ? 11.6
              : 13.5
        }
        height={
          props.physics && props.assembly !== 'exploded' ? 6 : props.kind === 'compost' ? 8 : 9.6
        }
        controlsRef={controls}
        enabled={!props.move}
        target={props.physics && props.assembly !== 'exploded' ? [0.5, 0, 0] : [1.2, 1.2, 0]}
      />
      <color attach="background" args={['#E2DCCB']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-6, 13, 8]} intensity={1.65} />
      <directionalLight position={[9, 5, -6]} intensity={0.35} />
      <mesh
        position={design ? [0.5, design.bottomY - design.nativeDepth - 0.03, 0] : [1.2, -1.12, 0]}
      >
        <boxGeometry
          args={design ? [design.length + 3, 0.05, design.topWidth + 0.8] : [10.35, 0.05, 4.55]}
        />
        <meshStandardMaterial color={palette.ground} />
        <Edges color={palette.ink3} />
      </mesh>
      {props.physics && props.dimensionsVisible && props.assembly !== 'exploded' && (
        <DimensionLines config={props.physics.config} />
      )}
      {props.parts.map((part, partIndex) => {
        const id = part.partId,
          base = shifts(id, e),
          offset = props.offsets[id] || [0, 0, 0],
          position = base.map((v, i) => v + offset[i]) as [number, number, number];
        const geometry = groups[id];
        if (!geometry) return null;
        const labelBox = geometry.userData.localBounds as Box3;
        const label = labelBox.getCenter(new Vector3());
        label.y = labelBox.max.y + 0.3;
        const visible = !props.hidden.includes(id) && (!props.isolate || selected === id);
        const content = (
          <group visible={visible}>
            <primitive
              object={geometry}
              onClick={(event: { stopPropagation: () => void }) => {
                event.stopPropagation();
                select(id);
              }}
            />
            {props.assembly === 'section' &&
              part.installed &&
              ['media', 'transition', 'drainage', 'mulch', 'liner', 'inlet'].includes(id) && (
                <SectionCaps
                  group={geometry}
                  plane={plane}
                  physics={props.physics}
                  orderBase={10 + partIndex * 100}
                />
              )}
            {props.physics && part.installed && (
              <PhysicsWater
                id={id}
                physics={props.physics}
                plane={props.assembly === 'section' ? plane : undefined}
                low={props.lowQuality}
              />
            )}
            {props.showSensors && part.installed && (props.mode === 'Debug' || selected === id) && (
              <SensorMarkers
                sensors={sensorMarkers(props.sensors).filter((s) => s.partId === id)}
              />
            )}
            {part.installed && part.sensorIds.length > 0 && part.status !== 'ok' && (
              <PartHighlight
                group={geometry}
                status={part.status}
                number={
                  props.parts
                    .filter((p) => p.installed && p.status !== 'ok')
                    .findIndex((p) => p.partId === id) + 1
                }
                name={part.name}
              />
            )}
            {selected === id && part.status === 'ok' && <SelectedBounds group={geometry} />}
            {props.labels &&
              (props.mode !== 'Operator' || (selected === id && part.status === 'ok')) && (
                <Html position={[label.x, label.y, label.z]} center>
                  <div className="scene-label">
                    {part.name}
                    {!part.installed && '  -  Not installed; check by eye'}
                    {part.installed && !part.sensorIds.length && ' - Not monitored; check by eye'}
                    {props.mode === 'Troubleshoot' && part.status !== 'ok' && (
                      <small>
                        {' '}
                        · Check{' '}
                        {props.parts
                          .filter((p) => p.status !== 'ok')
                          .findIndex((p) => p.partId === id) + 1}
                      </small>
                    )}
                  </div>
                </Html>
              )}
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
    </>
  );
}
function SelectedBounds({
  group,
}: {
  group: NonNullable<ReturnType<typeof createDrainParts>[PartId]>;
}) {
  const box = useMemo(() => group.userData.localBounds as Box3, [group]);
  const size = box.getSize(new Vector3()),
    centre = box.getCenter(new Vector3());
  return (
    <mesh position={centre}>
      <boxGeometry args={[size.x + 0.04, size.y + 0.04, size.z + 0.04]} />
      <meshBasicMaterial visible={false} />
      <Edges color={palette.ink} />
    </mesh>
  );
}
export default function DrainScene(props: Props) {
  const [automaticLow, setAutomaticLow] = useState(false);
  const low = props.lowQuality || automaticLow;
  return (
    <div
      className="scene cad-scene"
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
      data-quality={low ? 'low' : 'high'}
      data-rain-count={rainCount(props.physics?.frame?.rain ?? 0, low)}
      data-pipe-fill={props.physics?.frame?.pipeFill ?? 0}
      data-pipe-velocity={props.physics?.frame?.pipeVelocity ?? 0}
      data-underdrain-flow={props.physics?.frame?.flux.drain ?? 0}
      data-overflow-visible={(props.physics?.frame?.flux.overflow ?? 0) > 0}
    >
      <Canvas
        key={props.reset}
        orthographic
        camera={{ position: [19, 15, 23], zoom: 32, near: 0.1, far: 180 }}
        dpr={low ? 1 : [1, 1.5]}
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
            !!props.physics?.frame &&
            (props.physics.frame.ponding > 0 ||
              props.physics.frame.rain > 0 ||
              props.physics.frame.flux.outfall > 0)
          }
          onSlow={() => setAutomaticLow(true)}
        />
        <Model {...props} lowQuality={low} />
      </Canvas>
    </div>
  );
}

function RenderBudget({ onSlow, active }: { onSlow: () => void; active: boolean }) {
  const gl = useThree((s) => s.gl),
    elapsed = useRef(0),
    count = useRef(0);
  useFrame(({ scene }, delta) => {
    const surface = scene.getObjectByName('ponded-water');
    const element = gl.domElement.closest<HTMLElement>('.cad-scene');
    if (element) {
      element.dataset.waterSurfaceHeight = surface
        ? new Box3().setFromObject(surface).max.y.toString()
        : '0';
      const pipe =
        scene.getObjectByName('pipe-water-underdrain') ??
        scene.getObjectByName('pipe-water-outfall');
      element.dataset.renderedPipeFill = String(pipe?.userData.fill ?? 0);
      element.dataset.renderedPipeSpeed = String(pipe?.userData.velocity ?? 0);
    }
    if (!active) {
      elapsed.current = 0;
      count.current = 0;
      return;
    }
    elapsed.current += Math.min(delta, 2);
    count.current++;
    if (elapsed.current < 2) return;
    const fps = count.current / elapsed.current;
    gl.domElement.dataset.renderFps = fps.toFixed(1);
    if (fps < 45) onSlow();
    elapsed.current = 0;
    count.current = 0;
  });
  return null;
}
