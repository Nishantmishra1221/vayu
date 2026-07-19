import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useInspect } from '../../api/queries';
import LocationHeader from './LocationHeader';
import AirQualityPanel from './AirQualityPanel';
import ExposurePanel from './ExposurePanel';
import AttributionPanel from './AttributionPanel';
import ForecastPanel from './ForecastPanel';
import ActionsPanel from './ActionsPanel';
import Skeleton from '../shared/Skeleton';

/**
 * The slide-in right inspector — the core interaction. Overlays the map
 * (which never resizes) at a fixed 380px.
 */
export default function Inspector() {
  const place = useAppStore((s) => s.place);
  const inspector = useAppStore((s) => s.inspector);
  const closeInspector = useAppStore((s) => s.closeInspector);
  const { data: inspect, isLoading, isError } = useInspect(place, inspector);

  useEffect(() => {
    if (!inspector) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInspector();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspector, closeInspector]);

  if (!inspector) return null;

  return (
    <aside
      className="animate-slide-in absolute bottom-0 right-0 top-0 z-30 flex w-[380px] flex-col border-l border-line bg-panel/95 shadow-2xl backdrop-blur-sm"
      aria-label="Location inspector"
    >
      {isLoading && (
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-14 w-24 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {isError && (
        <div className="p-4 text-2xs text-secondary">
          Could not build the inspection for this point.{' '}
          <button className="text-accent" onClick={() => useAppStore.getState().openInspector(inspector.lat, inspector.lon)}>
            Retry
          </button>
        </div>
      )}
      {inspect && (
        <div className="flex-1 overflow-y-auto">
          <LocationHeader inspect={inspect} />
          {!inspect.location.insideBoundary && (
            <p className="flex items-center gap-2 border-b border-line bg-aqi-moderate/10 px-4 py-2 text-[10px] text-aqi-moderate">
              <AlertTriangle size={12} className="shrink-0" />
              Outside the selected boundary — data may be less reliable here.
            </p>
          )}
          <AirQualityPanel inspect={inspect} />
          <ExposurePanel inspect={inspect} />
          <AttributionPanel inspect={inspect} />
          <ForecastPanel inspect={inspect} />
          <ActionsPanel inspect={inspect} />
        </div>
      )}
    </aside>
  );
}
