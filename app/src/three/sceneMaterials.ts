import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';

export type Surface =
  'soil' | 'mulch' | 'sand' | 'gravel' | 'concrete' | 'asphalt' | 'paving' | 'grass' | 'fabric';
export const sceneColours = {
  soil: 0x766048,
  mulch: 0x584532,
  sand: 0xc7b994,
  gravel: 0x93958a,
  concrete: 0xc4c6b8,
  asphalt: 0x68716f,
  paving: 0xb9b4a4,
  grass: 0x849475,
  fabric: 0x88794e,
  wall: '#cec8b5',
  roof: '#656d66',
  trim: '#394842',
};
export const variation = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Original, tileable procedural albedo and tangent-space normal maps; no downloaded assets. */
export function surfaceMaps(kind: Surface, colour = sceneColours[kind]) {
  const n = 128,
    canvas = document.createElement('canvas'),
    normalCanvas = document.createElement('canvas');
  canvas.width = canvas.height = normalCanvas.width = normalCanvas.height = n;
  const ctx = canvas.getContext('2d')!,
    normal = normalCanvas.getContext('2d')!;
  const image = ctx.createImageData(n, n),
    normals = normal.createImageData(n, n);
  const heights = new Float32Array(n * n),
    base = new Color(colour).convertLinearToSRGB();
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const broad = Math.sin((x * Math.PI) / 32) * Math.cos((y * Math.PI) / 64);
      const fine = variation(i + 87);
      let h = 0.46 + 0.12 * broad + 0.22 * fine;
      if (kind === 'paving') h *= x % 32 < 2 || y % 32 < 2 ? 0.35 : 1;
      if (kind === 'mulch') h += 0.2 * Math.sin(((x + y * 3) * Math.PI) / 8);
      if (kind === 'gravel') h += 0.24 * Math.sin((x * Math.PI) / 8) * Math.cos((y * Math.PI) / 8);
      if (kind === 'fabric') h += 0.15 * Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2);
      heights[i] = h;
      const shade = kind === 'grass' || kind === 'asphalt' ? 0.88 + h * 0.15 : 0.78 + h * 0.42;
      image.data.set(
        [
          Math.min(255, base.r * 255 * shade),
          Math.min(255, base.g * 255 * shade),
          Math.min(255, base.b * 255 * shade),
          255,
        ],
        i * 4,
      );
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = heights[y * n + ((x + 1) % n)] - heights[y * n + ((x + n - 1) % n)];
      const dy = heights[((y + 1) % n) * n + x] - heights[((y + n - 1) % n) * n + x];
      normals.data.set([128 - dx * 90, 128 - dy * 90, 245, 255], (y * n + x) * 4);
    }
  ctx.putImageData(image, 0, 0);
  normal.putImageData(normals, 0, 0);
  const map = new CanvasTexture(canvas),
    normalMap = new CanvasTexture(normalCanvas);
  for (const texture of [map, normalMap]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(kind === 'asphalt' || kind === 'grass' ? 6 : 3, 2);
    if (kind === 'asphalt') texture.repeat.set(3, 24);
    texture.userData.surface = kind;
  }
  map.colorSpace = SRGBColorSpace;
  return {
    map,
    normalMap,
    normalScale: new Vector2(
      kind === 'grass' || kind === 'asphalt' ? 0.045 : 0.24,
      kind === 'grass' || kind === 'asphalt' ? 0.045 : 0.24,
    ),
  };
}
export function contextAtlas() {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  [sceneColours.wall, sceneColours.roof, sceneColours.trim].forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.fillRect(i * 64, 0, 64, 64);
  });
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  return map;
}
