import * as THREE from 'three';
import type { Config, PartId } from '../api/types';
export const palette = {
  ink: 0x2f2b26,
  ink2: 0x5e564b,
  ink3: 0x6f665a,
  panel: 0xf2eee4,
  ground: 0xe9e4d8,
  well: 0xddd6c6,
  well2: 0xe2dccb,
  heat0: 0xe8dec6,
  heat1: 0xd8b978,
  heat2: 0xbc7a44,
  heat3: 0x8e3a2e,
  control: 0x7b4daf,
  decompaction: 0xb07a12,
  compost: 0xb03a78,
};
export function roofGeometry(w = 2.18, d = 1.93, h = 0.64) {
  const x = w / 2,
    z = d / 2,
    g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-x, 0, -z, x, 0, -z, 0, h, -z, -x, 0, z, x, 0, z, 0, h, z],
      3,
    ),
  );
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
  g.computeVertexNormals();
  return g;
}
export type ModelGroups = Partial<Record<PartId, THREE.Group>>;
export function cadKit(ids: PartId[]) {
  const groups: ModelGroups = Object.fromEntries(
    ids.map((id) => {
      const g = new THREE.Group();
      g.userData.partId = id;
      return [id, g];
    }),
  );
  const mat = (color: number, alpha = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: alpha < 1,
      opacity: alpha,
      depthWrite: alpha === 1,
    });
  const mesh = (
    id: PartId,
    geometry: THREE.BufferGeometry,
    color: number,
    pos: [number, number, number],
    alpha = 1,
  ) => {
    const m = new THREE.Mesh(geometry, mat(color, alpha));
    m.position.set(...pos);
    m.material.userData.baseOpacity = alpha;
    groups[id]!.add(m);
    m.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 28),
        new THREE.LineBasicMaterial({ color: palette.ink3, transparent: true, opacity: 0.6 }),
      ),
    );
    return m;
  };
  const box = (
    id: PartId,
    size: [number, number, number],
    pos: [number, number, number],
    color: number,
    alpha = 1,
  ) => mesh(id, new THREE.BoxGeometry(...size), color, pos, alpha);
  const pipe = (
    id: PartId,
    length: number,
    r: number,
    pos: [number, number, number],
    vertical = false,
  ) => {
    const m = mesh(id, new THREE.CylinderGeometry(r, r, length, 24, 1, true), palette.ink2, pos);
    if (!vertical) m.rotation.z = Math.PI / 2;
    return m;
  };
  const ring = (id: PartId, r: number, pos: [number, number, number], vertical = false) => {
    const m = mesh(id, new THREE.TorusGeometry(r, 0.025, 8, 24), palette.well, pos);
    m.rotation.x = vertical ? Math.PI / 2 : 0;
    if (!vertical) m.rotation.y = Math.PI / 2;
  };
  const grate = (id: PartId, x: number, y: number, z: number, width = 0.7, depth = 0.7) => {
    for (let i = 0; i < 9; i++)
      box(id, [0.035, 0.06, depth], [x - width / 2 + (i * width) / 8, y, z], palette.ink2);
    for (const side of [-1, 1])
      box(id, [width, 0.07, 0.05], [x, y, z + (side * depth) / 2], palette.ink3);
    for (const dx of [-width / 2, width / 2])
      for (const dz of [-depth / 2, depth / 2])
        mesh(id, new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6), palette.ink, [
          x + dx,
          y + 0.05,
          z + dz,
        ]);
  };
  return { groups, mesh, box, pipe, ring, grate, mat };
}
const frac = (i: number) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function createDrainParts(featureId: string, dimensions: Config['schematic']): ModelGroups {
  const k = cadKit([
    'inlet',
    'energy',
    'pretreat',
    'sock',
    'checkdam',
    'ponding',
    'mulch',
    'planting',
    'media',
    'transition',
    'drainage',
    'underdrain',
    'cleanout',
    'liner',
    'overflow',
    'outfall',
  ]);
  const { groups, box, mesh, pipe, ring, grate, mat } = k;
  const d = dimensions,
    l = d.lengthM,
    w = d.widthM;
  const bottom = -d.mediaDepthM - d.transitionDepthM - d.drainageDepthM;
  box(
    'media',
    [l, d.mediaDepthM, w],
    [0, -d.mediaDepthM / 2, 0],
    featureId === 'S1' ? 0xc995b0 : featureId === 'S2' ? 0xc7a65a : 0xbca88e,
  );
  box(
    'transition',
    [l, d.transitionDepthM, w],
    [0, -d.mediaDepthM - d.transitionDepthM / 2, 0],
    palette.well,
  );
  for (let i = 0; i < 20; i++)
    box(
      'transition',
      [0.018, 0.006, w],
      [-l / 2 + (i * l) / 19, -d.mediaDepthM + 0.005, 0],
      palette.ink3,
    );
  box('drainage', [l, d.drainageDepthM, w], [0, bottom + d.drainageDepthM / 2, 0], 0xc3b6a0);
  const stones = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.065, 0),
      mat(palette.ink3),
      180,
    ),
    o = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    o.position.set(
      (frac(i + 10) - 0.5) * l,
      bottom + d.drainageDepthM + 0.02,
      (frac(i + 150) - 0.5) * w,
    );
    o.scale.setScalar(0.6 + frac(i + 200));
    o.updateMatrix();
    stones.setMatrixAt(i, o.matrix);
  }
  groups.drainage!.add(stones);
  box('mulch', [l, d.mulchDepthM, w], [0, d.mulchDepthM / 2, 0], palette.heat0);
  const blades = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.028, 0.24, 3),
    mat(0x9f8854),
    130,
  );
  for (let i = 0; i < 130; i++) {
    o.position.set((frac(i + 700) - 0.5) * l, d.mulchDepthM + 0.12, (frac(i + 900) - 0.5) * w);
    o.rotation.set(0.1, frac(i) * Math.PI, 0.12);
    o.scale.setScalar(0.7 + frac(i + 40));
    o.updateMatrix();
    blades.setMatrixAt(i, o.matrix);
  }
  groups.planting!.add(blades);
  box(
    'ponding',
    [l * 0.7, d.pondingDepthM, w * 0.58],
    [0, d.mulchDepthM + d.pondingDepthM / 2, 0],
    palette.heat1,
    0.18,
  );
  for (const z of [-w / 2, w / 2])
    box('liner', [l + 0.08, -bottom, 0.03], [0, bottom / 2, z], palette.ink3, 0.35);
  box('liner', [l + 0.08, 0.03, w + 0.08], [0, bottom, 0], palette.ink3, 0.35);
  pipe('underdrain', l, d.pipeDiameterM / 2, [0, bottom + d.drainageDepthM / 2, 0]);
  for (let i = 0; i < 25; i++) {
    const x = -l / 2 + (i * l) / 24;
    ring('underdrain', d.pipeDiameterM / 2, [x, bottom + d.drainageDepthM / 2, 0]);
    for (const z of [-1, 1])
      mesh('underdrain', new THREE.CylinderGeometry(0.018, 0.018, 0.035, 8), palette.ink, [
        x,
        bottom + d.drainageDepthM / 2,
        (z * d.pipeDiameterM) / 2,
      ]).rotation.x = Math.PI / 2;
  }
  const inletX = -l / 2 - 0.65;
  box('inlet', [1.1, 0.14, 1.25], [inletX, -0.6, 0], palette.well);
  for (const z of [-0.58, 0.58]) box('inlet', [1.1, 1.05, 0.12], [inletX, -0.08, z], palette.well);
  box('inlet', [0.13, 1.05, 1.25], [inletX - 0.49, -0.08, 0], palette.well);
  grate('inlet', inletX, 0.47, 0, 1.1, 1.25);
  box('pretreat', [0.8, 0.1, 1.4], [-l / 2 + 0.15, 0.1, 0], palette.heat2);
  for (const z of [-0.7, 0.7])
    box('pretreat', [0.8, 0.18, 0.06], [-l / 2 + 0.15, 0.15, z], palette.well);
  for (let i = 0; i < 18; i++)
    mesh('energy', new THREE.IcosahedronGeometry(0.14, 0), palette.ink3, [
      inletX + 0.05 + (i % 6) * 0.16,
      -0.36,
      -0.35 + Math.floor(i / 6) * 0.25,
    ]);
  const sock = mesh(
    'sock',
    new THREE.CylinderGeometry(0.16, 0.16, 1.6, 24, 1, true),
    palette.heat1,
    [-l / 2 + 0.8, 0.26, 0],
  );
  sock.rotation.x = Math.PI / 2;
  for (let i = 0; i < 15; i++) {
    const m = mesh('sock', new THREE.TorusGeometry(0.16, 0.008, 6, 24), palette.ink2, [
      -l / 2 + 0.8,
      0.26,
      -0.75 + i * 0.107,
    ]);
    m.rotation.z = 0;
  }
  for (const x of [-0.65, 0.65]) box('checkdam', [0.12, 0.25, w * 0.7], [x, 0.23, 0], palette.ink2);
  pipe('cleanout', -bottom + 0.55, 0.09, [1.3, (bottom + 0.55) / 2, 0.9], true);
  ring('cleanout', 0.13, [1.3, 0.55, 0.9], true);
  mesh(
    'cleanout',
    new THREE.CylinderGeometry(0.135, 0.135, 0.07, 20),
    palette.ink2,
    [1.3, 0.59, 0.9],
  );
  pipe('overflow', -bottom + 0.8, 0.25, [1.65, (bottom + 0.8) / 2, -0.7], true);
  grate('overflow', 1.65, 0.82, -0.7, 0.63, 0.63);
  pipe('outfall', 2, d.pipeDiameterM / 2, [l / 2 + 1, bottom + d.drainageDepthM / 2, 0]);
  for (const x of [l / 2, l / 2 + 0.7, l / 2 + 2]) {
    ring('outfall', d.pipeDiameterM / 2 + 0.04, [x, bottom + d.drainageDepthM / 2, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const m = mesh('outfall', new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6), palette.ink, [
        x,
        bottom + d.drainageDepthM / 2 + Math.cos(a) * (d.pipeDiameterM / 2 + 0.04),
        Math.sin(a) * (d.pipeDiameterM / 2 + 0.04),
      ]);
      m.rotation.z = Math.PI / 2;
    }
  }
  Object.values(groups).forEach((g) => {
    if (g) g.userData.localBounds = new THREE.Box3().setFromObject(g);
  });
  return groups;
}
