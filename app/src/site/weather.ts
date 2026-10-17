import type { ZoneId } from '../api/types';
import { zoneCentres } from './layout';
import { intensityAt, type RainPoint } from '../simulation/physics/rainfall';

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
export type RainPlayback = { points: RainPoint[]; peakMmHr: number };
export const radarColor = (rain: number) =>
  [...radarStops].reverse().find((stop) => rain >= stop.value)!.color;
function blendedRadarColor(rain: number) {
  const upper = radarStops.findIndex((stop) => stop.value > rain);
  if (upper < 0) return radarStops[radarStops.length - 1].color;
  if (upper === 0) return radarStops[0].color;
  const low = radarStops[upper - 1], high = radarStops[upper];
  const mix = (rain - low.value) / (high.value - low.value);
  return '#' + [1, 3, 5].map((channel) => {
    const a = parseInt(low.color.slice(channel, channel + 2), 16);
    const b = parseInt(high.color.slice(channel, channel + 2), 16);
    return Math.round(a + (b - a) * mix).toString(16).padStart(2, '0');
  }).join('');
}
export function playbackRain(playback: RainPlayback, second: number) {
  const mmPerHr = Math.max(0, intensityAt(playback.points, second) * 3.6e6);
  const nextIndex = playback.points.findIndex((point) => point.second > second);
  const from = playback.points[Math.max(0, nextIndex - 1)], to = playback.points[nextIndex];
  const fraction = to ? Math.max(0, Math.min(1, (second - from.second) / (to.second - from.second))) : 0;
  const mix = fraction * fraction * (3 - 2 * fraction);
  // Blend appearance between blocks; the model and numeric readout keep the saved step rainfall.
  const visualMmHr = to ? Math.max(0, (from.intensity + (to.intensity - from.intensity) * mix) * 3.6e6) : 0;
  const duration = playback.points[playback.points.length - 1].second;
  const fade = Math.max(0, Math.min(1, (duration - second) / Math.min(60, duration || 1)));
  return { mmPerHr, color: blendedRadarColor(visualMmHr),
    strength: playback.peakMmHr > 0 && visualMmHr > 0
      ? Math.max(0.35, Math.sqrt(Math.min(1, visualMmHr / playback.peakMmHr))) * fade : 0 };
}

function cloudNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const smooth = (n: number) => n * n * (3 - 2 * n);
  const hash = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const u = smooth(x - ix), v = smooth(z - iz);
  const top = hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u;
  const bottom = hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u;
  return top * (1 - v) + bottom * v;
}
function stormCoverage(x: number, z: number) {
  const noise = cloudNoise(x / 19 + 8, z / 17 + 6) * 0.6
    + cloudNoise(x / 9 - 3, z / 8 + 5) * 0.28
    + cloudNoise(x / 4 + 5, z / 4 - 8) * 0.12;
  const edge = Math.max(0, Math.min(1, (1 - ((x + 6) / 86) ** 2 - (z / 39) ** 2) * 3));
  return Math.max(0, Math.min(1, (noise - 0.2) * 2.2)) * edge * edge * (3 - 2 * edge);
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
  const coverage = samples.length ? Math.max(0, Math.min(1, density) * Math.max(0, edge)) : 0;
  return { rain: total ? Math.max(0, weighted / total) : 0, coverage };
}
export function weatherPixels(samples: RainSample[], width = 512, height = 256, monochrome = false) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const x = -33 + (col / (width - 1)) * 66;
      const z = -14 + (row / (height - 1)) * 28;
      // Playback uses one field three times the map size, cropped without repeating.
      const { rain, coverage } = monochrome
        ? { rain: 0, coverage: samples.length ? stormCoverage(x * 3, z * 3) : 0 }
        : weatherAt(x, z, samples);
      const hex = monochrome ? '#ffffff' : radarColor(rain);
      const index = (row * width + col) * 4;
      pixels[index] = parseInt(hex.slice(1, 3), 16);
      pixels[index + 1] = parseInt(hex.slice(3, 5), 16);
      pixels[index + 2] = parseInt(hex.slice(5, 7), 16);
      pixels[index + 3] = Math.round(coverage * 255);
    }
  }
  return pixels;
}
export function weatherCanvas(samples: RainSample[], monochrome = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  canvas.getContext('2d')!.putImageData(new ImageData(weatherPixels(samples, 512, 256, monochrome), 512, 256), 0, 0);
  return canvas;
}
