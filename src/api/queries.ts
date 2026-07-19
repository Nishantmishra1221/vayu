import { useQuery } from '@tanstack/react-query';
import type { Place } from '../types';
import { getForecast, getSnapshot, reverseGeocode } from './client';
import { buildInspect } from '../lib/inspect';

export function useSnapshot(place: Place | null) {
  return useQuery({
    queryKey: ['snapshot', place?.placeId],
    queryFn: () => getSnapshot(place!),
    enabled: !!place,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useForecast(place: Place | null) {
  return useQuery({
    queryKey: ['forecast', place?.placeId],
    queryFn: () => getForecast(place!),
    enabled: !!place,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useInspect(place: Place | null, point: { lat: number; lon: number } | null) {
  return useQuery({
    queryKey: ['inspect', place?.placeId, point?.lat, point?.lon],
    queryFn: async () => {
      const [snapshot, forecast] = await Promise.all([getSnapshot(place!), getForecast(place!)]);
      const name = await reverseGeocode(point!.lat, point!.lon); // best-effort, offline-safe
      return buildInspect(place!, snapshot, forecast, point!.lat, point!.lon, name);
    },
    enabled: !!place && !!point,
    staleTime: 5 * 60_000,
    retry: 0,
  });
}
