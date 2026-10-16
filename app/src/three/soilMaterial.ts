import {
  DataTexture,
  LinearFilter,
  RedFormat,
  UnsignedByteType,
  type MeshStandardMaterial,
} from 'three';
import type { MoistureField } from '../simulation/physics/richards';

export const wetAlbedo = (dry: number, saturation: number) =>
  dry * (1 - 0.5 * Math.max(0, Math.min(1, saturation)));
export function moistureTexture(field: MoistureField) {
  const bytes = new Uint8Array(field.nx * (field.nz + 1));
  bytes.set(Uint8Array.from(field.saturation, (s) => Math.round(s * 255)));
  bytes.set(
    Uint8Array.from(field.surfaceWetness ?? field.saturation.subarray(0, field.nx), (s) =>
      Math.round(s * 255),
    ),
    field.nx * field.nz,
  );
  const texture = new DataTexture(bytes, field.nx, field.nz + 1, RedFormat, UnsignedByteType);
  texture.userData.wetBandHeight = field.wetBandHeight ?? 0;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
export function wetMaterial(
  material: MeshStandardMaterial,
  texture: DataTexture,
  width: number,
  depth: number,
) {
  const existing = material.userData.moistureUniform as { value: DataTexture } | undefined;
  if (existing && material.userData.amendmentUniform) {
    existing.value = texture;
    (material.userData.wetBandUniform as { value: number }).value = Number(
      texture.userData.wetBandHeight ?? 0,
    );
    (material.userData.amendmentUniform as { value: number }).value = Number(
      texture.userData.amendmentDepth ?? 0,
    );
    return;
  }
  const uniform = { value: texture };
  const bandUniform = { value: Number(texture.userData.wetBandHeight ?? 0) };
  const amendmentUniform = { value: Number(texture.userData.amendmentDepth ?? 0) };
  material.userData.moistureUniform = uniform;
  material.userData.wetBandUniform = bandUniform;
  material.userData.amendmentUniform = amendmentUniform;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.soilWater = uniform;
    shader.uniforms.wetBandHeight = bandUniform;
    shader.uniforms.soilAmendmentDepth = amendmentUniform;
    shader.vertexShader =
      'varying vec3 soilPosition;\n' +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nsoilPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    const height = texture.image.height;
    shader.fragmentShader =
      `uniform sampler2D soilWater; uniform float wetBandHeight; uniform float soilAmendmentDepth; varying vec3 soilPosition;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        vec2 soilUV = vec2(clamp(soilPosition.z / ${width.toFixed(8)} + 0.5, 0.0, 1.0), (0.5 + clamp((-soilPosition.y - 0.05) / ${depth.toFixed(8)}, 0.0, 1.0) * ${height - 2}.0) / ${height}.0);
        float soilS = texture2D(soilWater, soilUV).r;
        if (soilPosition.y >= -0.05 && soilPosition.y < wetBandHeight + 0.025) soilS = max(soilS, texture2D(soilWater, vec2(soilUV.x, ${(height - 0.5) / height})).r);
        diffuseColor.rgb *= mix(vec3(1.08, 1.04, 0.96), vec3(0.38, 0.43, 0.46), soilS);
        if (soilPosition.y < -0.05 && -soilPosition.y - 0.05 < soilAmendmentDepth) diffuseColor.rgb *= mix(vec3(0.96, 0.91, 0.83), vec3(0.8, 0.85, 0.9), soilS);
        float front = 1.0 - smoothstep(0.012, 0.035, abs(soilS - 0.5));
        diffuseColor.rgb *= 1.0 - front * 0.45;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.9, 0.35, soilS);',
        );
  };
  material.customProgramCacheKey = () => 'soil-water-v7-amendment-' + width + '-' + depth;
  material.needsUpdate = true;
}
