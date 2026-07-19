import { lazy, Suspense, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useInspect } from '../../api/queries';
import LocationHeader from './LocationHeader';
import AirQualityPanel from './AirQualityPanel';
import ExposurePanel from './ExposurePanel';
import AttributionPanel from './AttributionPanel';
import ActionsPanel from './ActionsPanel';
import Skeleton from '../shared/Skeleton';

// Recharts is heavy — loading the chart panel on demand keeps it out of the
// initial bundle so the app paints sooner.
const ForecastPanel = lazy(() => import('./ForecastPanel'));

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
      className="animate-slide-in absolute bottom-0 right-0 top-0 z-30 flex w-full flex-col border-l border-line bg-panel/95 shadow-float backdrop-blur-sm sm:w-[380px]"
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
            <p className="flex items-center gap-2 border-b border-line bg-aqi-moderate/10 px-4 py-2 text-[11px] text-aqi-moderate">
              <AlertTriangle size={12} className="shrink-0" />
              Outside the selected boundary — data may be less reliable here.
            </p>
          )}
          <AirQualityPanel inspect={inspect} />
          <ExposurePanel inspect={inspect} />
          <AttributionPanel inspect={inspect} />
          <Suspense fallback={<Skeleton className="mx-4 my-4 h-40" />}>
            <ForecastPanel inspect={inspect} />
          </Suspense>
          <ActionsPanel inspect={inspect} />
        </div>
      )}
    </aside>
  );
}
