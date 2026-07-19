import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { PollutantOrAqi, Station } from '../types';

export interface GridCell {
  id: number;
  centroid: [number, number]; // lon, lat
  polygon: Feature<Polygon>;
}

/**
 * Build a square grid over the boundary once per place; values are then
 * interpolated onto it per pollutant / time step. Interior cells are kept
 * whole; edge cells are geometrically clipped so the choropleth stops exactly
 * at the administrative boundary.
 */
export function buildGrid(boundary: Polygon | MultiPolygon, targetCells = 700): GridCell[] {
  const feature = turf.feature(boundary) as Feature<Polygon | MultiPolygon>;
  const bbox = turf.bbox(feature);
  const areaKm2 = turf.area(feature) / 1e6;
  const cellSide = Math.max(0.4, Math.sqrt(areaKm2 / targetCells));
  const grid = turf.squareGrid(bbox, cellSide, { units: 'kilometers' });
  const cells: GridCell[] = [];
  let id = 0;
  for (const cell of grid.features) {
    const ring = cell.geometry.coordinates[0];
    const cornersInside = ring
      .slice(0, 4)
      .filter((c) => turf.booleanPointInPolygon(turf.point(c), feature)).length;
    const centroid = turf.centroid(cell).geometry.coordinates as [number, number];
    if (cornersInside === 4) {
      cells.push({ id: id++, centroid, polygon: cell as Feature<Polygon> });
    } else if (cornersInside > 0 || turf.booleanIntersects(cell, feature)) {
      try {
        const clipped = turf.intersect(turf.featureCollection([cell as Feature<Polygon>, feature as Feature<Polygon>]));
        if (clipped) {
          cells.push({ id: id++, centroid, polygon: clipped as Feature<Polygon> });
        }
      } catch {
        cells.push({ id: id++, centroid, polygon: cell as Feature<Polygon> });
      }
    }
  }
  return cells;
}

/** Inverse-distance-weighted value at a point from station readings. */
export function idwAt(
  lon: number,
  lat: number,
  stations: Station[],
  key: Exclude<PollutantOrAqi, 'aqi'> | 'aqi',
  power = 2,
): number {
  let num = 0;
  let den = 0;
  for (const s of stations) {
    const dx = (s.lon - lon) * Math.cos((lat * Math.PI) / 180);
    const dy = s.lat - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-10) return s[key];
    const w = 1 / Math.pow(d2, power / 2);
    num += w * s[key];
    den += w;
  }
  return den > 0 ? num / den : 0;
}

/**
 * Interpolate a surface onto the grid. `multiplier` scales values (used by the
 * forecast time scrubber); `spatialJitter` keeps the surface from looking
 * uniform when scaled.
 */
export function interpolateSurface(
  cells: GridCell[],
  stations: Station[],
  key: PollutantOrAqi,
  multiplier = 1,
): FeatureCollection {
  const features = cells.map((cell) => {
    const v = idwAt(cell.centroid[0], cell.centroid[1], stations, key) * multiplier;
    return {
      ...cell.polygon,
      id: cell.id,
      properties: { value: Math.round(v * 10) / 10 },
    };
  });
  return { type: 'FeatureCollection', features };
}
