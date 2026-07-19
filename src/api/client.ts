import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Forecast, GeocodeSuggestion, Place, Snapshot } from '../types';
import { STATE_LANGUAGE } from '../lib/narrative';
import { synthForecast, synthSnapshot } from '../lib/synth';

import delhiB from '../mocks/boundaries/delhi.json';
import mumbaiB from '../mocks/boundaries/mumbai.json';
import kanpurB from '../mocks/boundaries/kanpur.json';
import kharagpurB from '../mocks/boundaries/kharagpur.json';

/**
 * Data access layer. VITE_USE_MOCKS (default true) serves everything from
 * fixtures + deterministic synthesis so the demo runs with the network
 * unplugged. Live geocoding via Nominatim is attempted when available and
 * degrades silently to fixtures.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

interface BoundaryFixture {
  displayName: string;
  state: string;
  centroid: number[];
  bbox: number[];
  areaKm2: number;
  boundary: Polygon;
}

const FIXTURES: Record<string, { fixture: BoundaryFixture; label: string }> = {
  delhi: { fixture: delhiB as unknown as BoundaryFixture, label: 'Delhi, India' },
  mumbai: { fixture: mumbaiB as unknown as BoundaryFixture, label: 'Mumbai, Maharashtra, India' },
  kanpur: { fixture: kanpurB as unknown as BoundaryFixture, label: 'Kanpur, Uttar Pradesh, India' },
  kharagpur: { fixture: kharagpurB as unknown as BoundaryFixture, label: 'Kharagpur, West Bengal, India' },
};

export const EXAMPLE_CHIPS = ['Delhi', 'Mumbai', 'Kanpur', 'Kharagpur'];

function placeFromFixture(id: string): Place {
  const { fixture } = FIXTURES[id];
  return {
    placeId: id,
    displayName: fixture.displayName,
    state: fixture.state,
    language: STATE_LANGUAGE[fixture.state] ?? 'en',
    centroid: fixture.centroid as [number, number],
    bbox: fixture.bbox as [number, number, number, number],
    areaKm2: fixture.areaKm2,
    boundary: fixture.boundary,
    sources: ['nominatim'],
    fetchedAt: new Date().toISOString(),
  };
}

// ————————————————————— geocoding —————————————————————

export async function searchPlaces(q: string): Promise<GeocodeSuggestion[]> {
  const query = q.trim().toLowerCase();
  const fixtureHits: GeocodeSuggestion[] = Object.entries(FIXTURES)
    .filter(([id, f]) => id.startsWith(query) || f.label.toLowerCase().includes(query))
    .map(([id, f]) => ({
      displayName: f.label,
      osmType: 'fixture',
      osmId: 0,
      lat: f.fixture.centroid[1],
      lon: f.fixture.centroid[0],
      fixtureId: id,
    }));

  let liveHits: GeocodeSuggestion[] = [];
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(q + ', India')}&format=jsonv2&limit=5&addressdetails=1`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );
    clearTimeout(t);
    if (res.status === 429) throw new Error('rate-limited');
    if (res.ok) {
      const data = (await res.json()) as any[];
      liveHits = data
        .filter((d) => d.osm_type && d.osm_id)
        .map((d) => ({
          displayName: d.display_name as string,
          osmType: d.osm_type as string,
          osmId: d.osm_id as number,
          lat: parseFloat(d.lat),
          lon: parseFloat(d.lon),
        }));
    }
  } catch {
    // offline or rate limited — fixtures still work
  }

  const seen = new Set(fixtureHits.map((f) => f.displayName.split(',')[0].toLowerCase()));
  const merged = [
    ...fixtureHits,
    ...liveHits.filter((h) => !seen.has(h.displayName.split(',')[0].toLowerCase())),
  ];
  return merged.slice(0, 5);
}

/** Resolve a suggestion into a Place with a real boundary polygon. */
export async function resolvePlace(s: GeocodeSuggestion): Promise<Place> {
  if (s.fixtureId) return placeFromFixture(s.fixtureId);

  const typeChar = s.osmType === 'relation' ? 'R' : s.osmType === 'way' ? 'W' : 'N';
  const res = await fetch(
    `${NOMINATIM}/lookup?osm_ids=${typeChar}${s.osmId}&format=jsonv2&polygon_geojson=1&addressdetails=1`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 429) throw new Error('rate-limited');
  if (!res.ok) throw new Error(`geocoder error ${res.status}`);
  const data = (await res.json()) as any[];
  const hit = data[0];
  let boundary: Polygon | MultiPolygon;
  if (hit?.geojson && (hit.geojson.type === 'Polygon' || hit.geojson.type === 'MultiPolygon')) {
    const simplified = turf.simplify(turf.feature(hit.geojson), { tolerance: 0.001, highQuality: false });
    boundary = simplified.geometry as Polygon | MultiPolygon;
  } else {
    // no polygon available (a landmark / node) — approximate with a 5 km buffer
    const buffered = turf.buffer(turf.point([s.lon, s.lat]), 5, { units: 'kilometers' }) as Feature<Polygon>;
    boundary = buffered.geometry;
  }
  const feature = turf.feature(boundary);
  const bbox = turf.bbox(feature) as [number, number, number, number];
  const areaKm2 = Math.round(turf.area(feature) / 1e6);
  const state = hit?.address?.state ?? '';
  const shortName = s.displayName.split(',').slice(0, 2).join(',');
  return {
    placeId: `osm-${typeChar}${s.osmId}`,
    displayName: shortName,
    state,
    language: STATE_LANGUAGE[state] ?? 'en',
    centroid: turf.centroid(feature).geometry.coordinates as [number, number],
    bbox,
    areaKm2,
    boundary,
    sources: ['nominatim'],
    fetchedAt: new Date().toISOString(),
  };
}

// ————————————————————— reverse geocode (best-effort, cached) —————————————————————

const reverseCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=16`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );
    clearTimeout(t);
    if (!res.ok) return undefined;
    const d = (await res.json()) as any;
    const a = d.address ?? {};
    const name =
      [a.suburb ?? a.neighbourhood ?? a.village ?? a.town, a.city ?? a.state_district ?? a.county]
        .filter(Boolean)
        .join(', ') || (d.display_name as string)?.split(',').slice(0, 2).join(',');
    if (name) reverseCache.set(key, name);
    return name;
  } catch {
    return undefined;
  }
}

// ————————————————————— snapshot / forecast —————————————————————

const snapshotCache = new Map<string, Snapshot>();
const forecastCache = new Map<string, Forecast>();

export async function getSnapshot(place: Place): Promise<Snapshot> {
  if (USE_MOCKS) {
    let s = snapshotCache.get(place.placeId);
    if (!s) {
      s = synthSnapshot(place);
      snapshotCache.set(place.placeId, s);
    }
    return s;
  }
  const res = await fetch(`/api/snapshot?placeId=${encodeURIComponent(place.placeId)}`);
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  return res.json();
}

export async function getForecast(place: Place): Promise<Forecast> {
  if (USE_MOCKS) {
    let f = forecastCache.get(place.placeId);
    if (!f) {
      f = synthForecast(place, await getSnapshot(place));
      forecastCache.set(place.placeId, f);
    }
    return f;
  }
  const res = await fetch(`/api/forecast?placeId=${encodeURIComponent(place.placeId)}`);
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  return res.json();
}
