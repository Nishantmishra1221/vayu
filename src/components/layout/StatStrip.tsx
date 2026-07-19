import { useAppStore } from '../../store/useAppStore';
import { useForecast, useSnapshot } from '../../api/queries';
import { bandFor } from '../../lib/aqi';
import { formatCompact, formatPct } from '../../lib/format';
import SourceChip from '../shared/SourceChip';
import Skeleton from '../shared/Skeleton';
import type { LayerKey } from '../../types';

interface Cell {
  label: string;
  value: string;
  valueColor?: string;
  sub: string;
  source: string;
  layer: LayerKey;
}

export default function StatStrip() {
  const place = useAppStore((s) => s.place);
  const setActiveLayer = useAppStore((s) => s.setActiveLayer);
  const activeLayer = useAppStore((s) => s.activeLayer);
  const { data: snapshot } = useSnapshot(place);
  const { data: forecast } = useForecast(place);

  if (!place) return null;

  if (!snapshot) {
    return (
      <footer className="z-20 flex shrink-0 items-stretch gap-2 overflow-x-auto border-t border-line bg-base px-3 py-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex min-w-[150px] flex-1 flex-col justify-center gap-1.5 rounded-md border border-line bg-panel px-3.5 py-2"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </footer>
    );
  }

  const s = snapshot.summary;
  const band = bandFor(s.aqi);
  const f24 =
    forecast?.cityLevel.find((st) => st.offsetHours === 24)?.aqi ?? s.aqiForecast24h;
  const f24band = bandFor(f24);
  const delta = f24 - s.aqi;

  const cells: Cell[] = [
    {
      label: 'Current AQI',
      value: String(s.aqi),
      valueColor: band.color,
      sub: `${band.label} · CPCB`,
      source: 'cpcb',
      layer: 'pollution',
    },
    {
      label: 'Forecast +24h',
      value: String(f24),
      valueColor: f24band.color,
      sub: `${f24band.label} · ${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)}`,
      source: 'model',
      layer: 'pollution',
    },
    {
      label: 'Population exposed',
      value: formatCompact(s.populationExposedAbove200),
      sub: 'above AQI 200',
      source: 'worldpop',
      layer: 'population',
    },
    {
      label: 'Green cover',
      value: formatPct(s.greenCoverPct),
      sub: 'of area',
      source: 'esa-worldcover',
      layer: 'green',
    },
    {
      label: 'Active fires',
      value: String(s.activeFires24h),
      sub: 'VIIRS 24h',
      source: 'firms',
      layer: 'sources',
    },
    {
      label: 'Congestion',
      value: s.congestionRatio.toFixed(2),
      sub: 'of free flow',
      source: 'tomtom',
      layer: 'traffic',
    },
  ];

  return (
    <footer className="z-20 flex shrink-0 items-stretch gap-2 overflow-x-auto border-t border-line bg-base px-3 py-2.5">
      {cells.map((c) => (
        <button
          key={c.label}
          onClick={() => setActiveLayer(c.layer)}
          title={`Switch to ${c.layer} layer`}
          aria-pressed={activeLayer === c.layer}
          className={`flex min-w-[150px] flex-1 flex-col justify-center gap-1 rounded-md border px-3.5 py-2 text-left transition-all ${
            activeLayer === c.layer
              ? 'border-accent bg-accent-dim/50 shadow-card'
              : 'border-line bg-panel hover:-translate-y-px hover:border-line-strong hover:shadow-card'
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
            {c.label} <SourceChip source={c.source} />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-medium leading-none" style={{ color: c.valueColor }}>
              {c.value}
            </span>
            <span className="text-2xs text-secondary">{c.sub}</span>
          </span>
        </button>
      ))}
    </footer>
  );
}
