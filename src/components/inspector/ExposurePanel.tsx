import type { InspectResult } from '../../types';
import { formatIN } from '../../lib/format';
import SourceChip from '../shared/SourceChip';

/** Section 3 — who is exposed here. */
export default function ExposurePanel({ inspect }: { inspect: InspectResult }) {
  const e = inspect.exposure;
  const rows: [string, string, string][] = [
    ['Population within 2 km', formatIN(e.populationWithin2km), 'worldpop'],
    ['Population density', `${formatIN(e.densityPerKm2)} /km²`, 'worldpop'],
    ['Schools within 2 km', String(e.schools), 'osm'],
    ['Hospitals within 2 km', String(e.hospitals), 'osm'],
    ['Green cover in this cell', `${e.greenCoverPct.toFixed(1)}%`, 'esa-worldcover'],
  ];
  return (
    <section className="border-b border-line px-4 py-4">
      <h3 className="mb-2 font-display text-2xs font-medium uppercase tracking-widest text-muted">
        Who is exposed here
      </h3>
      <dl className="space-y-1.5">
        {rows.map(([label, value, source]) => (
          <div key={label} className="flex items-baseline justify-between text-2xs">
            <dt className="flex items-center gap-1.5 text-secondary">
              {label} <SourceChip source={source} />
            </dt>
            <dd className="font-mono text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
