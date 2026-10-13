import { describe, expect, it } from 'vitest';
import { generateMock } from '../api/mock/seed';
import { mapBounds, mappedHouses, pilotBuildings, site, zoneCentres } from './layout';
import { weatherAt, weatherPixels } from './weather';

describe('map-derived layout and synthetic rainfall', () => {
  it('keeps 24 unique pilot assignments on mapped footprints without inventing context readings', () => {
    const db = generateMock();
    expect(site.houses).toHaveLength(589);
    expect(new Set(Object.values(pilotBuildings)).size).toBe(24);
    for (const h of db.houses) {
      const footprint = mappedHouses.get(pilotBuildings[h.id])!;
      expect([h.x, h.y]).toEqual([footprint.x, footprint.z]);
    }
    for (const h of site.houses) {
      expect(Math.abs(h.x)).toBeLessThan(mapBounds.x);
      expect(Math.abs(h.z)).toBeLessThan(mapBounds.z);
      expect(h.width).toBeGreaterThan(0);
      expect(h.depth).toBeGreaterThan(0);
      expect(Number.isFinite(h.rotation)).toBe(true);
    }
    expect(db.sensors.every((s) => !s.ownerId.startsWith('OSM-'))).toBe(true);
  });
  it('is deterministic, transparent at the map boundary and responds to the rainfall samples', () => {
    const samples = generateMock().zones.map((z) => ({ zone: z.id, peakMmPerHr: z.peakMmPerHr }));
    expect(weatherPixels(samples, 32, 16)).toEqual(weatherPixels(samples, 32, 16));
    const [x, z] = zoneCentres.B;
    const original = weatherAt(x, z, samples);
    const reduced = weatherAt(
      x,
      z,
      samples.map((s) => ({ ...s, peakMmPerHr: s.peakMmPerHr / 2 })),
    );
    expect(original.rain).toBeGreaterThan(reduced.rain);
    expect(original.coverage).toBeGreaterThan(0.5);
    expect(weatherAt(33, z, samples).coverage).toBe(0);
    expect(weatherAt(x, 14, samples).coverage).toBe(0);
    expect(weatherAt(0, 0, []).coverage).toBe(0);
  });
});
