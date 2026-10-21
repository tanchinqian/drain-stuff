import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Plane } from 'three';
import type { ModelPhysics } from './PhysicsOverlay';
import { drainDesign } from '../simulation/physics/design';
import { damDischarge } from './materialInteractions';
import BallisticFlow from './BallisticFlow';
export default function ObstacleWater({
  physics,
  plane,
  low,
}: {
  physics: ModelPhysics;
  plane?: Plane;
  low: boolean;
}) {
  const { scene } = useThree(),
    time = useRef(0),
    d = drainDesign(physics.config);
  const [spills, setSpills] = useState<{ x: number; up: number; down: number; q: number }[]>([]);
  useFrame((_, delta) => {
    time.current += delta;
    if (time.current < 0.1 || document.hidden) return;
    time.current = 0;
    const sample = scene.userData.surfaceSample as
      ((x: number, z: number) => { height: number; depth: number; vx: number }) | undefined;
    if (!sample) return;
    const next = [-d.length / 6, d.length / 6].map((x) => {
      const a = sample(x - 0.16, 0),
        b = sample(x + 0.16, 0),
        q = damDischarge(a.height, b.height, 0.12, d.bedWidth);
      return { x, up: a.height, down: b.height, q };
    });
    scene.userData.damSpills = next;
    setSpills(next);
  });
  return (
    <group name="check-dam-water">
      {spills
        .filter((s) => s.q > 1e-9 && s.up > Math.max(0.12, s.down))
        .map((s, i) => (
          <BallisticFlow
            key={i}
            name="dam-weir-spill"
            start={[s.x + 0.04, s.up, 0]}
            landing={Math.max(0.12, s.down)}
            velocity={Math.sqrt(2 * 9.81 * (s.up - Math.max(0.12, s.down)))}
            q={s.q}
            plane={plane}
            low={low}
          />
        ))}
    </group>
  );
}
