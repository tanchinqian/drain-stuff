import { useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { Plane, Quaternion, Vector3 } from 'three';
import type { DrainDesign } from '../simulation/physics/design';
import { cutRange, type CutAxis } from './sceneMetrics';
export default function CutPlane({
  design: d,
  axis,
  plane,
  visible,
  inlet,
  onChange,
  onDrag,
}: {
  design: DrainDesign;
  axis: CutAxis;
  plane: Plane;
  visible: boolean;
  inlet: boolean;
  onChange: (position: number) => void;
  onDrag: (active: boolean) => void;
}) {
  const { camera, gl } = useThree(),
    [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; position: number; dx: number; dy: number }>();
  const centre = plane.coplanarPoint(new Vector3()),
    rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), plane.normal);
  const start = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const a = centre.clone().project(camera),
      b = centre.clone().sub(plane.normal).project(camera),
      rect = gl.domElement.getBoundingClientRect();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      position: plane.constant,
      dx: ((b.x - a.x) * rect.width) / 2,
      dy: (-(b.y - a.y) * rect.height) / 2,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    onDrag(true);
  };
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = undefined;
    setDragging(false);
    onDrag(false);
    if ((e.target as Element).hasPointerCapture(e.pointerId))
      (e.target as Element).releasePointerCapture(e.pointerId);
  };
  return (
    <mesh
      name="section-cut-plane"
      position={centre}
      quaternion={rotation}
      visible={visible || dragging}
      userData={{ axis, position: plane.constant }}
      renderOrder={20000}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerMove={(e) => {
        const a = drag.current;
        if (!a) return;
        e.stopPropagation();
        const denom = a.dx * a.dx + a.dy * a.dy,
          [min, max] = cutRange(d, axis, inlet);
        if (denom > 1)
          onChange(
            Math.max(
              min,
              Math.min(
                max,
                a.position + ((e.clientX - a.x) * a.dx + (e.clientY - a.y) * a.dy) / denom,
              ),
            ),
          );
      }}
    >
      <planeGeometry
        args={[
          axis === 'Y' ? d.topWidth + 0.4 : d.length + 0.4,
          axis === 'Z' ? d.topWidth + 0.4 : d.depressionDepth - d.bottomY + 0.6,
        ]}
      />
      <meshBasicMaterial color="#b7c8bc" transparent opacity={0.12} depthWrite={false} side={2} />
      <Edges color="#526d60" lineWidth={1} />
    </mesh>
  );
}
