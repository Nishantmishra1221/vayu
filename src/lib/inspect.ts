import * as turf from '@turf/turf';
import type { Feature, FeatureCollection } from 'geojson';
import type {
  AttributionSource,
  Forecast,
  ForecastStep,
  InspectResult,
  Place,
  PollutantKey,
  Snapshot,
} from '../types';
import { bandFor, CPCB_STANDARDS, POLLUTANT_META, POLLUTANT_KEYS } from './aqi';
import { evaluateActions, type LocationContext } from './actions';
import { distanceKm, nearestStation, pointInBoundary, upwindCone } from './geo';
import { idwAt } from './interpolate';
import { buildExplanation } from './narrative';
import { coordNoise, rngFor } from './rng';
import { windDirectionLabel } from './format';

/**
 * Builds the full inspect payload for a clicked point, entirely client-side,
 * from the snapshot + forecast already loaded for the place. Deterministic per
 * coordinate. When a backend arrives it serves the same shape from
 * POST /api/inspect.
 */
export function buildInspect(
  place: Place,
  snapshot: Snapshot,
  forecast: Forecast,
  lat: number,
  lon: number,
  resolvedName?: string,
): InspectResult {
  const insideBoundary = pointInBoundary(lon, lat, place.boundary);
  const near = nearestStation(lon, lat, snapshot.stations);

  // ————— air quality at point: IDW from stations —————
  const aqi = Math.round(idwAt(lon, lat, snapshot.stations, 'aqi'));
  const pollutantValues = {} as Record<PollutantKey, number>;
  for (const key of POLLUTANT_KEYS) {
    pollutantValues[key] = Math.round(idwAt(lon, lat, snapshot.stations, key) * 10) / 10;
  }
  const pollutants = POLLUTANT_KEYS.map((key) => {
    const value = pollutantValues[key];
    const standard = CPCB_STANDARDS[key];
    return {
      key,
      value,
      unit: POLLUTANT_META[key].unit,
      standard,
      ratio: Math.round((value / standard) * 100) / 100,
      exceeds: value > standard,
    };
  });
  const dominantPollutant = [...pollutants].sort((a, b) => b.ratio - a.ratio)[0].key;
  const measured = near !== null && near.distanceKm < 0.5;

  // ————— exposure from grids —————
  const pt = turf.point([lon, lat]);
  let density = 0;
  let greenPct = snapshot.summary.greenCoverPct;
  for (const f of snapshot.populationGrid.features) {
    if (turf.booleanPointInPolygon(pt, f as Feature<any>)) {
      density = (f.properties as any).value ?? 0;
      break;
    }
  }
  for (const f of snapshot.greenGrid.features) {
    if (turf.booleanPointInPolygon(pt, f as Feature<any>)) {
      greenPct = (f.properties as any).value ?? greenPct;
      break;
    }
  }
  if (density === 0) {
    // outside grid (e.g. click outside boundary) — coarse fallback
    density = Math.round((snapshot.summary.populationTotal / place.areaKm2) * 0.4);
  }
  const populationWithin2km = Math.round(density * Math.PI * 4);
  const n = coordNoise(lat, lon, 'sites');
  const schools = Math.max(1, Math.round((density / 4000) * (4 + n * 10)));
  const hospitals = Math.max(0, Math.round((density / 8000) * (1 + n * 4)));

  // ————— attribution: place-level prior adjusted by actual nearby evidence —————
  const windFrom = snapshot.weather.windDirectionDeg;
  const cone = upwindCone(lon, lat, windFrom, 10, 26);

  const upwindIndustrial = snapshot.industrialSites.filter((s) => {
    const c = turf.centroid(turf.feature(s.polygon));
    const d = distanceKm([lon, lat], c.geometry.coordinates as [number, number]);
    return d < 6 && (d < 2 || turf.booleanPointInPolygon(c, cone));
  });
  const upwindFires = snapshot.fires.filter((f) => {
    const d = distanceKm([lon, lat], [f.lon, f.lat]);
    if (d > 100) return false;
    const towardDeg = ((turf.bearing(turf.point([lon, lat]), turf.point([f.lon, f.lat])) % 360) + 360) % 360;
    const diff = Math.abs(((towardDeg - windFrom + 540) % 360) - 180);
    return diff > 120; // roughly within the upwind sector
  });
  const nearTraffic = snapshot.trafficSegments.filter(
    (t) => turf.pointToLineDistance(pt, turf.feature(t.geometry), { units: 'kilometers' }) < 3,
  );
  const congested = nearTraffic.filter((t) => t.ratio < 0.5);
  const nearConstruction = snapshot.constructionSites.filter(
    (c) => distanceKm([lon, lat], [c.lon, c.lat]) < 4,
  );

  const jitter = rngFor(`attr-${lat.toFixed(3)}-${lon.toFixed(3)}`);
  let wInd = 18 + upwindIndustrial.length * 9 + jitter() * 8;
  let wTraf = 14 + congested.length * 6 + (1 - snapshot.summary.congestionRatio) * 12 + jitter() * 8;
  let wBio = 6 + Math.min(30, upwindFires.length * 2.5) + jitter() * 6;
  let wDust = 6 + nearConstruction.length * 3 + jitter() * 5;
  let wOther = 8 + jitter() * 6;
  const total = wInd + wTraf + wBio + wDust + wOther;
  wInd = (wInd / total) * 100;
  wTraf = (wTraf / total) * 100;
  wBio = (wBio / total) * 100;
  wDust = (wDust / total) * 100;
  wOther = Math.max(0, 100 - wInd - wTraf - wBio - wDust);

  const fireFC: FeatureCollection = {
    type: 'FeatureCollection',
    features: upwindFires.map((f) =>
      turf.point([f.lon, f.lat], { frp: f.frp, district: f.district, withinBoundary: f.withinBoundary }),
    ),
  };
  const indFC: FeatureCollection = {
    type: 'FeatureCollection',
    features: upwindIndustrial.map((s) => turf.feature(s.polygon, { name: s.name })),
  };
  const trafFC: FeatureCollection = {
    type: 'FeatureCollection',
    features: congested.map((t) => turf.feature(t.geometry, { ratio: t.ratio, road: t.road })),
  };
  const dustFC: FeatureCollection = {
    type: 'FeatureCollection',
    features: nearConstruction.map((c) => turf.point([c.lon, c.lat], { name: c.name })),
  };

  const dir = windDirectionLabel(windFrom);
  const sources: AttributionSource[] = [
    {
      key: 'industrial',
      label: 'Industrial',
      sharePct: Math.round(wInd),
      evidenceSummary: upwindIndustrial.length
        ? `${upwindIndustrial.length} unit${upwindIndustrial.length > 1 ? 's' : ''} within 6 km upwind (${dir})`
        : 'no major units nearby — regional background',
      evidence: indFC,
    },
    {
      key: 'traffic',
      label: 'Vehicular',
      sharePct: Math.round(wTraf),
      evidenceSummary: congested.length
        ? `congestion ${congested[0].ratio.toFixed(2)} on ${congested[0].road ?? 'nearby corridor'}`
        : `city congestion ratio ${snapshot.summary.congestionRatio.toFixed(2)}`,
      evidence: trafFC,
    },
    {
      key: 'biomass',
      label: 'Biomass burning',
      sharePct: Math.round(wBio),
      evidenceSummary: upwindFires.length
        ? `${upwindFires.length} VIIRS detections upwind, peak FRP ${Math.max(...upwindFires.map((f) => f.frp)).toFixed(1)}`
        : 'no upwind detections in 24h',
      evidence: fireFC,
    },
    {
      key: 'dust',
      label: 'Dust / construction',
      sharePct: Math.round(wDust),
      evidenceSummary: nearConstruction.length
        ? `${nearConstruction.length} active sites within 4 km`
        : 'road dust background',
      evidence: dustFC,
    },
    {
      key: 'other',
      label: 'Other',
      sharePct: Math.max(0, 100 - Math.round(wInd) - Math.round(wTraf) - Math.round(wBio) - Math.round(wDust)),
      evidenceSummary: 'residential, waste and secondary aerosol',
      evidence: { type: 'FeatureCollection', features: [] },
    },
  ].sort((a, b) => b.sharePct - a.sharePct) as AttributionSource[];

  const stationCount = snapshot.stations.length;
  const confidence = Math.round(
    Math.min(0.92, 0.45 + stationCount * 0.02 + (near && near.distanceKm < 5 ? 0.15 : 0.05) + (upwindFires.length || upwindIndustrial.length ? 0.08 : 0)) * 100,
  ) / 100;

  // ————— local forecast: city curve scaled to this point —————
  const cityNow = Math.max(1, forecast.cityLevel[0]?.aqi ?? snapshot.summary.aqi);
  const scale = aqi / cityNow;
  const series: ForecastStep[] = forecast.cityLevel.map((s) => ({
    offsetHours: s.offsetHours,
    aqi: Math.round(s.aqi * scale),
    lower: Math.round(s.lower * scale),
    upper: Math.round(s.upper * scale),
  }));
  const currentBandMax = bandFor(aqi).max;
  const crossing = series.find((s) => s.aqi > currentBandMax);
  const crossesBandAt = crossing
    ? {
        offsetHours: crossing.offsetHours,
        band: bandFor(crossing.aqi).key,
        at: new Date(new Date(forecast.issuedAt).getTime() + crossing.offsetHours * 3600_000).toISOString(),
      }
    : null;

  // ————— actions from the rule engine —————
  const ctx: LocationContext = {
    aqi,
    band: bandFor(aqi).key,
    forecastMaxAqi: Math.max(...series.map((s) => s.aqi)),
    forecastCrossesBand: crossesBandAt
      ? { band: crossesBandAt.band, offsetHours: crossesBandAt.offsetHours }
      : null,
    dominantPollutant,
    pollutants: pollutantValues,
    sourceShares: {
      industrial: wInd,
      traffic: wTraf,
      biomass: wBio,
      dust: wDust,
      other: wOther,
    },
    exposedPopulation: populationWithin2km,
    densityPerKm2: density,
    greenCoverPct: greenPct,
    congestionRatio: congested.length ? congested[0].ratio : snapshot.summary.congestionRatio,
    windSpeedKmh: snapshot.weather.windSpeedKmh,
    windDirectionDegForText: windFrom,
    boundaryLayerHeightM: snapshot.weather.boundaryLayerHeightM,
    precipitationMm: snapshot.weather.precipitationMm,
    firesOutsideBoundary: upwindFires.filter((f) => !f.withinBoundary).length,
    firesWithin100km: upwindFires.length,
    fireCoords: upwindFires.map((f) => [f.lon, f.lat]),
    constructionSitesNearby: nearConstruction.length,
    stateName: place.state,
  };
  const actions = evaluateActions(ctx);

  const fallbackName = near
    ? `Near ${near.station.name}, ${place.displayName.split(',')[0]}`
    : place.displayName.split(',')[0];

  return {
    location: {
      name: resolvedName ?? fallbackName,
      lat: Math.round(lat * 1e4) / 1e4,
      lon: Math.round(lon * 1e4) / 1e4,
      insideBoundary: insideBoundary,
    },
    airQuality: {
      aqi,
      band: bandFor(aqi).key,
      dominantPollutant,
      measurement: measured ? 'measured' : 'interpolated',
      stationCount,
      nearestStation: near
        ? { name: near.station.name, distanceKm: Math.round(near.distanceKm * 10) / 10 }
        : { name: '—', distanceKm: 0 },
      pollutants,
    },
    exposure: {
      populationWithin2km,
      densityPerKm2: density,
      schools,
      hospitals,
      greenCoverPct: Math.round(greenPct * 10) / 10,
    },
    attribution: {
      confidence,
      sources,
      windBackTrajectory: cone,
      explanation: buildExplanation(ctx),
    },
    forecast: { series, crossesBandAt },
    actions,
  };
}
