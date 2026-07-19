import { Download, X } from 'lucide-react';
import type { InspectResult } from '../../types';
import { formatCoord } from '../../lib/format';
import { downloadReport } from '../../lib/report';
import { useAppStore } from '../../store/useAppStore';
import SourceChip from '../shared/SourceChip';

export default function LocationHeader({ inspect }: { inspect: InspectResult }) {
  const closeInspector = useAppStore((s) => s.closeInspector);
  const place = useAppStore((s) => s.place);
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="font-display text-sm font-semibold leading-tight text-primary">
          {inspect.location.name}
        </h2>
        <p className="mt-0.5 flex items-center gap-2 font-mono text-2xs text-secondary">
          {formatCoord(inspect.location.lat)}, {formatCoord(inspect.location.lon)}
          <SourceChip source="osm" title="Reverse geocoded via Nominatim / OSM" />
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {place && (
          <button
            onClick={() => downloadReport(inspect, place)}
            title="Download the full inspection report (open it and press Ctrl+P to save as PDF)"
            className="flex items-center gap-1.5 rounded border border-accent-dim bg-accent-dim/60 px-2.5 py-1.5 text-2xs font-medium text-accent transition-colors hover:bg-accent-dim"
          >
            <Download size={13} />
            Report
          </button>
        )}
        <button
          onClick={closeInspector}
          aria-label="Close inspector"
          className="rounded p-1 text-muted hover:bg-elevated hover:text-primary"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
