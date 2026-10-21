import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { placeLabels } from './visibility';
export interface SceneLabel {
  id: string;
  text: string;
  anchor: [number, number, number];
}
export default function SceneLabels({ labels }: { labels: SceneLabel[] }) {
  const { camera, size } = useThree();
  const [placed, setPlaced] = useState<ReturnType<typeof placeLabels>>([]);
  const last = useRef(''),
    timer = useRef(0), source = useRef('');
  useFrame((_, delta) => {
    timer.current += delta;
    const signature=JSON.stringify(labels);
    if (timer.current < 0.1 && signature===source.current) return;
    source.current=signature;
    timer.current = 0;
    const points = labels
      .map((label) => {
        const p = new Vector3(...label.anchor).project(camera);
        return { ...label, x: ((p.x + 1) * size.width) / 2, y: ((1 - p.y) * size.height) / 2 };
      })
      .filter((p) => p.x > -size.width && p.x < size.width * 2);
    const next = placeLabels(points, size.width, size.height);
    const key = JSON.stringify(next);
    if (key !== last.current) {
      last.current = key;
      setPlaced(next);
    }
  });
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[25, 0]}>
      <svg
        className="model-label-layout"
        width={size.width}
        height={size.height}
        aria-label="Model annotations"
      >
        {placed.map((p) => (
          <g key={p.id} data-scene-label={p.id}>
            <path
              d={`M${p.x},${p.y} L${p.left + p.width / 2},${p.top + p.height / 2}`}
              fill="none"
              stroke="#6f665a"
              strokeWidth="1"
            />
            <circle cx={p.x} cy={p.y} r="2" fill="#6f665a" />
            <rect
              x={p.left}
              y={p.top}
              width={p.width}
              height={p.height}
              rx="3"
              fill="#f4f0e6"
              stroke="#cfc5af"
            />
            <title>{p.text}</title>
            <text x={p.left + 8} y={p.top + 23} fill="#2f2b26" fontSize="11">
              {p.text.length > 32 ? p.text.slice(0, 29) + '…' : p.text}
            </text>
          </g>
        ))}
      </svg>
    </Html>
  );
}
