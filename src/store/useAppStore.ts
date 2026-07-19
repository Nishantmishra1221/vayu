import { create } from 'zustand';
import type { LayerKey, Place, PollutantOrAqi } from '../types';

export interface ResolveStep {
  label: string;
  done: boolean;
}

interface AppState {
  place: Place | null;
  resolving: ResolveStep[] | null; // non-null while the checklist is running
  activeLayer: LayerKey;
  pollutant: PollutantOrAqi;
  overlays: { wind: boolean; stations: boolean; boundary: boolean; traffic: boolean; vulnerable: boolean };
  basemap: 'roads' | 'satellite';
  timeOffsetHours: number; // 0..72 step 3
  scrubberPlaying: boolean;
  inspector: { lat: number; lon: number; key: number } | null;
  expandedEvidence: string | null;

  setPlace: (p: Place | null) => void;
  setResolving: (steps: ResolveStep[] | null) => void;
  setActiveLayer: (l: LayerKey) => void;
  setPollutant: (p: PollutantOrAqi) => void;
  toggleOverlay: (k: keyof AppState['overlays']) => void;
  setBasemap: (b: 'roads' | 'satellite') => void;
  setTimeOffset: (h: number) => void;
  setScrubberPlaying: (v: boolean) => void;
  openInspector: (lat: number, lon: number) => void;
  closeInspector: () => void;
  setExpandedEvidence: (id: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  place: null,
  resolving: null,
  activeLayer: 'pollution',
  pollutant: 'aqi',
  overlays: { wind: false, stations: true, boundary: true, traffic: true, vulnerable: false },
  basemap: 'roads',
  timeOffsetHours: 0,
  scrubberPlaying: false,
  inspector: null,
  expandedEvidence: null,

  setPlace: (place) => set({ place, inspector: null, expandedEvidence: null, timeOffsetHours: 0 }),
  setResolving: (resolving) => set({ resolving }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setPollutant: (pollutant) => set({ pollutant }),
  toggleOverlay: (k) => set((s) => ({ overlays: { ...s.overlays, [k]: !s.overlays[k] } })),
  setBasemap: (basemap) => set({ basemap }),
  setTimeOffset: (timeOffsetHours) => set({ timeOffsetHours }),
  setScrubberPlaying: (scrubberPlaying) => set({ scrubberPlaying }),
  openInspector: (lat, lon) =>
    set((s) => ({ inspector: { lat, lon, key: (s.inspector?.key ?? 0) + 1 }, expandedEvidence: null })),
  closeInspector: () => set({ inspector: null, expandedEvidence: null }),
  setExpandedEvidence: (expandedEvidence) => set({ expandedEvidence }),
  reset: () =>
    set({
      place: null,
      resolving: null,
      inspector: null,
      expandedEvidence: null,
      timeOffsetHours: 0,
      scrubberPlaying: false,
      activeLayer: 'pollution',
      pollutant: 'aqi',
    }),
}));
