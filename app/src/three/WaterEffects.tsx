import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { drainDesign, terrainHeight, type DrainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
import { rainBounds, rainColour } from './visibility';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
const random = (seed: number) => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const rainCount = (rain: number, low = false, record = false) =>
  rain <= 0
    ? 0
    : Math.min(
        record ? 4096 : low ? 512 : 2048,
        Math.ceil(rain * 3.6e6 * (record ? 60 : low ? 10 : 28)),
      );
export const seepageCount = (q: number, low = false) =>
  q > 0 ? Math.min(low ? 12 : 40, Math.ceil(q * 60000 * 2)) : 0;
export function StormRain({
  physics,
  low = false,
  record = false,
}: {
  physics: ModelPhysics;
  low?: boolean;
  record?: boolean;
  plane?: THREE.Plane;
}) {
  const d = drainDesign(physics.config),
    frame = physics.frame;
  const count = rainCount(frame?.rain ?? 0, low, record),
    reduced = useReducedMotion();
  const drops = useRef<THREE.InstancedMesh>(null),
    impacts = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0),
    object = useMemo(() => new THREE.Object3D(), []);
  const invalidate = useThree((s) => s.invalidate);
  const bounds = rainBounds(d);
  const impactPoints = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = (random(i + 1) - 0.5) * bounds.length,
          z = (random(i + 999) - 0.5) * bounds.width;
        const onBed = Math.abs(x) <= d.length / 2 && Math.abs(z) <= d.topWidth / 2;
        let y = onBed
          ? Math.max(terrainHeight(d, z), frame?.ponding ?? 0)
          : d.bottomY - d.nativeDepth;
        const c = d.catchment,
          roadX = -d.length / 2 - c.roadWidth / 2 - 0.7;
        if (
          Math.abs(x - roadX) <= c.roadWidth / 2 &&
          Math.abs(z) <= Math.max(40, d.topWidth + 8) / 2
        )
          y = c.kerbHeight;
        const footZ = -d.topWidth / 2 - c.footpathWidth / 2;
        if (Math.abs(x) < (d.length + 1) / 2 && Math.abs(z - footZ) < c.footpathWidth / 2)
          y = c.kerbHeight;
        if (
          c.roofArea > 0 &&
          Math.abs(x) < d.length * 0.375 &&
          Math.abs(z - (footZ - c.footpathWidth / 2 - c.roofEdgeDepth / 2 - 0.25)) <
            c.roofEdgeDepth / 2
        )
          y = c.kerbHeight + 4.99;
        return { x, z, y };
      }),
    [
      count,
      bounds.length,
      bounds.width,
      d.length,
      d.topWidth,
      d.bottomY,
      d.nativeDepth,
      frame?.ponding,
    ],
  );
  useFrame((_, delta) => {
    if (!drops.current || !impacts.current || !count) return;
    if (!reduced) time.current += Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      const { x, z, y: impactY } = impactPoints[i];
      const speed = 5.5 + random(i + 42) * 2;
      const phase = ((time.current * speed) / bounds.height + random(i + 222)) % 1;
      const altitude = impactY + (1 - phase) * bounds.height;
      object.position.set(x - (altitude - impactY) * 0.08, altitude, z);
      object.rotation.set(0, 0, -0.08);
      const distanceFade = 0.5 + 0.5 * (z / bounds.width + 0.5);
      object.scale.set(
        0.01 * distanceFade,
        Math.min(
          0.25 + Math.min(0.35, (frame?.rain ?? 0) * 3.6e6 * 0.004) + random(i + 8) * 0.14,
          Math.max(0.001, altitude - impactY),
        ),
        0.01 * distanceFade,
      );
      object.updateMatrix();
      drops.current.setMatrixAt(i, object.matrix);
      const age = (phase + 0.15) % 1;
      object.position.set(x, impactY + 0.001, z);
      object.rotation.set(-Math.PI / 2, 0, 0);
      object.scale.setScalar(age < 0.18 ? 0.015 + age * 0.35 : 0);
      object.updateMatrix();
      impacts.current.setMatrixAt(i, object.matrix);
    }
    drops.current.instanceMatrix.needsUpdate = true;
    impacts.current.instanceMatrix.needsUpdate = true;
    if (!reduced) invalidate();
  });
  if (!count) return null;
  return (
    <group name="storm-rain" userData={{ bounds, colour: rainColour }}>
      <instancedMesh
        name="rain-streaks"
        ref={drops}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#adbdbb"
          transparent
          opacity={Math.min(0.9, 0.5 + ((frame?.rain ?? 0) * 3.6e6) / 160)}
          onBeforeCompile={(shader) => {
            shader.vertexShader =
              'varying float rainFade;\n' +
              shader.vertexShader.replace(
                '#include <project_vertex>',
                '#include <project_vertex>\nrainFade = clamp(1.3 - abs(mvPosition.z) / 55.0, 0.3, 1.0);',
              );
            shader.fragmentShader =
              'varying float rainFade;\n' +
              shader.fragmentShader.replace(
                '#include <color_fragment>',
                '#include <color_fragment>\ndiffuseColor.a *= rainFade;',
              );
          }}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={impacts} args={[undefined, undefined, count]} frustumCulled={false}>
        <ringGeometry args={[0.7, 1, low ? 8 : 16]} />
        <meshBasicMaterial
          color="#b6c9c7"
          side={THREE.DoubleSide}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

export function WaterMaterial({
  depth,
  design,
  rain = 0,
  plane,
  low = false,
  velocity = 0,
  flow = false,
}: {
  depth: number;
  design: DrainDesign;
  rain?: number;
  plane?: THREE.Plane;
  low?: boolean;
  velocity?: number;
  flow?: boolean;
}) {
  const reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  const uniforms = useMemo(
    () => ({
      waterTime: { value: 0 },
      waterRain: { value: rain * 3.6e6 },
      waterSpeed: { value: velocity },
      waterDepth: { value: depth },
    }),
    [],
  );
  uniforms.waterRain.value = rain * 3.6e6;
  uniforms.waterSpeed.value = velocity;
  uniforms.waterDepth.value = depth;
  useFrame((_, delta) => {
    if (!reduced && (flow ? velocity > 0 : depth > 0)) {
      uniforms.waterTime.value += Math.min(delta, 0.1);
      invalidate();
    }
  });
  if (low)
    return (
      <meshBasicMaterial
        color="#749a93"
        transparent
        opacity={0.6}
        depthWrite={false}
        side={THREE.DoubleSide}
        clippingPlanes={plane ? [plane] : []}
        onBeforeCompile={(shader) => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader =
            'varying float flowPosition;\n' +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nflowPosition = position.x;',
            );
          shader.fragmentShader =
            'varying float flowPosition; uniform float waterTime; uniform float waterSpeed;\n' +
            shader.fragmentShader.replace(
              '#include <color_fragment>',
              '#include <color_fragment>\ndiffuseColor.rgb *= 0.8 + 0.2 * sin(flowPosition * 15.0 - waterTime * waterSpeed * 15.0);',
            );
        }}
      />
    );
  return (
    <meshPhysicalMaterial
      color="#9cb8ae"
      roughness={low ? 0.24 : 0.12}
      metalness={0}
      ior={1.333}
      transmission={low ? 0 : 0.82}
      thickness={depth}
      attenuationColor="#688b7e"
      attenuationDistance={2.5}
      transparent
      opacity={low ? 0.4 : 0.48}
      depthWrite={false}
      side={THREE.DoubleSide}
      clippingPlanes={plane ? [plane] : []}
      onBeforeCompile={(shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader =
          'varying vec3 waterPosition;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nwaterPosition = position;',
          );
        shader.fragmentShader =
          'varying vec3 waterPosition; uniform float waterTime; uniform float waterRain; uniform float waterSpeed; uniform float waterDepth;\n' +
          shader.fragmentShader
            .replace(
              '#include <color_fragment>',
              `#include <color_fragment>
          ${
            !flow
              ? `float localDepth = max(0.0, waterDepth - max(0.0, (abs(waterPosition.z) - ${(design.bedWidth / 2).toFixed(8)}) / ${Math.max(0.0001, design.sideSlope).toFixed(8)}));
          diffuseColor.a *= smoothstep(0.0, 0.004, localDepth);
          diffuseColor.a *= 0.25 + 0.75 * (1.0 - exp(-localDepth * 30.0));
          diffuseColor.rgb = mix(vec3(0.64, 0.71, 0.68), diffuseColor.rgb, 1.0 - exp(-localDepth * 10.0));`
              : ''
          }`,
            )
            .replace(
              '#include <normal_fragment_maps>',
              `#include <normal_fragment_maps>
          float phase = waterPosition.x * 15.0 - waterTime * waterSpeed * 15.0;
          float waves = sin(waterPosition.x * 12.0 + waterTime) * cos(waterPosition.z * 13.0 - waterTime * 0.7);
          vec2 rippleCell = floor(waterPosition.xz * 2.7);
          float rippleSeed = fract(sin(dot(rippleCell, vec2(127.1, 311.7))) * 43758.5453);
          vec2 rippleCentre = vec2(fract(rippleSeed * 37.3), fract(rippleSeed * 83.7));
          float ringRadius = length(fract(waterPosition.xz * 2.7) - rippleCentre);
          float rings = sin(ringRadius * 52.0 - waterTime * 9.0 + rippleSeed * 6.28) * exp(-ringRadius * 4.0) * min(waterRain / 100.0, 1.0);
          normal = normalize(normal + vec3(waves + rings * 0.35, 0.0, cos(phase)) * 0.025);`,
            )
            .replace(
              '#include <opaque_fragment>',
              `
          float fresnel = 0.02 + 0.98 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 5.0);
          outgoingLight = mix(outgoingLight, vec3(0.76, 0.83, 0.85), fresnel * 0.35);
          ${flow ? 'outgoingLight *= 0.8 + 0.2 * sin(phase); outgoingLight = mix(outgoingLight, vec3(0.82, 0.86, 0.82), smoothstep(0.9, 1.0, sin(phase)) * 0.22);' : ''}
          #include <opaque_fragment>`,
            );
      }}
      customProgramCacheKey={() => 'water-v4-' + low + '-' + flow + '-' + design.bedWidth}
    />
  );
}

export function Seepage({
  physics,
  low = false,
  plane,
}: {
  physics: ModelPhysics;
  low?: boolean;
  plane?: THREE.Plane;
}) {
  const q = physics.frame?.flux.drain ?? 0,
    d = drainDesign(physics.config);
  const count = seepageCount(q, low);
  const mesh = useRef<THREE.InstancedMesh>(null),
    object = useMemo(() => new THREE.Object3D(), []);
  const time = useRef(0),
    reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!mesh.current || !count) return;
    if (!reduced) time.current += Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      const phase = (random(i + 111) + (time.current * Math.sqrt(q * 60000)) / 4) % 1;
      object.position.set(
        (random(i + 20) - 0.5) * d.length,
        d.pipeY + ((1 - phase) * d.gravelDepth) / 2,
        (i % 2 ? 1 : -1) * (1 - phase) * 0.15,
      );
      object.scale.set(0.003, 0.02, 0.003);
      object.rotation.z = (i % 2 ? 1 : -1) * 0.35;
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (!reduced) invalidate();
  });
  if (!count) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color="#789f9b" clippingPlanes={plane ? [plane] : []} />
    </instancedMesh>
  );
}
