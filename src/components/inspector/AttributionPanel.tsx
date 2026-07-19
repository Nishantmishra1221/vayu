import { ChevronDown, ChevronRight } from 'lucide-react';
import type { InspectResult } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import ConfidenceBar from '../shared/ConfidenceBar';
import SourceChip from '../shared/SourceChip';

const SOURCE_COLORS: Record<string, string> = {
  industrial: '#C25518',
  traffic: '#6C58C9',
  biomass: '#2F8A4B',
  dust: '#6F6F65',
  other: '#5A6675',
};

/**
 * Section 4 — why it is like this. Expanding a row draws its evidence on the
 * map via EvidenceOverlay.
 */
export default function AttributionPanel({ inspect }: { inspect: InspectResult }) {
  const expanded = useAppStore((s) => s.expandedEvidence);
  const setExpanded = useAppStore((s) => s.setExpandedEvidence);
  const attr = inspect.attribution;

  return (
    <section className="border-b border-line px-4 py-4">
      <h3 className="mb-2 font-display text-2xs font-medium uppercase tracking-widest text-muted">
        Why it is like this
      </h3>
      {/* stacked share bar — 2px gaps between segments */}
      <div className="mb-1.5 flex h-3 w-full gap-[2px] overflow-hidden rounded-sm">
        {attr.sources.map((s) => (
          <div
            key={s.key}
            title={`${s.label} ${s.sharePct}%`}
            style={{ width: `${s.sharePct}%`, background: SOURCE_COLORS[s.key] }}
          />
        ))}
      </div>
      <ConfidenceBar value={attr.confidence} label="attribution confidence" />
      <ul className="mt-3 space-y-1">
        {attr.sources.map((s) => {
          const isOpen = expanded === s.key;
          const hasEvidence = s.evidence.features.length > 0;
          return (
            <li key={s.key} className="rounded border border-transparent">
              <button
                onClick={() => setExpanded(isOpen ? null : s.key)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-2xs transition-colors ${
                  isOpen ? 'bg-elevated' : 'hover:bg-elevated/60'
                }`}
              >
                {isOpen ? (
                  <ChevronDown size={12} className="shrink-0 text-secondary" />
                ) : (
                  <ChevronRight size={12} className="shrink-0 text-muted" />
                )}
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: SOURCE_COLORS[s.key] }}
                />
                <span className="w-[118px] shrink-0 text-secondary">{s.label}</span>
                <span className="w-9 shrink-0 text-right font-mono text-primary">{s.sharePct}%</span>
                <span className="truncate text-muted">▸ {s.evidenceSummary}</span>
              </button>
              {isOpen && (
                <div className="ml-7 border-l border-line py-1.5 pl-3 text-[11px] text-secondary animate-fade-up">
                  {hasEvidence ? (
                    <>
                      Evidence drawn on the map — {s.evidence.features.length} feature
                      {s.evidence.features.length > 1 ? 's' : ''} plus the upwind back-trajectory cone.
                    </>
                  ) : (
                    <>No mappable features for this source — share estimated from regional context.</>
                  )}{' '}
                  <SourceChip source={s.key === 'biomass' ? 'firms' : s.key === 'traffic' ? 'tomtom' : 'model'} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded border border-line bg-elevated/50 px-3 py-2 text-2xs leading-relaxed text-secondary">
        {attr.explanation}
      </p>
    </section>
  );
}
