import { useAppStore } from '../../store/useAppStore';

export default function BasemapToggle() {
  const basemap = useAppStore((s) => s.basemap);
  const setBasemap = useAppStore((s) => s.setBasemap);
  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex overflow-hidden rounded border border-line bg-panel/90 backdrop-blur-sm">
      {(['roads', 'satellite'] as const).map((b) => (
        <button
          key={b}
          onClick={() => setBasemap(b)}
          aria-pressed={basemap === b}
          className={`px-3 py-1.5 text-2xs capitalize transition-colors ${
            basemap === b ? 'bg-accent-dim text-accent' : 'text-secondary hover:text-primary'
          }`}
        >
          {b}
        </button>
      ))}
    </div>
  );
}
