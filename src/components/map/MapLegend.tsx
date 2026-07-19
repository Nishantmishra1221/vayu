import { useAppStore } from '../../store/useAppStore';
import { AQI_BANDS, POLLUTANT_KEYS, POLLUTANT_META, pollutantStops } from '../../lib/aqi';
import { POP_RAMP } from './PopulationLayer';
import { GREEN_RAMP } from './GreenLayer';
import type { PollutantOrAqi } from '../../types';
import SourceChip from '../shared/SourceChip';

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-[11px] text-secondary">{label}</span>
    </span>
  );
}

export default function MapLegend() {
  const activeLayer = useAppStore((s) => s.activeLayer);
  const pollutant = useAppStore((s) => s.pollutant);
  const setPollutant = useAppStore((s) => s.setPollutant);
  const overlays = useAppStore((s) => s.overlays);
  const toggleOverlay = useAppStore((s) => s.toggleOverlay);

  return (
    <div className="pointer-events-auto max-w-[min(420px,calc(100vw-2rem))] shrink-0 rounded border border-line bg-panel/95 p-3 shadow-card backdrop-blur-sm">
      {activeLayer === 'pollution' && (
        <>
          <div className="mb-2 flex flex-wrap gap-0.5" role="tablist" aria-label="Pollutant">
            {(['aqi', ...POLLUTANT_KEYS] as PollutantOrAqi[]).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={pollutant === p}
                onClick={() => setPollutant(p)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase transition-colors ${
                  pollutant === p
                    ? 'bg-accent-dim text-accent'
                    : 'text-muted hover:bg-elevated hover:text-secondary'
                }`}
              >
                {p === 'aqi' ? 'AQI' : POLLUTANT_META[p as keyof typeof POLLUTANT_META].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {AQI_BANDS.map((b, i) => (
              <Swatch
                key={b.key}
                color={b.color}
                label={
                  pollutant === 'aqi'
                    ? `${b.label}`
                    : i === 0
                      ? `<${pollutantStops(pollutant)[0]}`
                      : i < 5
                        ? `${pollutantStops(pollutant)[i - 1]}+`
                        : `${pollutantStops(pollutant)[4]}+`
                }
              />
            ))}
            <SourceChip source={pollutant === 'aqi' ? 'cpcb' : 'cpcb'} title="CPCB stations, IDW interpolated" />
          </div>
          <p className="mt-1 text-[10px] text-muted">
            interpolated surface · {pollutant === 'aqi' ? 'CPCB AQI bands' : `${POLLUTANT_META[pollutant as keyof typeof POLLUTANT_META].unit} vs CPCB standard`}
          </p>
        </>
      )}
      {activeLayer === 'population' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {POP_RAMP.map((c, i) => (
              <Swatch key={c} color={c} label={['<4K', '4–12K', '12–25K', '>25K'][i]} />
            ))}
            <SourceChip source="worldpop" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted">people per km²</p>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-secondary">
              <input
                type="checkbox"
                checked={overlays.vulnerable}
                onChange={() => toggleOverlay('vulnerable')}
                className="accent-[#2563EB]"
              />
              show vulnerable sites
            </label>
          </div>
        </div>
      )}
      {activeLayer === 'green' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {GREEN_RAMP.map((c, i) => (
              <Swatch key={c} color={c} label={['<12%', '12–30%', '30–60%', '>60%'][i]} />
            ))}
            <SourceChip source="esa-worldcover" />
          </div>
          <p className="text-[10px] text-muted">% vegetated — tree cover, grassland, cropland</p>
        </div>
      )}
      {activeLayer === 'traffic' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Swatch color="#199A55" label="free flow" />
            <Swatch color="#DFA700" label="slow" />
            <Swatch color="#D63A2F" label="jammed" />
            <SourceChip source="tomtom" />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-secondary">
            <input
              type="checkbox"
              checked={overlays.traffic}
              onChange={() => toggleOverlay('traffic')}
              className="accent-[#2563EB]"
            />
            congestion colouring
          </label>
        </div>
      )}
      {activeLayer === 'sources' && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Swatch color="#D63A2F" label="fire (VIIRS, sized by FRP)" />
            <Swatch color="#C25518" label="industrial land use" />
            <Swatch color="#6F6F65" label="construction" />
            <Swatch color="#6C58C9" label="road corridor" />
          </div>
          <div className="flex gap-1">
            <SourceChip source="firms" />
            <SourceChip source="osm" />
          </div>
        </div>
      )}
    </div>
  );
}
