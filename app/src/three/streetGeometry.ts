import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry } from 'three';
import { roofRunoffPath } from './flowPhysics';
import type { DrainDesign } from '../simulation/physics/design';

/** Visual excavation follows the assembly shell, including its inlet and outfall corridor. */
export function streetExcavation(d: DrainDesign, chamber: boolean) {
  const l = d.length / 2,
    w = chamber ? d.bedWidth / 2 + 0.1 : d.topWidth / 2 + 0.3;
  const lip = chamber ? 0.1 : 0.8,
    out = 2.25,
    neck = Math.min(w, 0.55);
  const main: [number, number][] = [
    [-l, -neck],
    [-l, -w],
    [l, -w],
    [l, -neck],
    [l + out, -neck],
    [l + out, neck],
    [l, neck],
    [l, w],
    [-l, w],
    [-l, neck],
    [-l - lip, neck],
  ];
  if (d.catchment.roofArea <= 0) return [[-l - lip, -neck], ...main] as [number, number][];
  const lot = roofRunoffPath(d)[4],
    gx = lot.end[0],
    z = lot.end[2];
  return [
    [-l - lip, neck],
    [gx - 0.215, neck],
    [gx - 0.215, z - 0.14],
    [d.length * 0.4, z - 0.14],
    [d.length * 0.4, z + 0.14],
    [gx + 0.215, z + 0.14],
    [gx + 0.215, -neck],
    ...main.slice(0, -1),
  ] as [number, number][];
}
export function streetGeometry(d: DrainDesign, chamber: boolean) {
  const points = streetExcavation(d, chamber),
    surface = d.catchment.kerbHeight,
    bottom = chamber ? -0.11 : d.bottomY - d.nativeDepth - 0.01;
  const shape = new Shape();
  shape.moveTo(-70, -70);
  shape.lineTo(70, -70);
  shape.lineTo(70, 70);
  shape.lineTo(-70, 70);
  shape.closePath();
  const hole = new Path();
  points.forEach(([x, z], i) => (i ? hole.lineTo(x, -z) : hole.moveTo(x, -z)));
  hole.closePath();
  shape.holes.push(hole);
  const top = new ShapeGeometry(shape);
  top.rotateX(-Math.PI / 2);
  top.translate(0, surface, 0);
  const vertices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i],
      [a, b] = points[(i + 1) % points.length];
    vertices.push(
      x,
      surface,
      z,
      a,
      bottom,
      b,
      a,
      surface,
      b,
      x,
      surface,
      z,
      x,
      bottom,
      z,
      a,
      bottom,
      b,
    );
  }
  const walls = new BufferGeometry();
  walls.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  walls.computeVertexNormals();
  const floorShape = new Shape();
  points.forEach(([x, z], i) => (i ? floorShape.lineTo(x, -z) : floorShape.moveTo(x, -z)));
  floorShape.closePath();
  const floor = new ShapeGeometry(floorShape);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, bottom, 0);
  return { top, walls, floor, bottom, surface };
}
