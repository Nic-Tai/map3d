import { create } from "zustand";

type AreaStore = {
  areas: any;
  center: {
    lat: number;
    lng: number;
  }[];
  loadedGlb: ArrayBuffer | null;
  isGlbMode: boolean;

  appendAreas: (areas: []) => void;
  setCenter: (center: []) => void;
  removeArea: (id: number) => void;
  setLoadedGlb: (glb: ArrayBuffer | null) => void;
  setIsGlbMode: (isGlbMode: boolean) => void;
  clearAll: () => void;
};

export const useAreaStore = create<AreaStore>((set) => ({
  areas: [],
  center: [
    {
      lat: 40.8,
      lng: -73.95,
    },
    {
      lat: 40.83,
      lng: -73.88,
    },
  ],
  loadedGlb: null,
  isGlbMode: false,
  appendAreas: (areas) => set(() => ({ areas: [...areas] })),
  setCenter: (center) => set(() => ({ center: [...center] })),
  removeArea: (id) => set((state) => ({ areas: state.areas.filter((area: any) => area.id !== id) })),
  setLoadedGlb: (glb) => set(() => ({ loadedGlb: glb })),
  setIsGlbMode: (isGlbMode) => set(() => ({ isGlbMode })),
  clearAll: () => set(() => ({ areas: [], loadedGlb: null, isGlbMode: false })),
}));
