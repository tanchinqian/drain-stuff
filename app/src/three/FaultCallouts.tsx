import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Fault } from '../api/types';
import { faultConfirmed, faultTitle } from './faultCues';
export default function FaultCallouts({
  items,
  onSelect,
  pulse,
}: {
  items: { fault: Fault; anchor: [number, number, number] }[];
  onSelect: (fault: Fault) => void;
  pulse?: string;
}) {
  const { camera, size } = useThree(),
    timer = useRef(0);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.1) return;
    timer.current = 0;
    setPoints(
      items.map(({ anchor }) => {
        const p = new Vector3(...anchor).project(camera);
        return { x: ((p.x + 1) * size.width) / 2, y: ((1 - p.y) * size.height) / 2 };
      }),
    );
  });
  return (
    <Html
      fullscreen
      calculatePosition={() => [size.width / 2, size.height / 2]}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[26, 0]}
    >
      <svg width={size.width} height={size.height} aria-label="Drain fault callouts">
        {items.map(({ fault }, i) => {
          const p = points[i],
            filled = faultConfirmed(fault),
            width = Math.min(212, size.width - 24),
            left = p && p.x < size.width / 2 ? 12 : size.width - width - 12,
            top = 50 + i * 47;
          return (
            <g key={fault.id} data-fault-badge={fault.id} data-confirmed={filled}>
              {p && (
                <path
                  d={`M${p.x} ${p.y}L${left} ${top + 20}`}
                  stroke={filled ? '#8e3a2e' : '#886317'}
                  strokeWidth="1.5"
                  fill="none"
                />
              )}
              <g
                role="button"
                tabIndex={0}
                aria-label={`Show fault ${fault.id}: ${faultTitle(fault)}`}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => onSelect(fault)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(fault);
                  }
                }}
              >
                <rect
                  key={pulse === fault.id ? pulse + 'pulse' : 'still'}
                  className={pulse === fault.id ? 'fault-badge-pulse' : ''}
                  x={left}
                  y={top}
                  width={width}
                  height="39"
                  rx="3"
                  fill={filled ? '#8e3a2e' : '#f2eee4'}
                  stroke={filled ? '#8e3a2e' : '#886317'}
                  strokeWidth="2"
                />
                <path
                  d={`M${left + 13} ${top + 9}l8 15h-16Z`}
                  stroke={filled ? '#fff4e7' : '#886317'}
                  fill="none"
                  strokeWidth="1.5"
                />
                <text
                  x={left + 29}
                  y={top + 16}
                  fontSize="12"
                  fill={filled ? '#fff4e7' : '#2f2b26'}
                >
                  {i + 1} · {faultTitle(fault)}
                </text>
                <text
                  x={left + 29}
                  y={top + 31}
                  fontSize="10"
                  fill={filled ? '#fff4e7' : '#5e564b'}
                >
                  {filled ? 'Confirmed' : 'Detected'} · Severity {fault.severity}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </Html>
  );
}
