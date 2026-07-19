import { useState } from 'react';
import { ExternalLink, Info, Languages } from 'lucide-react';
import type { InspectResult, RankedAction } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { buildAdvisory } from '../../lib/narrative';
import { bandByKey } from '../../lib/aqi';
import OrderDraftModal from './OrderDraftModal';

const SEVERITY_STYLE: Record<RankedAction['severity'], { dot: string; label: string }> = {
  critical: { dot: '#8C2A2A', label: 'CRITICAL' },
  high: { dot: '#D63A2F', label: 'HIGH' },
  medium: { dot: '#DFA700', label: 'MEDIUM' },
  low: { dot: '#2563EB', label: 'LOW' },
};

/** Section 6 — ranked, statutorily grounded recommended actions. */
export default function ActionsPanel({ inspect }: { inspect: InspectResult }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [draftFor, setDraftFor] = useState<RankedAction | null>(null);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const place = useAppStore((s) => s.place);
  const actions = inspect.actions.filter((a) => !dismissed.includes(a.id));

  const advisory = buildAdvisory(
    inspect.airQuality.aqi,
    bandByKey(inspect.airQuality.band).label,
    place?.language ?? 'en',
  );

  return (
    <section className="px-4 py-4">
      <h3 className="mb-2 flex items-center justify-between font-display text-2xs font-medium uppercase tracking-widest text-muted">
        Recommended actions
        <span
          className="flex cursor-help items-center gap-1 normal-case tracking-normal text-muted"
          title="Ranked by estimated AQI reduction × exposed population × feasibility — an action helping 400,000 people modestly outranks one helping 4,000 a lot."
        >
          <Info size={11} /> ranking
        </span>
      </h3>
      {actions.length === 0 ? (
        <p className="rounded border border-line bg-elevated/50 px-3 py-3 text-2xs text-secondary">
          Air quality is within acceptable limits at this location. No interventions recommended.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {actions.map((a) => {
            const sev = SEVERITY_STYLE[a.severity];
            return (
              <li key={a.id} className="rounded border border-line bg-elevated/40 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-secondary">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: sev.dot }} />
                    {sev.label}
                  </span>
                  <span className="font-mono text-[11px] capitalize text-muted" title={`rank score ${a.rankScore}`}>
                    {a.category} · {a.rankScore.toFixed(2)}
                  </span>
                </div>
                <p className="text-2xs font-medium leading-snug text-primary">{a.action}</p>
                <dl className="mt-2 space-y-1 text-[11px] leading-relaxed">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted">Why</dt>
                    <dd className="text-secondary">{a.reasoning}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted">Who</dt>
                    <dd className="text-secondary">{a.agency}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted">Legal basis</dt>
                    <dd className="text-secondary">
                      <a
                        href={a.legalBasisUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-accent"
                      >
                        {a.legalBasis} <ExternalLink size={9} />
                      </a>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted">Est. effect</dt>
                    <dd className="font-mono text-secondary">
                      {a.estimatedEffect.aqiDelta[0]} to {a.estimatedEffect.aqiDelta[1]} AQI within{' '}
                      {a.estimatedEffect.withinHours}h
                    </dd>
                  </div>
                </dl>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setDraftFor(a)}
                    className="rounded border border-accent-dim bg-accent-dim/60 px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent-dim"
                  >
                    Generate order draft
                  </button>
                  <button
                    onClick={() => setDismissed((d) => [...d, a.id])}
                    className="rounded border border-line px-2.5 py-1 text-[11px] text-muted hover:text-secondary"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        onClick={() => setShowAdvisory((v) => !v)}
        className="mt-3 flex items-center gap-1.5 text-[11px] text-muted hover:text-accent"
      >
        <Languages size={11} /> citizen advisory ({advisory.language})
      </button>
      {showAdvisory && (
        <div className="mt-2 rounded border border-line bg-elevated/50 px-3 py-2.5 animate-fade-up">
          <p className="mb-1 text-2xs font-medium text-primary">{advisory.title}</p>
          <p className="text-2xs leading-relaxed text-secondary">{advisory.body}</p>
        </div>
      )}
      {draftFor && place && (
        <OrderDraftModal action={draftFor} inspect={inspect} placeName={place.displayName} onClose={() => setDraftFor(null)} />
      )}
    </section>
  );
}
