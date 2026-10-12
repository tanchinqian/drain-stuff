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
