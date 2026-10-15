import { create } from 'zustand';
import type { PartId, ZoneId } from './api/types';
interface Selection {
  houseId: string | null;
  zoneId: ZoneId | null;
  partId: PartId;
  housePositions: Record<string, [number, number]>;
  selectHouse: (id: string | null) => void;
  selectZone: (id: ZoneId | null) => void;
  selectPart: (id: PartId) => void;
  moveHouse: (id: string, position: [number, number]) => void;
  resetHouses: () => void;
  toast: string;
  notify: (text: string) => void;
}
export const useSelection = create<Selection>((set) => ({
  houseId: null,
  zoneId: null,
  partId: 'sock',
  housePositions: {},
  toast: '',
  selectHouse: (houseId) => set({ houseId }),
  selectZone: (zoneId) => set({ zoneId }),
  selectPart: (partId) => set({ partId }),
  moveHouse: (id, position) =>
    set((state) => ({ housePositions: { ...state.housePositions, [id]: position } })),
  resetHouses: () => set({ housePositions: {} }),
  notify: (toast) => set({ toast }),
}));

interface SaveEntry {
  id: string;
  page: string;
  t: string;
  user: string;
  action: string;
}
function savedActivity(): SaveEntry[] {
  try {
    return JSON.parse(localStorage.getItem('drain-save-history') || '[]');
  } catch {
    return [];
  }
}
export const useActivity = create<{ entries: SaveEntry[]; record: (action: string) => void }>(
  (set) => ({
    entries: savedActivity(),
    record: (action) =>
      set((s) => {
        const entry = {
          id: crypto.randomUUID(),
          page: location.pathname,
          t: new Date().toISOString(),
          user: 'Local operator',
          action,
        };
        const entries = [entry, ...s.entries].slice(0, 200);
        try {
          localStorage.setItem('drain-save-history', JSON.stringify(entries));
        } catch {
          /* Session history still works. */
        }
        return { entries };
      }),
  }),
);
