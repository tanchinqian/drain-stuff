import type { ZoneId } from '../api/types';
import { zoneCentres } from './layout';

export const radarStops = [
  { value: 0, color: '#61cce9', label: 'Under 10' },
  { value: 10, color: '#44bf65', label: '10–20' },
  { value: 20, color: '#b9df38', label: '20–40' },
  { value: 40, color: '#f3d431', label: '40–50' },
  { value: 50, color: '#f28b27', label: '50–60' },
  { value: 60, color: '#de452e', label: '60–80' },
  { value: 80, color: '#aa40b6', label: 'Over 80 mm/h' },
];
export type RainSample = { zone: ZoneId; peakMmPerHr: number };

function noise(x: number, z: number) {
  return (
    (Math.sin(x * 0.69 + Math.sin(z * 0.62)) +
      Math.cos(z * 0.91 + x * 0.17) +
      Math.sin(x * 1.37 - z * 1.21)) /
    3
  );
}
export function weatherAt(x: number, z: number, samples: RainSample[]) {
  let total = 0,
    weighted = 0,
    density = 0;
  for (const sample of samples) {
    const [cx, cz] = zoneCentres[sample.zone];
    const distance = (x - cx) ** 2 + (z - cz) ** 2;
    const weight = 1 / (distance + 0.4);
    total += weight;
    weighted += sample.peakMmPerHr * weight;
    density += Math.exp(-distance / 110);
  }
  const edge = Math.min((33 - Math.abs(x)) / 6, (14 - Math.abs(z)) / 3, 1);
  const coverage =
    Math.max(0, Math.min(1, (density * (1 + noise(x, z) * 0.32) - 0.19) * 1.5)) * Math.max(0, edge);
  return { rain: total ? Math.max(0, weighted / total + noise(x, z) * 7) : 0, coverage };
}
export function weatherPixels(samples: RainSample[], width = 512, height = 256) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const { rain, coverage } = weatherAt(
        -33 + (col / (width - 1)) * 66,
        -14 + (row / (height - 1)) * 28,
        samples,
      );
      const hex = [...radarStops].reverse().find((s) => rain >= s.value)!.color;
      const index = (row * width + col) * 4;
      pixels[index] = parseInt(hex.slice(1, 3), 16);
      pixels[index + 1] = parseInt(hex.slice(3, 5), 16);
      pixels[index + 2] = parseInt(hex.slice(5, 7), 16);
      pixels[index + 3] = Math.round(coverage * 255);
    }
  }
  return pixels;
}
export function weatherCanvas(samples: RainSample[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  canvas.getContext('2d')!.putImageData(new ImageData(weatherPixels(samples), 512, 256), 0, 0);
  return canvas;
}
