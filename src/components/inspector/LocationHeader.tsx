import { X } from 'lucide-react';
import type { InspectResult } from '../../types';
import { formatCoord } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import SourceChip from '../shared/SourceChip';

export default function LocationHeader({ inspect }: { inspect: InspectResult }) {
  const closeInspector = useAppStore((s) => s.closeInspector);
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
      <button
        onClick={closeInspector}
        aria-label="Close inspector"
        className="rounded p-1 text-muted hover:bg-elevated hover:text-primary"
      >
        <X size={16} />
      </button>
    </div>
  );
}
