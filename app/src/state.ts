import { create } from 'zustand';
import type { PartId, ZoneId } from './api/types';
interface Selection {
  houseId: string | null;
  zoneId: ZoneId | null;
  partId: PartId;
  selectHouse: (id: string | null) => void;
  selectZone: (id: ZoneId | null) => void;
  selectPart: (id: PartId) => void;
  toast: string;
  notify: (text: string) => void;
}
export const useSelection = create<Selection>((set) => ({
  houseId: null,
  zoneId: null,
  partId: 'sock',
  toast: '',
  selectHouse: (houseId) => set({ houseId }),
  selectZone: (zoneId) => set({ zoneId }),
  selectPart: (partId) => set({ partId }),
  notify: (toast) => set({ toast }),
}));
