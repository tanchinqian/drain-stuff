import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { drainDesign, terrainHeight, type DrainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';

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
export const rainCount = (rain: number, low = false) =>
  rain <= 0 ? 0 : Math.min(low ? 64 : 192, Math.ceil(rain * 3.6e6 * (low ? 0.7 : 2)));
export const seepageCount = (q: number, low = false) =>
  q > 0 ? Math.min(low ? 12 : 40, Math.ceil(q * 60000 * 2)) : 0;
export function StormRain({
  physics,
  low = false,
  plane,
}: {
  physics: ModelPhysics;
  low?: boolean;
  plane?: THREE.Plane;
}) {
  const d = drainDesign(physics.config),
    frame = physics.frame;
  const count = rainCount(frame?.rain ?? 0, low),
    reduced = useReducedMotion();
  const drops = useRef<THREE.InstancedMesh>(null),
    impacts = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0),
    object = useMemo(() => new THREE.Object3D(), []);
  const invalidate = useThree((s) => s.invalidate);
  const targets = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    for (const x of [-d.length / 2, d.length / 2])
      for (const z of [-d.topWidth / 2, -d.bedWidth / 2, d.bedWidth / 2, d.topWidth / 2])
        vertices.push(x, terrainHeight(d, z), z);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7]);
    const surface = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    surface.updateMatrixWorld();
    const water = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(frame?.ponding ?? 0));
    return { surface, water };
  }, [d.length, d.bedWidth, d.topWidth, frame?.ponding]);
  const impactPoints = useMemo(() => {
    const raycaster = new THREE.Raycaster(),
      point = new THREE.Vector3();
    return Array.from({ length: count }, (_, i) => {
      const x = (random(i + 1) - 0.5) * d.length,
        z = (random(i + 999) - 0.5) * d.topWidth;
      raycaster.set(new THREE.Vector3(x, 4, z), new THREE.Vector3(0, -1, 0));
      const ground = raycaster.intersectObject(targets.surface)[0]?.point.y ?? terrainHeight(d, z);
      const hit = raycaster.ray.intersectPlane(targets.water, point);
      return { x, z, y: Math.max(ground, hit?.y ?? ground) };
    });
  }, [count, targets, d.length, d.topWidth]);
  useEffect(
    () => () => {
      targets.surface.geometry.dispose();
      (targets.surface.material as THREE.Material).dispose();
    },
    [targets],
  );
  useFrame((_, delta) => {
    if (!drops.current || !impacts.current || !count) return;
    if (!reduced) time.current += Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      const { x, z, y: impactY } = impactPoints[i];
      const phase = ((time.current * 7) / 2.4 + random(i + 222)) % 1;
      const altitude = impactY + (1 - phase) * 2.4;
      object.position.set(x - (altitude - impactY) * 0.08, altitude, z);
      object.rotation.set(0, 0, -0.08);
      object.scale.set(0.003, Math.min(0.15, Math.max(0.001, altitude - impactY)), 0.003);
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
    <group>
      <instancedMesh ref={drops} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#748e95"
          transparent
          opacity={0.55}
          depthWrite={false}
          clippingPlanes={plane ? [plane] : []}
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
          clippingPlanes={plane ? [plane] : []}
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
        color="#88afa5"
        transparent
        opacity={0.35}
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
              '#include <color_fragment>\ndiffuseColor.rgb *= 0.94 + 0.06 * sin(flowPosition * 15.0 - waterTime * waterSpeed * 15.0);',
            );
        }}
      />
    );
  return (
    <meshPhysicalMaterial
      color="#a7c8bf"
      roughness={low ? 0.24 : 0.12}
      metalness={0}
      ior={1.333}
      transmission={low ? 0 : 0.65}
      thickness={depth}
      attenuationColor="#78a99c"
      attenuationDistance={1.5}
      transparent
      opacity={low ? 0.4 : 0.65}
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
          diffuseColor.a *= smoothstep(0.0, 0.008, localDepth);
          diffuseColor.rgb = mix(vec3(0.98), diffuseColor.rgb, 1.0 - exp(-localDepth * 3.0));`
              : ''
          }`,
            )
            .replace(
              '#include <normal_fragment_maps>',
              `#include <normal_fragment_maps>
          float phase = waterPosition.x * 15.0 - waterTime * waterSpeed * 15.0;
          float waves = sin(waterPosition.x * 12.0 + waterTime) * cos(waterPosition.z * 13.0 - waterTime * 0.7);
          float rings = sin(length(fract(waterPosition.xz * 2.7) - 0.5) * 52.0 - waterTime * 9.0) * min(waterRain / 120.0, 1.0);
          normal = normalize(normal + vec3(waves + rings * 0.35, 0.0, cos(phase)) * 0.025);`,
            )
            .replace(
              '#include <opaque_fragment>',
              `
          float fresnel = 0.02 + 0.98 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 5.0);
          outgoingLight = mix(outgoingLight, vec3(0.76, 0.83, 0.85), fresnel * 0.6);
          ${flow ? 'outgoingLight *= 0.94 + 0.06 * sin(phase);' : ''}
          #include <opaque_fragment>`,
            );
      }}
      customProgramCacheKey={() => 'water-v3-' + low + '-' + flow + '-' + design.bedWidth}
    />
  );
}

export function Seepage({ physics, low = false }: { physics: ModelPhysics; low?: boolean }) {
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
      <meshBasicMaterial color="#789f9b" />
    </instancedMesh>
  );
}
