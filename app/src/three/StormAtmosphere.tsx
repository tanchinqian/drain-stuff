import { useEffect, useMemo } from 'react';
import { CanvasTexture, Color, Fog, SRGBColorSpace } from 'three';
import { drainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
export default function StormAtmosphere({
  physics,
  record = false,
  low = false,
}: {
  physics: ModelPhysics;
  record?: boolean;
  low?: boolean;
}) {
  const rain = physics.frame?.rain ?? 0,
    intensity = Math.min(1, (rain * 3.6e6) / 100),
    d = drainDesign(physics.config);
  const sky = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const x = c.getContext('2d')!,
      g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#697e87');
    g.addColorStop(0.6, '#a9b6b6');
    g.addColorStop(1, '#d1d7ce');
    x.fillStyle = g;
    x.fillRect(0, 0, 8, 256);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => sky.dispose(), [sky]);
  const fog = useMemo(
    () => new Fog(new Color('#b7c2bb'), 24 - intensity * 4, 110 - intensity * 35),
    [intensity],
  );
  return (
    <>
      <primitive attach="background" object={sky} />
      <primitive attach="fog" object={fog} />
      <hemisphereLight args={['#dae5e8', '#575640', 1.6 - intensity * 0.25]} />
      <directionalLight
        position={[-6, 13, 8]}
        intensity={1.9 - intensity * 0.5}
        castShadow={!low}
        shadow-mapSize-width={record ? 2048 : 1024}
        shadow-mapSize-height={record ? 2048 : 1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={record ? 4 : 2}
      />
      <directionalLight position={[9, 5, -6]} intensity={0.35} />
      {rain * 3.6e6 > 35 && (
        <mesh
          name="ground-mist"
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ intensity }}
        >
          <planeGeometry args={[d.length * 2, d.topWidth * 3]} />
          <meshBasicMaterial
            color="#d0dcda"
            transparent
            opacity={0.07 * intensity}
            depthWrite={false}
            onBeforeCompile={(shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                '#include <color_fragment>\ndiffuseColor.a *= pow(max(0.0, 1.0 - length(vMapUv - 0.5) * 2.0), 2.0);',
              );
            }}
            map={sky}
          />
        </mesh>
      )}
    </>
  );
}
