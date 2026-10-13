import { useMemo, useRef, type ComponentRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { DragControls, Html, Instance, Instances, OrbitControls, Edges } from '@react-three/drei';
import { Matrix4, Vector3 } from 'three';
import type { Feature, House, Sensor, Zone, ZoneRain } from '../api/types';
import { useSelection } from '../state';
import { palette, roofGeometry } from './geometry';
import { useNavigate } from 'react-router-dom';
import FitCamera from './FitCamera';
import SensorMarkers from './SensorMarkers';
import { sensorMarkers } from '../api/sensorViews';
type Props = {
  sensors: Sensor[];
  showSensors: boolean;
  houses: House[];
  zones: Zone[];
  features: Feature[];
  rain: ZoneRain[];
  layer: 'water' | 'rain';
  move: boolean;
  reset: number;
};
const heat = (rain: number) =>
  rain > 60
    ? palette.heat3
    : rain >= 40
      ? palette.heat2
      : rain >= 20
        ? palette.heat1
        : palette.heat0;
function SceneContent({
  houses,
  zones,
  features,
  rain,
  layer,
  move,
  sensors,
  showSensors,
}: Props) {
  const positions = useSelection((s) => s.housePositions),
    selected = useSelection((s) => s.houseId),
    select = useSelection((s) => s.selectHouse),
    selectZone = useSelection((s) => s.selectZone),
    moveHouse = useSelection((s) => s.moveHouse);
  const navigate = useNavigate();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const roof = useMemo(() => roofGeometry(), []);
  const centres = [
    [-4.9, -4.05],
    [4.9, -4.05],
    [-4.9, 4.05],
    [4.9, 4.05],
  ];
  return (
    <>
      <FitCamera
        width={29.3}
        height={18.5}
        controlsRef={controls}
        enabled={!move}
        target={[0, 0.2, 0]}
      />
      <color attach="background" args={['#E2DCCB']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-6, 13, 8]} intensity={1.65} />
      <directionalLight position={[9, 5, -6]} intensity={0.35} />
      <mesh position={[0, -0.23, 0]}>
        <boxGeometry args={[20.6, 0.3, 17.5]} />
        <meshStandardMaterial color={palette.panel} />
        <Edges color={palette.ink3} />
      </mesh>
      {zones.map((zone, i) => (
        <group key={zone.id}>
          <mesh
            position={[centres[i][0], -0.05, centres[i][1]]}
            onClick={(e) => {
              e.stopPropagation();
              selectZone(zone.id);
            }}
          >
            <boxGeometry args={[8.85, 0.08, 6.65]} />
            <meshStandardMaterial
              color={
                layer === 'rain'
                  ? heat(rain.find((r) => r.zone === zone.id)?.peakMmPerHr || zone.peakMmPerHr)
                  : heat(zone.housesHoldingWater6h * 16)
              }
            />
          </mesh>
          <Html
            center
            position={[Math.sign(centres[i][0]) * 8.6, 0.3, Math.sign(centres[i][1]) * 6.9]}
          >
            <div className="scene-label zone">
              Zone {zone.id}
              <small>
                {rain.find((r) => r.zone === zone.id)?.peakMmPerHr || zone.peakMmPerHr} mm/h ·{' '}
                {zone.housesHoldingWater6h}/6 hold water
              </small>
            </div>
          </Html>
        </group>
      ))}
      <Instances limit={24}>
        <boxGeometry args={[1.98, 1.2, 1.72]} />
        <meshStandardMaterial roughness={1} />
        {houses.map((h) => {
          const p = positions[h.id] || [h.x, h.y];
          return (
            <Instance
              key={h.id}
              position={[p[0], 0.64, p[1]]}
              color={layer === 'water' && h.holdsWater6h ? palette.heat1 : palette.panel}
            />
          );
        })}
      </Instances>
      <Instances geometry={roof} limit={24}>
        <meshStandardMaterial color={0xb7af9b} roughness={1} />
        {houses.map((h) => {
          const p = positions[h.id] || [h.x, h.y];
          return <Instance key={h.id} position={[p[0], 1.25, p[1]]} />;
        })}
      </Instances>
      {houses.map((h) => {
        const p = positions[h.id] || [h.x, h.y];
        const hit = (
          <mesh
            position={[0, 0.85, 0]}
            onClick={(e) => {
              e.stopPropagation();
              select(h.id);
            }}
          >
            <boxGeometry args={[2.15, 1.9, 2.05]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            {selected === h.id && <Edges color={palette.ink} />}
          </mesh>
        );
        return (
          <group key={h.id}>
            <group position={[p[0], 0, p[1]]}>
              <mesh position={[-0.42, 0.4, 0.885]}>
                <boxGeometry args={[0.28, 0.65, 0.04]} />
                <meshStandardMaterial color={palette.ink2} />
              </mesh>
              <mesh position={[0.43, 0.77, 0.885]}>
                <boxGeometry args={[0.47, 0.35, 0.04]} />
                <meshStandardMaterial color={palette.well} />
              </mesh>
              <mesh position={[0.86, 0.05, 1.13]}>
                <boxGeometry args={[0.19, 0.07, 0.19]} />
                <meshStandardMaterial color={h.holdsWater6h ? palette.heat3 : palette.ink2} />
              </mesh>
            </group>
            {move ? (
              <DragControls
                axisLock="y"
                matrix={new Matrix4().makeTranslation(p[0], 0, p[1])}
                autoTransform={false}
                dragLimits={[
                  [-12, 12],
                  [0, 0],
                  [-10, 10],
                ]}
                onDragStart={() => select(h.id)}
                onDrag={(matrix) => {
                  const point = new Vector3().setFromMatrixPosition(matrix);
                  moveHouse(h.id, [point.x, point.z]);
                }}
              >
                {hit}
              </DragControls>
            ) : (
              <group position={[p[0], 0, p[1]]}>{hit}</group>
            )}
          </group>
        );
      })}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.65, 0.05, 16.7]} />
        <meshStandardMaterial color={palette.panel} />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[20, 0.05, 1.55]} />
        <meshStandardMaterial color={palette.panel} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[-9.4 + i * 1.2, 0.04, 0]}>
          <boxGeometry args={[0.4, 0.012, 0.04]} />
          <meshBasicMaterial color={palette.ink3} />
        </mesh>
      ))}
      <mesh position={[0, -0.03, -8.03]}>
        <boxGeometry args={[19.4, 0.1, 0.73]} />
        <meshStandardMaterial color={palette.well} />
      </mesh>
      {Array.from({ length: 59 }, (_, i) => (
        <mesh key={i} position={[-9.2 + i * 0.32, 0.04, -8.03]} rotation={[0, -0.65, 0]}>
          <boxGeometry args={[0.02, 0.01, 0.7]} />
          <meshBasicMaterial color={palette.ink3} />
        </mesh>
      ))}
      <Html position={[1.3, 0.12, -8.1]} center>
        <div className="scene-label">River edge · schematic</div>
      </Html>
      <Html position={[-7, 0.12, 0]} center>
        <div className="scene-label">Access road</div>
      </Html>
      {features.map((f) => (
        <group key={f.id} position={[f.x, 0.06, f.y]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              navigate('/feature/' + f.id);
            }}
          >
            <boxGeometry args={f.kind === 'swale' ? [6.5, 0.11, 0.25] : [0.5, 0.12, 0.5]} />
            <meshStandardMaterial color={f.arm ? palette[f.arm] : palette.ink2} />
          </mesh>
          <Html center position={[0, 0.2, 0]}>
            <button className="scene-label" onClick={() => navigate('/feature/' + f.id)}>
              {f.id}
            </button>
          </Html>
        </group>
      ))}
      {showSensors && (
        <SensorMarkers
          site
          sensors={sensorMarkers(sensors).map((s) => {
            const house = houses.find((h) => h.drainId === s.ownerId),
              moved = house && positions[house.id];
            return house && moved
              ? {
                  ...s,
                  siteLocation: {
                    ...s.siteLocation,
                    x: s.siteLocation.x - house.x + moved[0],
                    z: s.siteLocation.z - house.y + moved[1],
                  },
                }
              : s;
          })}
        />
      )}
    </>
  );
}
export default function NeighbourhoodScene(props: Props) {
  return (
    <div className="scene" aria-label="Interactive 3D schematic of 24 houses">
      <Canvas
        key={props.reset}
        orthographic
        camera={{ position: [22, 25, 24], zoom: 22, near: 0.1, far: 180 }}
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true }}
        fallback={<p>3D is unavailable. Switch to the Plan view.</p>}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
