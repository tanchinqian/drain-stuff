import * as THREE from 'three';
import type { PartId } from '../api/types';
import type { PhysicsConfig } from '../simulation/physics/config';
import { cadKit, palette, type ModelGroups } from './geometry';
import { drainDesign } from '../simulation/physics/design';

export function channelPrism(length: number, width: number, depth: number, side = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2 + side * depth, depth);
  shape.lineTo(-width / 2 - side * depth, depth);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-length / 2, 0, 0);
  return geometry;
}
function hatch(kind: 'soil' | 'sand' | 'gravel' | 'mulch' | 'concrete', color: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#6f665a';
  ctx.fillStyle = '#6f665a';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 16; i++) {
    const x = (i * 19 + 7) % 64,
      y = (i * 29 + 11) % 64;
    ctx.beginPath();
    if (kind === 'gravel') {
      ctx.ellipse(x, y, 3 + (i % 3), 2 + (i % 2), i, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 'concrete') {
      ctx.moveTo(i * 8 - 64, 0);
      ctx.lineTo(i * 8, 64);
      ctx.stroke();
    } else if (kind === 'mulch') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 2);
      ctx.stroke();
    } else {
      ctx.arc(x, y, kind === 'soil' ? 1.1 : 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function finish(groups: ModelGroups) {
  Object.values(groups).forEach((g) => {
    if (g) g.userData.localBounds = new THREE.Box3().setFromObject(g);
  });
  return groups;
}
export function createSwaleGeometry(c: PhysicsConfig): ModelGroups {
  const ids: PartId[] = [
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
  ];
  const k = cadKit(ids),
    v = c.values,
    d = drainDesign(c),
    l = d.length,
    w = d.bedWidth,
    m = d.mediaDepth,
    t = d.transitionDepth,
    g = d.gravelDepth,
    bottom = d.bottomY,
    crest = d.depressionDepth;
  const layer = (
    id: PartId,
    depth: number,
    y: number,
    color: number,
    kind: Parameters<typeof hatch>[0],
  ) => {
    let mesh;
    if (id === 'drainage') {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -depth / 2);
      shape.lineTo(w / 2, -depth / 2);
      shape.lineTo(w / 2, depth / 2);
      shape.lineTo(-w / 2, depth / 2);
      shape.closePath();
      const bore = new THREE.Path();
      bore.absarc(0, 0, d.pipeDiameter * 0.6, 0, Math.PI * 2, true);
      shape.holes.push(bore);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false });
      geometry.rotateY(Math.PI / 2);
      geometry.translate(-l / 2, 0, 0);
      mesh = k.mesh(id, geometry, color, [0, y, 0]);
    } else mesh = k.box(id, [l, depth, w], [0, y, 0], color);
    mesh.material.map = hatch(kind, color);
  };
  layer('media', m, -m / 2 - 0.05, 0xc9b28e, 'soil');
  layer('transition', t, -m - t / 2 - 0.05, 0xe8dec6, 'sand');
  layer('drainage', g, bottom + g / 2, 0xc5beaa, 'gravel');
  layer('mulch', 0.05, -0.025, 0xbba07c, 'mulch');
  if (d.nativeDepth > 0)
    layer('media', d.nativeDepth, bottom - d.nativeDepth / 2, 0x9d8465, 'soil');
  // Banks define the 1:z section around the actual bottom width.
  for (const sign of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo((sign * w) / 2, 0);
    shape.lineTo(sign * (w / 2 + v.sideSlope.value * crest), crest);
    shape.lineTo(sign * (w / 2 + d.sideSlope * crest + 0.3), crest);
    shape.lineTo(sign * (w / 2 + d.sideSlope * crest + 0.3), bottom);
    shape.lineTo((sign * w) / 2, bottom);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-l / 2, 0, 0);
    k.mesh('media', geometry, 0xb9a080, [0, 0, 0]).material.map = hatch('soil', 0xb9a080);
  }
  const envelope = k.mesh(
    'ponding',
    channelPrism(l, w, crest, v.sideSlope.value),
    palette.heat0,
    [0, 0, 0],
    0.035,
  );
  envelope.material.depthWrite = false;
  envelope.visible = false;
  const inletX = -l / 2 - 0.4;
  for (const z of [-0.45, 0.45])
    k.box('inlet', [0.8, 0.35, 0.12], [inletX, 0.05, z], palette.well).material.map = hatch(
      'concrete',
      palette.well,
    );
  k.box('inlet', [0.8, 0.08, 1], [inletX, -0.16, 0], palette.well);
  k.box(
    'pretreat',
    [0.65, 0.04 + v.sediment.value, 1.1],
    [-l / 2 + 0.35, (0.04 + v.sediment.value) / 2, 0],
    palette.heat2,
  );
  for (const z of [-0.6, 0.6])
    k.box('pretreat', [0.8, 0.12, 0.06], [-l / 2 + 0.35, 0.06, z], palette.ink3);
  for (let i = 0; i < 12; i++)
    k.mesh('energy', new THREE.IcosahedronGeometry(0.07), palette.ink3, [
      -l / 2 + (i % 4) * 0.13,
      0.07,
      -0.3 + Math.floor(i / 4) * 0.22,
    ]);
  const sock = k.mesh('sock', new THREE.CylinderGeometry(0.1, 0.1, 1.2, 24), palette.heat1, [
    -l / 2 + 0.8,
    0.1,
    0,
  ]);
  sock.rotation.x = Math.PI / 2;
  sock.material.map = hatch('mulch', palette.heat1);
  for (const x of [-l / 6, l / 6]) k.box('checkdam', [0.08, 0.12, w], [x, 0.06, 0], palette.well);
  const pipeY = bottom + g / 2,
    r = v.pipeDiameter.value / 2;
  const pipe = k.pipe('underdrain', l, r, [0, pipeY, 0]);
  pipe.rotation.z = Math.PI / 2 - Math.atan(v.pipeSlope.value);
  for (let i = 0; i < 24; i++) {
    const x = -l / 2 + ((i + 0.5) * l) / 24;
    for (const sign of [-1, 1]) {
      const hole = k.mesh('underdrain', new THREE.CircleGeometry(0.007, 8), palette.ink, [
        x,
        pipeY - x * v.pipeSlope.value,
        sign * r * 1.01,
      ]);
      if (sign < 0) hole.rotation.y = Math.PI;
    }
  }
  const cleanX = l / 2 - 0.35;
  k.pipe('cleanout', 0.35 - pipeY, r, [cleanX, (0.35 + pipeY) / 2, 0], true);
  k.ring('cleanout', r * 1.2, [cleanX, 0.35, 0], true);
  k.mesh('cleanout', new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.025, 20), palette.ink, [
    cleanX,
    0.36,
    0,
  ]);
  k.pipe('overflow', crest - pipeY, 0.15, [l / 2 - 0.5, (crest + pipeY) / 2, -w / 3], true);
  k.grate('overflow', l / 2 - 0.5, crest, -w / 3, 0.32, 0.32);
  k.pipe('outfall', 1.5, r, [l / 2 + 0.75, pipeY - (l / 2) * v.pipeSlope.value, 0]);
  k.box('outfall', [0.1, 0.8, 1], [l / 2 + 1.45, pipeY + 0.2, 0], palette.well).material.map =
    hatch('concrete', palette.well);
  k.box('liner', [l, 0.012, w], [0, bottom - 0.015, 0], palette.ink3, 0.35);
  const blades = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.015, 0.18, 3),
      k.mat(0x89774d),
      60,
    ),
    obj = new THREE.Object3D();
  for (let i = 0; i < 60; i++) {
    obj.position.set((((i * 37) % 61) / 61 - 0.5) * l, 0.14, (((i * 19) % 59) / 59 - 0.5) * w);
    obj.rotation.z = ((i % 3) - 1) * 0.15;
    obj.updateMatrix();
    blades.setMatrixAt(i, obj.matrix);
  }
  k.groups.planting!.add(blades);
  return finish(k.groups);
}
export function createInletGeometry(c: PhysicsConfig): ModelGroups {
  const k = cadKit(['inlet', 'pretreat', 'sock', 'outfall', 'overflow', 'ponding']),
    v = c.values;
  const l = v.length.value,
    w = v.width.value,
    depth = v.crest.value;
  k.box('inlet', [l + 0.2, 0.1, w + 0.2], [0, -0.05, 0], palette.well);
  for (const z of [-w / 2 - 0.05, w / 2 + 0.05])
    k.box('inlet', [l + 0.2, depth, 0.1], [0, depth / 2, z], palette.well).material.map = hatch(
      'concrete',
      palette.well,
    );
  k.box('inlet', [0.1, depth, w], [-l / 2 - 0.05, depth / 2, 0], palette.well);
  k.grate('inlet', 0, depth + 0.02, 0, l, w);
  k.box(
    'pretreat',
    [l, Math.max(0.015, v.sediment.value), w],
    [0, Math.max(0.015, v.sediment.value) / 2, 0],
    palette.heat2,
  );
  for (let i = 0; i < 8; i++)
    k.box(
      'sock',
      [0.015, depth, 0.025],
      [l / 2 - 0.15, depth / 2, -w * 0.35 + i * w * 0.1],
      palette.ink3,
    );
  k.pipe('outfall', 1.4, v.pipeDiameter.value / 2, [l / 2 + 0.7, v.pipeDiameter.value / 2, 0]);
  k.box('outfall', [0.1, depth, w], [l / 2 + 0.05, depth / 2, 0], palette.well);
  k.box('overflow', [0.5, 0.04, w], [l / 2 + 0.35, depth, 0], palette.well2);
  k.box('ponding', [l, depth, w], [0, depth / 2, 0], palette.well, 0.02);
  return finish(k.groups);
}
export function createTreePitGeometry(c: PhysicsConfig): ModelGroups {
  const groups = createSwaleGeometry(c),
    tree = groups.planting!;
  tree.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    }
  });
  tree.clear();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x79624a }),
  );
  trunk.position.y = 0.6;
  tree.add(trunk);
  for (let i = 0; i < 5; i++) {
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.45, 1),
      new THREE.MeshStandardMaterial({ color: 0xa79a77, roughness: 1 }),
    );
    canopy.position.set(((i % 2) - 0.5) * 0.5, 1.3 + (i % 3) * 0.2, ((i % 3) - 1) * 0.3);
    tree.add(canopy);
  }
  // Root barrier is a distinct selectable liner group, not an impermeable hydraulic base.
  groups.liner!.clear();
  for (const z of [-c.values.width.value / 2, c.values.width.value / 2]) {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(c.values.length.value, 0.5, 0.02),
      new THREE.MeshStandardMaterial({ color: palette.ink3, transparent: true, opacity: 0.4 }),
    );
    barrier.position.set(0, -0.25, z);
    groups.liner!.add(barrier);
  }
  return finish(groups);
}
export const createPhysicsGeometry = (c: PhysicsConfig) =>
  c.kind === 'inlet'
    ? createInletGeometry(c)
    : c.kind === 'tree_pit'
      ? createTreePitGeometry(c)
      : createSwaleGeometry(c);
