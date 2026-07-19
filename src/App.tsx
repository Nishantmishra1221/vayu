import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import TopBar from './components/layout/TopBar';
import LayerRail, { LAYERS } from './components/layout/LayerRail';
import StatStrip from './components/layout/StatStrip';
import MapCanvas from './components/map/MapCanvas';
import MapLegend from './components/map/MapLegend';
import TimeScrubber from './components/map/TimeScrubber';
import BasemapToggle from './components/map/BasemapToggle';
import Inspector from './components/inspector/Inspector';
import LandingOverlay from './components/search/LandingOverlay';
import ResolvingChecklist from './components/search/ResolvingChecklist';

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const s = useAppStore.getState();
      if (!s.place) return;
      const layer = LAYERS.find((l) => l.shortcut === e.key);
      if (layer) {
        s.setActiveLayer(layer.key);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (s.activeLayer === 'pollution') s.setScrubberPlaying(!s.scrubberPlaying);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function useViewportWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

export default function App() {
  const place = useAppStore((s) => s.place);
  useKeyboardShortcuts();
  const width = useViewportWidth();

  if (width < 1024) {
    return (
      <div className="flex h-full items-center justify-center bg-base px-8 text-center">
        <p className="max-w-sm text-sm text-secondary">
          VAYU is an operations console and needs a screen at least 1024px wide. Please open it on a
          larger display.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-base">
      {place && <TopBar />}
      <div className="relative flex flex-1 overflow-hidden">
        {place && <LayerRail />}
        <main className="relative flex-1">
          <MapCanvas />
          {place && (
            <>
              <BasemapToggle />
              <MapLegend />
              <TimeScrubber />
              <Inspector />
            </>
          )}
          {!place && <LandingOverlay />}
          <ResolvingChecklist />
        </main>
      </div>
      {place && <StatStrip />}
    </div>
  );
}
