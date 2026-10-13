import { useMemo, useRef, type ComponentRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  DragControls,
  Html,
  Instance,
  Instances,
  OrbitControls,
  Edges,
  Line,
} from '@react-three/drei';
import { Matrix4, Shape, Vector2, Vector3 } from 'three';
import type { Feature, House, Sensor, Zone, ZoneRain } from '../api/types';
import { useSelection } from '../state';
import { palette, roofGeometry } from './geometry';
import { useNavigate } from 'react-router-dom';
import FitCamera from './FitCamera';
import SensorMarkers from './SensorMarkers';
import RainCloud from './RainCloud';
import { sensorMarkers } from '../api/sensorViews';
import { featureCallouts, mapBounds, pilotByBuilding, roadLabels, site } from '../site/layout';

type Props = {
  sensors: Sensor[];
  showSensors: boolean;
  houses: House[];
  zones: Zone[];
  features: Feature[];
  rain: ZoneRain[];
  layer: 'water' | 'rain';
  cloudOpacity: number;
  move: boolean;
  reset: number;
  mappedHouseId: string | null;
  onSelectMapped: (id: string | null) => void;
};

function SceneContent({
  houses,
  features,
  rain,
  layer,
  cloudOpacity,
  move,
  sensors,
  showSensors,
  mappedHouseId,
  onSelectMapped,
}: Props) {
  const positions = useSelection((s) => s.housePositions),
    selected = useSelection((s) => s.houseId),
    select = useSelection((s) => s.selectHouse),
    moveHouse = useSelection((s) => s.moveHouse);
  const navigate = useNavigate();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const roof = useMemo(() => roofGeometry(), []);
  const roads = useMemo(
    () =>
      site.roads.flatMap((r) =>
        r.segments.map(([a, b]) => ({
          x: (a[0] + b[0]) / 2,
          z: (a[1] + b[1]) / 2,
          length: Math.hypot(b[0] - a[0], b[1] - a[1]),
          rotation: Math.atan2(b[0] - a[0], b[1] - a[1]),
          width: r.width,
        })),
      ),
    [],
  );
  const displayHouses = site.houses.map((h) => {
    const pilotId = pilotByBuilding.get(h.id),
      pilot = houses.find((p) => p.id === pilotId);
    const id = pilotId || h.id;
    const p = positions[id] || (pilot ? [pilot.x, pilot.y] : [h.x, h.z]);
    return { ...h, id, x: p[0], z: p[1], pilot, selected: id === selected || id === mappedHouseId };
  });
  const choose = (id: string, pilot?: House) => {
    select(pilot ? id : null);
    onSelectMapped(pilot ? null : id);
  };
  return (
    <>
      <FitCamera
        width={73}
        height={44}
        controlsRef={controls}
        enabled={!move}
        target={[0, 0.2, 0]}
      />
      <color attach="background" args={['#E2DCCB']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-6, 25, 8]} intensity={1.65} />
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[66, 0.25, 28]} />
        <meshStandardMaterial color={palette.ground} />
        <Edges color={palette.ink3} />
      </mesh>
      {site.areas.map((a) => (
        <mesh key={a.id} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]}>
          <shapeGeometry args={[new Shape(a.outline.map(([x, z]) => new Vector2(x, -z)))]} />
          <meshBasicMaterial color={a.kind === 'water' ? palette.well : palette.heat0} />
        </mesh>
      ))}
      <Instances limit={roads.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={palette.panel} />
        {roads.map((r, i) => (
          <Instance
            key={i}
            position={[r.x, 0.003, r.z]}
            rotation={[0, r.rotation, 0]}
            scale={[r.width, 0.016, r.length]}
          />
        ))}
      </Instances>
      <Instances limit={site.houses.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={1} />
        {displayHouses.map((h) => (
          <Instance
            key={h.id}
            position={[h.x, 0.22, h.z]}
            rotation={[0, h.rotation, 0]}
            scale={[h.width, 0.4, h.depth]}
            color={
              h.selected
                ? palette.heat2
                : layer === 'water' && h.pilot?.holdsWater6h
                  ? palette.heat1
                  : h.pilot
                    ? palette.panel
                    : 0xc8beaa
            }
            onClick={(e) => {
              e.stopPropagation();
              choose(h.id, h.pilot);
            }}
          />
        ))}
      </Instances>
      <Instances geometry={roof} limit={site.houses.length}>
        <meshStandardMaterial roughness={1} />
        {displayHouses.map((h) => (
          <Instance
            key={h.id}
            position={[h.x, 0.43, h.z]}
            rotation={[0, h.rotation, 0]}
            scale={[h.width / 2.18, 0.2, h.depth / 1.93]}
            color={h.selected ? palette.heat2 : h.pilot ? palette.ink2 : 0xa89b82}
            onClick={(e) => {
              e.stopPropagation();
              choose(h.id, h.pilot);
            }}
          />
        ))}
      </Instances>
      {displayHouses
        .filter((h) => h.selected)
        .map((h) => (
          <group key={h.id}>
            {move ? (
              <DragControls
                axisLock="y"
                matrix={new Matrix4().makeTranslation(h.x, 0, h.z)}
                autoTransform={false}
                dragLimits={[
                  [-mapBounds.x, mapBounds.x],
                  [0, 0],
                  [-mapBounds.z, mapBounds.z],
                ]}
                onDrag={(matrix) => {
                  const p = new Vector3().setFromMatrixPosition(matrix);
                  moveHouse(h.id, [p.x, p.z]);
                }}
              >
                <mesh position={[0, 0.38, 0]} rotation={[0, h.rotation, 0]}>
                  <boxGeometry args={[h.width + 0.2, 0.8, h.depth + 0.2]} />
                  <meshBasicMaterial
                    transparent
                    opacity={0.15}
                    color={palette.heat2}
                    depthWrite={false}
                  />
                  <Edges color={palette.ink} />
                </mesh>
              </DragControls>
            ) : (
              <mesh position={[h.x, 0.38, h.z]} rotation={[0, h.rotation, 0]}>
                <boxGeometry args={[h.width + 0.12, 0.8, h.depth + 0.12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                <Edges color={palette.ink} />
              </mesh>
            )}
            <Html
              center
              position={[h.x + 1.4, 1.6, h.z]}
              zIndexRange={[12, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div className="scene-label">
                {h.pilot ? h.id + ' · Pilot house' : 'Mapped house'}
              </div>
            </Html>
          </group>
        ))}
      {roadLabels.map((r) => {
        const [a, b] = r.segments[Math.floor(r.segments.length / 2)];
        return (
          <Html
            key={r.id}
            center
            position={[(a[0] + b[0]) / 2, 0.1, (a[1] + b[1]) / 2]}
            zIndexRange={[4, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="scene-label road-label">{r.name}</div>
          </Html>
        );
      })}
      {features.map((f) => {
        const [x, z] = featureCallouts[f.id] || [f.x, f.y];
        return (
          <group key={f.id} position={[f.x, 0.08, f.y]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                navigate('/feature/' + f.id);
              }}
            >
              <boxGeometry args={f.kind === 'swale' ? [3, 0.12, 0.35] : [0.5, 0.18, 0.5]} />
              <meshStandardMaterial color={f.arm ? palette[f.arm] : palette.ink2} />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 1.25, 6]} />
              <meshBasicMaterial color={palette.ink} />
            </mesh>
            <Line
              points={[
                [0, 0.15, 0],
                [x - f.x, 1.4, z - f.y],
              ]}
              color={palette.ink2}
              lineWidth={1}
              raycast={() => undefined}
            />
            <Html center position={[x - f.x, 1.4, z - f.y]} zIndexRange={[10, 0]}>
              <button
                className={'scene-label feature-pin' + (f.kind === 'swale' ? '' : ' secondary-pin')}
                aria-label={'Open ' + f.id + ' ' + f.name}
                onClick={() => navigate('/feature/' + f.id)}
              >
                {f.id}
              </button>
            </Html>
          </group>
        );
      })}
      {layer === 'rain' && cloudOpacity > 0 && <RainCloud samples={rain} opacity={cloudOpacity} />}
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
  const selectZone = useSelection((s) => s.selectZone);
  const zoneId = useSelection((s) => s.zoneId);
  return (
    <>
      <nav className="map-zones" aria-label="Map zones">
        {props.zones.map((z) => (
          <button key={z.id} aria-pressed={zoneId === z.id} onClick={() => selectZone(z.id)}>
            Zone {z.id}  /  {props.rain.find((r) => r.zone === z.id)?.peakMmPerHr ?? z.peakMmPerHr}{' '}
            mm/h
          </button>
        ))}
      </nav>
      <div
        className="scene neighbourhood-scene"
        aria-label="Interactive 3D map of 589 mapped houses and 24 synthetic pilot households"
        data-cloud-opacity={props.layer === 'rain' ? props.cloudOpacity : 0}
      >
        <Canvas
          key={props.reset}
          orthographic
          camera={{ position: [32, 46, 35], zoom: 12, near: 0.1, far: 200 }}
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true }}
          fallback={<p>3D is unavailable. Switch to the Plan view.</p>}
        >
          <SceneContent {...props} />
        </Canvas>
      </div>
    </>
  );
}
