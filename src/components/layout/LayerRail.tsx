import { CloudFog, Users, Trees, CarFront, Factory } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { LayerKey } from '../../types';

export const LAYERS: { key: LayerKey; label: string; shortcut: string; icon: typeof CloudFog }[] = [
  { key: 'pollution', label: 'Pollution', shortcut: '1', icon: CloudFog },
  { key: 'population', label: 'Population density', shortcut: '2', icon: Users },
  { key: 'green', label: 'Green cover', shortcut: '3', icon: Trees },
  { key: 'traffic', label: 'Traffic', shortcut: '4', icon: CarFront },
  { key: 'sources', label: 'Emission sources', shortcut: '5', icon: Factory },
];

export default function LayerRail() {
  const activeLayer = useAppStore((s) => s.activeLayer);
  const setActiveLayer = useAppStore((s) => s.setActiveLayer);

  return (
    <nav className="z-20 flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-3">
      {LAYERS.map(({ key, label, shortcut, icon: Icon }) => {
        const active = key === activeLayer;
        return (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            title={`${label} (${shortcut})`}
            aria-pressed={active}
            className={`group relative flex h-10 w-10 items-center justify-center rounded transition-colors ${
              active
                ? 'bg-accent-dim text-accent'
                : 'text-muted hover:bg-elevated hover:text-secondary'
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
            <span className="absolute -bottom-0.5 right-1 font-mono text-[8px] text-muted">{shortcut}</span>
          </button>
        );
      })}
    </nav>
  );
}
