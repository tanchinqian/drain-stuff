import { create } from 'zustand';
import type { CutAxis } from './sceneMetrics';
/** Shared by the 3D canvas and both existing 2D section views; never changes a physics run. */
export const useSceneCuts = create<{
  cuts: Record<string, { axis: CutAxis; position: number }>;
  remember: (id: string, axis: CutAxis, position: number) => void;
}>((set) => ({
  cuts: {},
  remember: (id, axis, position) =>
    set((state) =>
      state.cuts[id]?.axis === axis && state.cuts[id]?.position === position
        ? state
        : { cuts: { ...state.cuts, [id]: { axis, position } } },
    ),
}));
