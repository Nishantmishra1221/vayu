import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Wind, RadioTower, Hexagon, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTimeIST } from '../../lib/format';
import PlaceSearch from '../search/PlaceSearch';
import VayuLogo from '../shared/VayuLogo';
import { USE_MOCKS } from '../../config';

export default function TopBar() {
  const place = useAppStore((s) => s.place);
  const overlays = useAppStore((s) => s.overlays);
  const toggleOverlay = useAppStore((s) => s.toggleOverlay);
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4 sm:gap-4">
      <button
        onClick={() => navigate('/')}
        className="flex shrink-0 items-center gap-2 font-display text-base font-bold tracking-[0.12em] text-primary"
        title="Back to search"
      >
        <VayuLogo size={26} />
        VAYU
      </button>
      {place && (
        <div className="w-full min-w-[140px] max-w-[340px]">
          <PlaceSearch compact />
        </div>
      )}
      <div className="flex-1" />
      {USE_MOCKS && (
        <span
          className="hidden items-center gap-1 rounded-sm border border-line px-1.5 py-0.5 text-[11px] font-mono text-muted lg:flex"
          title="Running on cached fixtures — demo-safe, no backend required"
        >
          <ShieldAlert size={11} /> DEMO DATA
        </span>
      )}
      <div className="hidden items-center gap-1.5 font-mono text-2xs text-secondary md:flex">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-aqi-good animate-pulse" />
        live {formatTimeIST(now)}
      </div>
      {place && (
        <div className="relative">
          <button
            onClick={() => setLayersOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-2xs ${
              layersOpen ? 'border-accent text-accent' : 'border-line text-secondary hover:text-primary'
            }`}
          >
            <Layers size={13} /> overlays
          </button>
          {layersOpen && (
            <div className="absolute right-0 top-9 w-52 rounded border border-line bg-elevated p-2 shadow-xl">
              {(
                [
                  ['wind', 'Wind particles', Wind],
                  ['stations', 'Monitoring stations', RadioTower],
                  ['boundary', 'Administrative boundary', Hexagon],
                ] as const
              ).map(([key, label, Icon]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-2xs text-secondary hover:bg-panel"
                >
                  <input
                    type="checkbox"
                    checked={overlays[key]}
                    onChange={() => toggleOverlay(key)}
                    className="accent-[#2563EB]"
                  />
                  <Icon size={12} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
