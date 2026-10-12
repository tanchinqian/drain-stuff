import * as THREE from 'three';
import { cadKit, palette, type ModelGroups } from './geometry';
export function createCompostParts(): ModelGroups {
  const { groups, box, mesh, pipe, grate } = cadKit([
    'intake',
    'bay',
    'bulking',
    'cover',
    'base',
    'sump',
    'curing',
    'weather',
  ]);
  box('base', [7.8, 0.17, 3.8], [0, -0.3, 0], palette.well).rotation.z = -0.025;
  for (const z of [-1.85, 1.85]) box('base', [7.8, 0.13, 0.1], [0, -0.2, z], palette.ink3);
  box('base', [4.8, 0.08, 0.12], [-0.3, -0.15, 1.45], palette.ink3);
  box('bay', [2.5, 0.12, 2.3], [-0.8, -0.12, 0], palette.well);
  for (const z of [-1.15, 1.15]) box('bay', [2.5, 1.45, 0.12], [-0.8, 0.55, z], palette.heat2);
  box('bay', [0.12, 1.45, 2.3], [-2.05, 0.55, 0], palette.heat2);
  const pile = mesh(
    'bay',
    new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    0x94714f,
    [-0.8, -0.02, 0],
  );
  pile.scale.set(1.1, 1.1, 0.92);
  for (let i = 0; i < 30; i++) {
    const a = i * 2.4;
    mesh('bay', new THREE.IcosahedronGeometry(0.055, 0), i % 2 ? palette.well : palette.heat2, [
      -0.8 + Math.cos(a) * 0.85,
      0.13 + (i % 6) * 0.13,
      Math.sin(a) * 0.65,
    ]);
  }
  for (const x of [-2.1, 0.5])
    for (const z of [-1.2, 1.2]) box('cover', [0.06, 1.8, 0.06], [x, 0.85, z], palette.ink2);
  const roof = box('cover', [2.9, 0.045, 2.65], [-0.8, 1.75, 0], palette.heat0);
  roof.rotation.x = 0.08;
  box('intake', [1.1, 0.12, 1.1], [-3.4, 0.05, -0.6], palette.ink2);
  box('intake', [0.85, 0.8, 0.85], [-3.4, 0.51, -0.6], palette.heat0);
  box('intake', [0.36, 0.25, 0.08], [-3.4, 0.98, -0.04], palette.ink);
  pipe('intake', 1, 0.025, [-3.95, 0.55, -0.8], true);
  box('intake', [0.22, 0.14, 0.15], [-3.95, 1.1, -0.8], palette.ink2);
  box('bulking', [1.25, 0.95, 1.3], [-3.1, 0.34, 1.0], palette.heat2);
  for (let i = 0; i < 15; i++)
    box(
      'bulking',
      [0.25, 0.035, 0.05],
      [-3.5 + (i % 4) * 0.22, 0.85 + (i % 3) * 0.02, 0.6 + Math.floor(i / 4) * 0.17],
      palette.well,
    ).rotation.y = i * 0.4;
  box('sump', [0.95, 0.12, 0.95], [1.6, -0.57, 1.5], palette.well);
  for (const x of [1.13, 2.07]) box('sump', [0.1, 0.65, 0.95], [x, -0.26, 1.5], palette.well);
  for (const z of [1.03, 1.97]) box('sump', [0.95, 0.65, 0.1], [1.6, -0.26, z], palette.well);
  grate('sump', 1.6, 0.09, 1.5, 0.95, 0.95);
  box('curing', [1.6, 0.08, 1.8], [2.4, -0.09, 0], palette.well);
  const curing = mesh(
    'curing',
    new THREE.SphereGeometry(0.65, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    palette.heat2,
    [2.4, -0.04, 0],
  );
  curing.scale.set(1, 0.7, 1.15);
  pipe('weather', 1.5, 0.035, [3.2, 0.5, -0.8], true);
  mesh(
    'weather',
    new THREE.CylinderGeometry(0.14, 0.06, 0.2, 16, 1, true),
    palette.heat0,
    [3.2, 1.28, -0.8],
  );
  box('weather', [0.16, 0.24, 0.06], [3.2, 0.95, -0.6], palette.ink2);
  Object.values(groups).forEach((g) => {
    if (g) g.userData.localBounds = new THREE.Box3().setFromObject(g);
  });
  return groups;
}
