import { AlertTriangle } from 'lucide-react';
import type { InspectResult } from '../../types';
import { bandByKey, POLLUTANT_META } from '../../lib/aqi';
import { formatKm } from '../../lib/format';
import SourceChip from '../shared/SourceChip';

/** Section 2 — big AQI, dominant pollutant, table of readings vs CPCB norms. */
export default function AirQualityPanel({ inspect }: { inspect: InspectResult }) {
  const aq = inspect.airQuality;
  const band = bandByKey(aq.band);
  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 text-center">
        <div className="font-mono text-[48px] font-semibold leading-none" style={{ color: band.color }}>
          {aq.aqi}
        </div>
        <div className="mt-1 text-2xs text-secondary">
          <span style={{ color: band.color }}>{band.label}</span> · dominant pollutant{' '}
          {POLLUTANT_META[aq.dominantPollutant].label}
        </div>
      </div>
      <table className="w-full border-separate border-spacing-y-1">
        <tbody>
          {aq.pollutants.map((p) => {
            const meta = POLLUTANT_META[p.key];
            const frac = Math.min(1, p.ratio / 5);
            return (
              <tr key={p.key} className="text-2xs">
                <td className="w-12 py-0.5 font-mono text-secondary">{meta.label}</td>
                <td className="w-[86px] py-0.5 text-right font-mono text-primary">
                  {p.value.toFixed(1)}
                  <span className="ml-1 text-[9px] text-muted">{meta.unit}</span>
                </td>
                <td className="px-2 py-0.5">
                  <div
                    className="relative h-2 w-full rounded-full bg-elevated"
                    title={`${p.ratio.toFixed(2)}× the CPCB ${meta.standardNote} standard of ${p.standard} ${meta.unit}`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(3, frac * 100)}%`,
                        background: p.exceeds ? band.color : '#3A424F',
                      }}
                    />
                    {/* 1.0× norm marker */}
                    <span className="absolute top-[-2px] bottom-[-2px] w-px bg-muted" style={{ left: '20%' }} />
                  </div>
                </td>
                <td className="w-[74px] py-0.5 text-right font-mono">
                  <span className={p.exceeds ? 'text-aqi-poor' : 'text-muted'}>
                    {p.ratio.toFixed(1)}× norm
                  </span>
                </td>
                <td className="w-5 py-0.5 text-center">
                  {p.exceeds && <AlertTriangle size={11} className="inline text-aqi-poor" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        <SourceChip source="cpcb" />
        {aq.measurement === 'measured'
          ? `measured at ${aq.nearestStation.name}`
          : `interpolated from ${aq.stationCount} stations, nearest ${aq.nearestStation.name} ${formatKm(aq.nearestStation.distanceKm)}`}
      </p>
    </section>
  );
}
