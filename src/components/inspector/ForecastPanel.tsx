import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InspectResult } from '../../types';
import { AQI_BANDS, bandByKey } from '../../lib/aqi';
import { formatDayTimeIST } from '../../lib/format';
import SourceChip from '../shared/SourceChip';

/** Section 5 — 72h forecast with CPCB band backgrounds and CI ribbon. */
export default function ForecastPanel({ inspect }: { inspect: InspectResult }) {
  const series = inspect.forecast.series.map((s) => ({
    ...s,
    band: [s.lower, s.upper] as [number, number],
  }));
  const crossing = inspect.forecast.crossesBandAt;
  const maxY = Math.max(...series.map((s) => s.upper)) * 1.1;

  return (
    <section className="border-b border-line px-4 py-4">
      <h3 className="mb-1 flex items-center gap-2 font-display text-2xs font-medium uppercase tracking-widest text-muted">
        72-hour forecast <SourceChip source="model" />
      </h3>
      {crossing && (
        <p className="mb-2 text-2xs text-secondary">
          Crosses into{' '}
          <span style={{ color: bandByKey(crossing.band).color }}>{bandByKey(crossing.band).label}</span> in{' '}
          <span className="font-mono text-primary">{crossing.offsetHours} hours</span> —{' '}
          <span className="font-mono">{formatDayTimeIST(crossing.at)}</span>
        </p>
      )}
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
            {AQI_BANDS.map((b) =>
              b.min < maxY ? (
                <ReferenceArea
                  key={b.key}
                  y1={b.min}
                  y2={Math.min(b.max, maxY)}
                  fill={b.color}
                  fillOpacity={0.08}
                  stroke="none"
                />
              ) : null,
            )}
            <XAxis
              dataKey="offsetHours"
              ticks={[0, 12, 24, 36, 48, 60, 72]}
              tickFormatter={(h: number) => (h === 0 ? 'now' : `+${h}h`)}
              tick={{ fill: '#45566B', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#D8DFE7' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, Math.ceil(maxY / 50) * 50]}
              tick={{ fill: '#45566B', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: '#B6C1CD', strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #D8DFE7',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'IBM Plex Mono',
                color: '#172333',
                boxShadow: '0 4px 12px rgba(23, 35, 51, 0.12)',
              }}
              labelFormatter={(h) => (h === 0 ? 'now' : `+${h} hours`)}
              formatter={(value: any, name: any) =>
                name === 'band'
                  ? [`${value[0]}–${value[1]}`, 'range']
                  : [value, 'AQI']
              }
            />
            <Area dataKey="band" fill="#2563EB" fillOpacity={0.12} stroke="none" isAnimationActive={false} />
            <Line
              dataKey="aqi"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {crossing && (
              <ReferenceLine
                x={crossing.offsetHours}
                stroke={bandByKey(crossing.band).color}
                strokeDasharray="4 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-muted">
        shaded ribbon = model confidence interval · band colours = CPCB categories
      </p>
    </section>
  );
}
