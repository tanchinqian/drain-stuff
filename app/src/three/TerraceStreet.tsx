import { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import {
  InstancedMesh,
  Object3D,
  BoxGeometry,
  IcosahedronGeometry,
  CylinderGeometry,
  type BufferGeometry,
  Color,
} from 'three';
import type { DrainDesign } from '../simulation/physics/design';
import { surfaceMaps, variation, type Surface } from './sceneMaterials';
type Item = { p: [number, number, number]; s: [number, number, number]; r?: number };
function Batch({
  name,
  items,
  colour,
  kind = 'concrete',
  shape = 'box',
  wet = 0,
}: {
  name: string;
  items: Item[];
  colour: string;
  kind?: Surface;
  shape?: 'box' | 'tree' | 'pole';
  wet?: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo<BufferGeometry>(
    () =>
      shape === 'tree'
        ? new IcosahedronGeometry(1, 1)
        : shape === 'pole'
          ? new CylinderGeometry(0.5, 0.6, 1, 8)
          : new BoxGeometry(),
    [shape],
  );
  const maps = useMemo(() => surfaceMaps(kind, new Color(colour).getHex()), [kind, colour]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const o = new Object3D();
    items.forEach((item, i) => {
      o.position.set(...item.p);
      o.scale.set(...item.s);
      o.rotation.set(0, item.r ?? 0, 0);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      mesh.current!.setColorAt(
        i,
        new Color('white').multiplyScalar(0.92 + variation(i + 70) * 0.12),
      );
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [items]);
  useEffect(
    () => () => {
      geometry.dispose();
      maps.map.dispose();
      maps.normalMap.dispose();
    },
    [geometry, maps],
  );
  return (
    <instancedMesh
      name={name}
      ref={mesh}
      args={[geometry, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        {...maps}
        color={new Color('white').multiplyScalar(1 - wet * 0.2)}
        roughness={0.86 - wet * 0.35}
      />
    </instancedMesh>
  );
}
export default function TerraceStreet({
  design: d,
  low,
  wet,
}: {
  design: DrainDesign;
  low: boolean;
  wet: number;
}) {
  const kit = useMemo(() => {
    const wall: Item[] = [],
      roof: Item[] = [],
      trim: Item[] = [],
      glass: Item[] = [],
      paving: Item[] = [],
      vegetation: Item[] = [],
      trunks: Item[] = [],
      markings: Item[] = [],
      cars: Item[] = [],
      bins: Item[] = [];
    const width = Math.max(4.8, d.length * 0.8),
      front = -d.topWidth / 2 - d.catchment.footpathWidth - 0.35,
      ground = d.catchment.kerbHeight;
    const houses = low ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
    for (const house of houses) {
      const x = house * width;
      wall.push({ p: [x, ground + 2.4, front - 3], s: [width - 0.06, 4.8, 6] });
      roof.push({ p: [x, ground + 4.9, front - 3], s: [width + 0.14, 0.18, 6.24] });
      trim.push({ p: [x, ground + 4.78, front + 0.09], s: [width, 0.09, 0.09] });
      if (house !== 0 || d.catchment.roofArea === 0)
        trim.push({ p: [x - width * 0.425, ground + 2.4, front + 0.14], s: [0.065, 4.8, 0.065] });
      paving.push(
        { p: [x, ground + 0.025, front + 0.5], s: [width - 0.06, 0.05, 0.3] },
        { p: [x - width * 0.2, ground + 0.025, front + 0.18], s: [0.75, 0.05, 0.36] },
      );
      for (const side of [-1, 1]) {
        wall.push({
          p: [x + side * (width / 2 - 0.06), ground + 0.5, front + 0.2],
          s: [0.12, 1, 0.8],
        });
        glass.push({
          p: [x + side * width * 0.25, ground + 3.4, front + 0.018],
          s: [0.72, 1, 0.04],
        });
        trim.push({
          p: [x + side * width * 0.25, ground + 3.95, front + 0.04],
          s: [0.8, 0.07, 0.06],
        });
      }
      roof.push({ p: [x - width * 0.2, ground + 1.05, front + 0.025], s: [0.7, 2.1, 0.055] });
      glass.push({ p: [x + width * 0.23, ground + 1.3, front + 0.025], s: [1, 0.8, 0.055] });
      for (let k = 0; k < 8; k++)
        trim.push({
          p: [x - width * 0.42 + k * width * 0.12, ground + 0.42, front + 0.65],
          s: [0.025, 0.84, 0.03],
        });
      trim.push({ p: [x, ground + 0.85, front + 0.65], s: [width * 0.9, 0.04, 0.04] });
      bins.push({ p: [x + width * 0.42, ground + 0.25, front + 0.48], s: [0.28, 0.5, 0.27] });
    }
    // Frontage road meets the existing side road; both extend beyond the camera's drain framing.
    const junction = d.topWidth / 2 + 3.3,
      sideRoad = -d.length / 2 - d.catchment.roadWidth / 2 - 0.7;
    for (let i = 0; i < 12; i++)
      markings.push({ p: [-12 + i * 2.3, ground + 0.007, junction], s: [0.9, 0.008, 0.06] });
    for (let i = 0; i < 4; i++)
      markings.push({
        p: [sideRoad - 0.35 + i * 0.3, ground + 0.009, junction - 1.05],
        s: [0.12, 0.01, 1.2],
      });
    for (let i = 0; i < 7; i++) {
      const x = -15 + i * 5,
        z = junction + 7 + (i % 2) * 0.5,
        h = 2.1 + variation(i + 80) * 0.8;
      trunks.push({ p: [x, ground + h / 2, z], s: [0.16, h, 0.16] });
      for (let k = 0; k < 3; k++)
        vegetation.push({
          p: [x + (k - 1) * 0.5, ground + h + 0.5 + (k % 2) * 0.5, z],
          s: [0.8, 1, 0.8],
        });
    }
    for (const x of [-9, 0, 9])
      trim.push(
        { p: [x, ground + 2, junction + 2], s: [0.08, 4, 0.08] },
        { p: [x + 0.2, ground + 4, junction + 2], s: [0.5, 0.08, 0.2] },
      );
    for (let i = 0; i < 20; i++)
      vegetation.push({ p: [-15 + i * 1.5, ground + 0.35, front - 6.6], s: [0.55, 0.45, 0.45] });
    // Distant silhouettes soften the horizon without additional detailed buildings.
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      vegetation.push({
        p: [Math.cos(a) * 45, 3 + variation(i) * 2, Math.sin(a) * 45],
        s: [3, 3 + variation(i) * 2, 2.5],
      });
    }
    for (const x of [-8, 8]) {
      cars.push(
        { p: [x, ground + 0.45, junction + 1], s: [2.5, 0.55, 1.1] },
        { p: [x - 0.15, ground + 0.9, junction + 1], s: [1.4, 0.5, 1] },
      );
      for (const a of [-1, 1])
        for (const b of [-1, 1])
          trim.push({
            p: [x + a * 0.8, ground + 0.23, junction + 1 + b * 0.56],
            s: [0.4, 0.4, 0.12],
          });
    }
    return {
      wall,
      roof,
      trim,
      glass,
      paving,
      vegetation,
      trunks,
      markings,
      cars,
      bins,
      junction,
      front,
      width,
      count: houses.length,
    };
  }, [
    d.length,
    d.topWidth,
    d.catchment.roofArea,
    d.catchment.roadWidth,
    d.catchment.kerbHeight,
    low,
  ]);
  return (
    <group name="terrace-street" userData={{ houseCount: kit.count, typical: true }}>
      <Batch name="terrace-walls" items={kit.wall} colour="#dbd6c7" wet={wet} />
      <Batch name="terrace-roofs-doors" items={kit.roof} colour="#848a80" kind="paving" wet={wet} />
      <Batch name="terrace-trim-gates" items={kit.trim} colour="#56625b" />
      <Batch name="terrace-windows" items={kit.glass} colour="#788b8c" />
      <Batch name="terrace-porches" items={kit.paving} colour="#bfbdae" kind="paving" wet={wet} />
      <Batch
        name="street-trees-shrubs"
        items={kit.vegetation}
        colour="#809373"
        kind="grass"
        shape="tree"
        wet={wet}
      />
      <Batch
        name="street-tree-trunks"
        items={kit.trunks}
        colour="#88745e"
        kind="soil"
        shape="pole"
      />
      <Batch name="road-markings" items={kit.markings} colour="#dedbc8" />
      <Batch name="parked-vehicles" items={kit.cars} colour="#9ca7a2" />
      <Batch name="household-bins" items={kit.bins} colour="#6e806e" />
      <Batch
        name="frontage-road"
        items={[{ p: [0, d.catchment.kerbHeight - 0.05, kit.junction], s: [36, 0.1, 2.8] }]}
        colour="#737d7b"
        kind="asphalt"
        wet={wet}
      />
      <Batch
        name="back-lane"
        items={[
          {
            p: [0, d.catchment.kerbHeight - 0.035, kit.front - 7],
            s: [kit.width * kit.count, 0.07, 1],
          },
        ]}
        colour="#b8b6a7"
        kind="paving"
        wet={wet}
      />
      <Batch
        name="frontage-kerbs"
        items={[-1, 1].map((side) => ({
          p: [
            (18 - d.length / 2 - 0.5) / 2,
            d.catchment.kerbHeight + 0.06,
            kit.junction + side * 1.45,
          ],
          s: [18 + d.length / 2 + 0.5, 0.12, 0.13],
        }))}
        colour="#c7c6b8"
        wet={wet}
      />
    </group>
  );
}
