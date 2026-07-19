import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getForecast, getSnapshot, resolvePlace } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { formatCompact, formatIN, windDirectionLabel } from '../../lib/format';
import type { GeocodeSuggestion } from '../../types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The resolving sequence: each checklist line appears as its data resolves.
 * Deliberately paced so the multi-source fusion is visible on screen.
 */
export function useResolveFlow() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setPlace = useAppStore((s) => s.setPlace);
  const setResolving = useAppStore((s) => s.setResolving);

  return useCallback(
    async (suggestion: GeocodeSuggestion) => {
      const push = (label: string, done = true) =>
        useAppStore.setState((s) => ({
          resolving: [...(s.resolving ?? []).map((x) => ({ ...x, done: true })), { label, done }],
        }));
      setResolving([{ label: 'Resolving boundary…', done: false }]);
      try {
        const place = await resolvePlace(suggestion);
        useAppStore.setState({
          resolving: [
            {
              label: `Boundary resolved — ${place.displayName.split(',')[0]}, ${formatIN(place.areaKm2)} km²`,
              done: true,
            },
          ],
        });
        await wait(140);

        const snapshot = await getSnapshot(place);
        queryClient.setQueryData(['snapshot', place.placeId], snapshot);
        push(`${snapshot.stations.length} monitoring stations in bounds`);
        await wait(140);

        const w = snapshot.weather;
        push(
          `Meteorology — wind ${Math.round(w.windSpeedKmh)} km/h ${windDirectionLabel(w.windDirectionDeg)}, boundary layer ${Math.round(w.boundaryLayerHeightM)} m`,
        );
        await wait(140);

        push(`${snapshot.summary.activeFires24h} active fire detections within 100 km`);
        await wait(140);

        push(`Population inside boundary — ${formatCompact(snapshot.summary.populationTotal)}`);
        await wait(140);

        push('Building forecast grid…', false);
        const forecast = await getForecast(place);
        queryClient.setQueryData(['forecast', place.placeId], forecast);
        await wait(220);

        setPlace(place);
        setResolving(null);
        navigate(`/city/${place.placeId}`);
        return true;
      } catch (e) {
        const msg =
          e instanceof Error && e.message === 'rate-limited'
            ? 'Search is rate limited. Try again in a moment.'
            : `No boundary found for "${suggestion.displayName.split(',')[0]}". Try a city, district, or ward name.`;
        useAppStore.setState((s) => ({
          resolving: [...(s.resolving ?? []), { label: msg, done: false }],
        }));
        await wait(1800);
        setResolving(null);
        return false;
      }
    },
    [queryClient, setPlace, setResolving, navigate],
  );
}
