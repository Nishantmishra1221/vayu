import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { suggestionForPlaceId } from '../api/client';
import { useResolveFlow } from '../components/search/useResolveFlow';
import BasemapToggle from '../components/map/BasemapToggle';
import MapLegend from '../components/map/MapLegend';
import TimeScrubber from '../components/map/TimeScrubber';
import Inspector from '../components/inspector/Inspector';

/**
 * Route "/city/:placeId" — the command centre. Resolves the place from the URL
 * when arriving via deep link; overlays shift left when the inspector opens so
 * nothing hides behind it.
 */
export default function CityPage() {
  const { placeId } = useParams<{ placeId: string }>();
  const place = useAppStore((s) => s.place);
  const inspector = useAppStore((s) => s.inspector);
  const resolve = useResolveFlow();
  const [failed, setFailed] = useState(false);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!placeId || place?.placeId === placeId) return;
    if (startedFor.current === placeId) return; // StrictMode / re-render guard
    startedFor.current = placeId;
    const suggestion = suggestionForPlaceId(placeId);
    if (!suggestion) {
      setFailed(true);
      return;
    }
    resolve(suggestion).then((ok) => {
      if (!ok) setFailed(true);
    });
  }, [placeId, place, resolve]);

  if (failed) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-base/60">
        <p className="text-2xs text-secondary">
          No boundary found for &ldquo;{placeId}&rdquo;. Try a city, district, or ward name.
        </p>
        <Link
          to="/"
          className="rounded border border-accent-dim px-3 py-1.5 text-2xs text-accent hover:bg-accent-dim/50"
        >
          Back to search
        </Link>
      </div>
    );
  }

  if (!place || place.placeId !== placeId) return null; // checklist overlay is showing

  return (
    <>
      {/* Everything inside this wrapper shifts left while the inspector is open */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-20 transition-all duration-200 ${
          inspector ? 'right-0 sm:right-[380px]' : 'right-0'
        }`}
      >
        <BasemapToggle />
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
          <MapLegend />
          <TimeScrubber />
        </div>
      </div>
      <Inspector />
    </>
  );
}
