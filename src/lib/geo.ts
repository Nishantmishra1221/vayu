import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Station } from '../types';

/** Distance in km between two lon/lat points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  return turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' });
}

export function pointInBoundary(lon: number, lat: number, boundary: Polygon | MultiPolygon): boolean {
  return turf.booleanPointInPolygon(turf.point([lon, lat]), turf.feature(boundary) as Feature<Polygon | MultiPolygon>);
}

export function nearestStation(lon: number, lat: number, stations: Station[]) {
  let best: Station | null = null;
  let bestD = Infinity;
  for (const s of stations) {
    const d = distanceKm([lon, lat], [s.lon, s.lat]);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best ? { station: best, distanceKm: bestD } : null;
}

/**
 * Upwind back-trajectory cone from a point. windFromDeg is the meteorological
 * direction the wind blows FROM — the cone opens toward that direction,
 * i.e. toward where the pollution came from.
 */
export function upwindCone(
  lon: number,
  lat: number,
  windFromDeg: number,
  lengthKm = 8,
  halfAngleDeg = 22,
): Feature<Polygon> {
  const origin = turf.point([lon, lat]);
  const steps = 8;
  const arc: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = windFromDeg - halfAngleDeg + (2 * halfAngleDeg * i) / steps;
    const p = turf.destination(origin, lengthKm, bearing, { units: 'kilometers' });
    arc.push(p.geometry.coordinates as [number, number]);
  }
  const ring: [number, number][] = [[lon, lat], ...arc, [lon, lat]];
  return turf.polygon([ring]);
}

/**
 * World-covering polygon with the boundary as a hole. Painted in the basemap
 * background colour above a choropleth, it clips the data exactly to the
 * administrative edge.
 */
export function inverseMask(boundary: Polygon | MultiPolygon): Feature<Polygon | MultiPolygon> {
  const world: [number, number][] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  const holes: [number, number][][] =
    boundary.type === 'Polygon'
      ? [boundary.coordinates[0] as [number, number][]]
      : boundary.coordinates.map((poly) => poly[0] as [number, number][]);
  return turf.polygon([world, ...holes]);
}

export function boundaryBbox(boundary: Polygon | MultiPolygon): [number, number, number, number] {
  return turf.bbox(turf.feature(boundary)) as [number, number, number, number];
}

export function emptyFC(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
