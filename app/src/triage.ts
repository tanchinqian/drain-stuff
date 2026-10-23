import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export const useBoard = create(
  persist<{
    jobId: string | null;
    selected: string;
    setJob: (id: string | null) => void;
    select: (asset: string) => void;
  }>(
    (set) => ({
      jobId: null,
      selected: 'S1',
      setJob: (jobId) => set({ jobId }),
      select: (selected) => set({ selected }),
    }),
    { name: 'drain-triage', storage: createJSONStorage(() => sessionStorage) },
  ),
);
