import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { DragControls, Html, OrbitControls, Edges } from '@react-three/drei';
import { Box3, Line, Material, Matrix4, Mesh, MeshStandardMaterial, Plane, Vector3 } from 'three';
import type { Config, Part, PartId, Sensor } from '../api/types';
import { createDrainParts, palette } from './geometry';
import { useSelection } from '../state';
import FitCamera from './FitCamera';
import SensorMarkers from './SensorMarkers';
import { createCompostParts } from './compostGeometry';
import { sensorMarkers } from '../api/sensorViews';
export type Assembly = 'exploded' | 'assembled' | 'section';
export type ViewMode = 'Operator' | 'Debug' | 'Troubleshoot';
export type Offsets = Partial<Record<PartId, [number, number, number]>>;
export interface Props {
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
  const invalidate = useThree((s) => s.invalidate);
  const select = useSelection((s) => s.selectPart),
    selected = useSelection((s) => s.partId);
  const groups = useMemo(
    () =>
      props.kind === 'compost'
        ? createCompostParts()
        : createDrainParts(props.featureId, props.dimensions),
    [props.featureId, props.kind, props.dimensions],
  );
  const plane = useMemo(() => new Plane(), []),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const e = props.assembly === 'exploded' ? props.explode / 100 : 0;
  useEffect(() => {
    plane.normal.set(props.cutAxis === 'X' ? -1 : 0, props.cutAxis === 'Y' ? -1 : 0, props.cutAxis === 'Z' ? -1 : 0);
    plane.constant = props.cutPosition;
    props.parts.forEach((part) => {
      groups[part.partId]?.traverse((object) => {
        if (!(object instanceof Mesh) && !(object instanceof Line)) return;
        const materials: Material[] = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          material.clippingPlanes = props.assembly === 'section' ? [plane] : [];
          const dim = !part.installed || (props.mode === 'Troubleshoot' && part.status === 'ok');
          const baseOpacity = Number(material.userData.baseOpacity ?? 1);
          material.opacity = dim ? baseOpacity * 0.25 : baseOpacity;
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
        width={13.5}
        height={9.6}
        controlsRef={controls}
        enabled={!props.move}
        target={[1.2, 1.2, 0]}
      />
      <color attach="background" args={['#E2DCCB']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-6, 13, 8]} intensity={1.65} />
      <directionalLight position={[9, 5, -6]} intensity={0.35} />
      <mesh position={[1.2, -1.12, 0]}>
        <boxGeometry args={[10.35, 0.05, 4.55]} />
        <meshStandardMaterial color={palette.ground} />
        <Edges color={palette.ink3} />
      </mesh>
      {props.parts.map((part) => {
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
            {props.showSensors && part.installed && (props.mode === 'Debug' || selected === id) && (
              <SensorMarkers
                sensors={sensorMarkers(props.sensors).filter((s) => s.partId === id)}
              />
            )}
            {selected === id && <SelectedBounds group={geometry} />}
            {props.labels && (props.mode !== 'Operator' || selected === id) && (
              <Html position={[label.x, label.y, label.z]} center>
                <div className="scene-label">
                  {part.name}
                  {!part.installed && '  -  Not installed'}
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
  return (
    <div
      className="scene cad-scene"
      aria-label={
        props.kind === 'compost'
          ? 'Selectable 3D compost bay parts'
          : 'Selectable 3D drainage parts'
      }
      data-explode={props.explode}
      data-part-count={props.parts.length}
    >
      <Canvas
        key={props.reset}
        orthographic
        camera={{ position: [19, 15, 23], zoom: 32, near: 0.1, far: 180 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, localClippingEnabled: true }}
        fallback={<p>3D unavailable. All parts and readings remain available in the part list.</p>}
      >
        <Model {...props} />
      </Canvas>
    </div>
  );
}
