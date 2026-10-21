import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Object3D,
  Shape,
  Path,
  ShapeGeometry,
  type Texture,
} from 'three';
import { drainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
import { flowSpeed } from './visibility';
import { WaterMaterial } from './WaterEffects';
import FlowTrace from './FlowTrace';
import { contextAtlas, sceneColours, surfaceMaps, variation, type Surface } from './sceneMaterials';
import { surfaceWetness } from './sceneMetrics';

function SurfaceBox({
  name,
  position,
  size,
  kind,
  wet = 0,
  colour,
}: {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  kind: Surface;
  wet?: number;
  colour?: number;
}) {
  const maps = useMemo(() => surfaceMaps(kind, colour), [kind, colour]);
  useEffect(
    () => () => {
      maps.map.dispose();
      maps.normalMap.dispose();
    },
    [maps],
  );
  return (
    <mesh name={name} position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        {...maps}
        color={new Color('white').multiplyScalar(1 - wet * 0.38)}
        roughness={0.95 - wet * 0.55}
      />
    </mesh>
  );
}
function Instances({
  name,
  items,
  colour,
}: {
  name: string;
  items: { p: [number, number, number]; s: [number, number, number]; r?: number }[];
  colour: string;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current!,
      o = new Object3D();
    items.forEach((v, i) => {
      o.position.set(...v.p);
      o.scale.set(...v.s);
      o.rotation.set(0, v.r ?? 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [JSON.stringify(items)]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      name={name}
      castShadow
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial color={colour} roughness={0.8} />
    </instancedMesh>
  );
}
function AtlasBox({
  name,
  p,
  s,
  slot,
  map,
}: {
  name: string;
  p: [number, number, number];
  s: [number, number, number];
  slot: number;
  map: Texture;
}) {
  const geometry = useMemo(() => {
    const g = new BoxGeometry(...s),
      uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, (slot + 0.08 + uv.getX(i) * 0.84) / 3);
    return g;
  }, [s[0], s[1], s[2], slot]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name={name} position={p} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.82} />
    </mesh>
  );
}
function Terrain({
  length,
  width,
  y,
}: {
  length: number;
  width: number;
  y: number;
}) {
  const geometry = useMemo(() => {
    const s = new Shape();
    s.moveTo(-70, -70);
    s.lineTo(70, -70);
    s.lineTo(70, 70);
    s.lineTo(-70, 70);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-length / 2 - 0.65, -width / 2 - 0.2);
    hole.lineTo(-length / 2 - 0.65, width / 2 + 0.2);
    hole.lineTo(length / 2 + 2, width / 2 + 0.2);
    hole.lineTo(length / 2 + 2, -width / 2 - 0.2);
    hole.closePath();
    s.holes.push(hole);
    const g = new ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [length, width]);
  const maps = useMemo(() => surfaceMaps('grass'), []);
  useEffect(
    () => () => {
      geometry.dispose();
      maps.map.dispose();
      maps.normalMap.dispose();
    },
    [geometry, maps],
  );
  return (
    <mesh name="surrounding-terrain" geometry={geometry} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial {...maps} roughness={0.94} />
    </mesh>
  );
}
export default function CatchmentContext({
  physics,
  low,
}: {
  physics: ModelPhysics;
  low: boolean;
}) {
  const d = drainDesign(physics.config),
    c = d.catchment,
    f = physics.frame;
  const roadX = -d.length / 2 - c.roadWidth / 2 - 0.7,
    footZ = -d.topWidth / 2 - c.footpathWidth / 2;
  const wet = surfaceWetness(physics.config, f),
    q = f?.flux.inlet ?? 0;
  const roofQ = f?.links.find((l) => l.id === 'roof outlet to downpipe')?.discharge ?? 0;
  const roadQ = f?.links.find((l) => l.id === 'property drain to kerb flow')?.discharge ?? 0;
  const level = f?.network.find((n) => n.id === 'kerb flow')?.depth ?? 0;
  const ground = d.bottomY - d.nativeDepth - 0.08;
  const houseZ = footZ - c.footpathWidth / 2 - c.roofEdgeDepth / 2 - 0.25,
    houseHeight = 4.8;
  const atlas = useMemo(contextAtlas, []);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const built = (
    name: string,
    p: [number, number, number],
    s: [number, number, number],
    colour = sceneColours.wall,
  ) => (
    <AtlasBox
      key={name}
      name={name}
      p={p}
      s={s}
      slot={colour === sceneColours.trim ? 2 : colour === sceneColours.roof ? 1 : 0}
      map={atlas}
    />
  );
  const windows = Array.from({ length: 12 }, (_, i) => ({
    p: [
      ((i % 6) / 5 - 0.5) * d.length * 0.66,
      c.kerbHeight + 1.05 + Math.floor(i / 6) * 2.2,
      houseZ + c.roofEdgeDepth / 2 + 0.012,
    ] as [number, number, number],
    s: [0.34, 0.65, 0.035] as [number, number, number],
  }));
  return (
    <group
      name="catchment-context"
      userData={{ pavedArea: c.pavedArea, roofArea: c.roofArea, gutterSlope: c.gutterSlope }}
    >
      <SurfaceBox
        name="surrounding-ground"
        position={[0, ground - 0.12, 0]}
        size={[140, 0.24, 140]}
        kind="soil"
        wet={wet}
      />
      <Terrain length={d.length} width={d.topWidth} y={c.kerbHeight - 0.02} />
      <SurfaceBox
        name="excavation-plinth"
        position={[0, ground + 0.005, 0]}
        size={[d.length + 1, 0.08, d.topWidth + 1]}
        kind="soil"
        wet={wet}
      />
      <SurfaceBox
        name="road-foundation"
        position={[roadX, (ground + c.kerbHeight - 0.12) / 2, 0]}
        size={[c.roadWidth, c.kerbHeight - 0.12 - ground, Math.max(40, d.topWidth + 8)]}
        kind="soil"
        wet={wet}
      />
      <SurfaceBox
        name="path-foundation"
        position={[0, (ground + c.kerbHeight - 0.08) / 2, footZ]}
        size={[d.length + 1, c.kerbHeight - 0.08 - ground, c.footpathWidth]}
        kind="soil"
        wet={wet}
      />
      <SurfaceBox
        name="road"
        position={[roadX, c.kerbHeight - 0.06, 0]}
        size={[c.roadWidth, 0.12, Math.max(40, d.topWidth + 8)]}
        kind="asphalt"
        wet={wet}
      />
      <SurfaceBox
        name="footpath"
        position={[0, c.kerbHeight - 0.04, footZ]}
        size={[d.length + 1, 0.08, c.footpathWidth]}
        kind="paving"
        wet={wet}
      />
      {[-1, 1].map((side) => (
        <SurfaceBox
          key={side}
          name={'kerb-' + side}
          position={[-d.length / 2 - 0.65, c.kerbHeight / 2, side * (d.topWidth / 4 + 0.25)]}
          size={[0.15, c.kerbHeight, d.topWidth / 2 - 0.25]}
          kind="concrete"
          wet={wet}
        />
      ))}
      <SurfaceBox
        name="gutter"
        position={[-d.length / 2 - 0.78, c.kerbHeight - 0.018, 0]}
        size={[0.22, 0.035, d.topWidth + 5]}
        kind="concrete"
        wet={wet}
      />
      {built(
        'road-edge-line',
        [roadX - c.roadWidth / 2 + 0.15, c.kerbHeight + 0.001, 0],
        [0.06, 0.003, Math.max(40, d.topWidth + 8)],
        '#cec8b5',
      )}
      {level > 0 && (
        <mesh name="upstream-ponding" position={[roadX, c.kerbHeight + level / 2, 0]}>
          <boxGeometry args={[c.roadWidth, level, d.topWidth + 0.4]} />
          <WaterMaterial design={d} depth={level} low={low} />
        </mesh>
      )}
      {c.roofArea > 0 && (
        <group
          name="terrace-fronts"
          userData={{ contextOnly: true, roofCatchmentArea: c.roofArea }}
        >
          <SurfaceBox
            name="terrace-foundation"
            position={[0, (ground + c.kerbHeight) / 2, houseZ]}
            size={[d.length * 0.75, c.kerbHeight - ground, c.roofEdgeDepth]}
            kind="concrete"
            wet={wet}
          />
          {built(
            'terrace-wall',
            [0, c.kerbHeight + houseHeight / 2, houseZ],
            [d.length * 0.75, houseHeight, c.roofEdgeDepth],
          )}
          {built(
            'terrace-roof',
            [0, c.kerbHeight + houseHeight + 0.1, houseZ],
            [d.length * 0.8, 0.18, c.roofEdgeDepth + 0.2],
            sceneColours.roof,
          )}
          {built(
            'rain-gutter',
            [0, c.kerbHeight + houseHeight, houseZ + c.roofEdgeDepth / 2 + 0.12],
            [d.length * 0.8, 0.09, 0.1],
            sceneColours.trim,
          )}
          <Instances name="terrace-windows" items={windows} colour={sceneColours.trim} />
          <Instances
            name="terrace-doors"
            items={[-1, 0, 1].map((i) => ({
              p: [i * d.length * 0.25, c.kerbHeight + 0.95, houseZ + c.roofEdgeDepth / 2 + 0.025],
              s: [0.42, 1.9, 0.05],
            }))}
            colour={sceneColours.roof}
          />
          {built(
            'downpipe',
            [-d.length * 0.34, c.kerbHeight + houseHeight / 2, houseZ + c.roofEdgeDepth / 2 + 0.14],
            [0.065, houseHeight, 0.065],
            sceneColours.trim,
          )}
          {built(
            'downpipe-shoe',
            [-d.length * 0.34, c.kerbHeight + 0.05, (houseZ + c.roofEdgeDepth / 2 + footZ) / 2],
            [0.08, 0.08, Math.abs(footZ - houseZ - c.roofEdgeDepth / 2)],
            sceneColours.trim,
          )}
        </group>
      )}
      <FlowTrace
        name="roof-runoff"
        q={roofQ}
        velocity={flowSpeed(roofQ)}
        low={low}
        points={[
          [d.length * 0.35, c.kerbHeight + houseHeight + 0.13, houseZ + c.roofEdgeDepth / 2 + 0.17],
          [
            -d.length * 0.34,
            c.kerbHeight + houseHeight + 0.13,
            houseZ + c.roofEdgeDepth / 2 + 0.17,
          ],
          [-d.length * 0.34, c.kerbHeight + 0.07, houseZ + c.roofEdgeDepth / 2 + 0.17],
          [-d.length * 0.34, c.kerbHeight + 0.07, footZ],
          [-d.length / 2 - 0.78, c.kerbHeight + 0.015, footZ],
        ]}
      />
      <FlowTrace
        name="road-runoff"
        q={roadQ}
        velocity={flowSpeed(roadQ)}
        low={low}
        points={[
          [roadX - c.roadWidth * 0.4, c.kerbHeight + 0.01, d.topWidth / 2 + 2],
          [-d.length / 2 - 0.78, c.kerbHeight + 0.01, d.topWidth / 2 + 1],
          [-d.length / 2 - 0.78, c.kerbHeight + 0.008, 0],
          [-d.length / 2 - 0.45, 0.012, 0],
        ]}
      />
      <FlowTrace
        name="gutter-flow"
        q={q}
        velocity={flowSpeed(q)}
        low={low}
        points={[
          [-d.length / 2 - 0.78, c.kerbHeight + 0.012, footZ],
          [-d.length / 2 - 0.78, c.kerbHeight + 0.006, 0],
          [-d.length / 2 - 0.4, 0.01, 0],
        ]}
      />
      {built(
        'lamp-post',
        [roadX - c.roadWidth / 2 - 0.18, 1.5, d.topWidth / 2 + 1.4],
        [0.065, 3, 0.065],
        sceneColours.trim,
      )}
      {built(
        'lamp-head',
        [roadX - c.roadWidth / 2 + 0.03, 3, d.topWidth / 2 + 1.4],
        [0.45, 0.08, 0.18],
        sceneColours.roof,
      )}
      {built(
        'utility-pole',
        [d.length / 2 + 1, 2.5, footZ - 1],
        [0.11, 5, 0.11],
        sceneColours.trim,
      )}
      {built(
        'utility-crossbar',
        [d.length / 2 + 1, 4.7, footZ - 1],
        [0.8, 0.07, 0.07],
        sceneColours.trim,
      )}
      <Instances
        name="context-drain-covers"
        colour={sceneColours.trim}
        items={[-1, 1].map((s) => ({
          p: [roadX, c.kerbHeight + 0.004, s * (d.topWidth / 2 + 1.6)],
          s: [0.38, 0.015, 0.45],
        }))}
      />
      <Instances
        name="context-leaves"
        colour="#7e7950"
        items={Array.from({ length: 12 }, (_, i) => ({
          p: [
            roadX + variation(i) * c.roadWidth * 0.4,
            c.kerbHeight + 0.008,
            (variation(i + 30) - 0.5) * d.topWidth * 2,
          ],
          s: [0.025 + variation(i + 5) * 0.035, 0.003, 0.055],
          r: variation(i + 10) * 6,
        }))}
      />
      <SurfaceBox
        name="outfall-pool-bed"
        position={[d.length / 2 + 1.75, d.pipeY - d.pipeDiameter / 2 - 0.15, 0]}
        size={[0.9, 0.05, 0.75]}
        kind="gravel"
        wet={wet}
      />
      {(f?.flux.outfall ?? 0) > 0 && (
        <mesh
          name="outfall-pool"
          position={[d.length / 2 + 1.75, d.pipeY - d.pipeDiameter / 2 - 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.85, 0.7]} />
          <WaterMaterial design={d} depth={0.025} low={low} />
        </mesh>
      )}
    </group>
  );
}
