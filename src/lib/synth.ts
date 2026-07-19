import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type {
  FireDetection,
  Forecast,
  ForecastStep,
  Place,
  PollutantKey,
  Snapshot,
  Station,
  TrafficSegment,
} from '../types';
import { bandFor } from './aqi';
import { buildGrid } from './interpolate';
import { pointInBoundary } from './geo';
import { rngFor } from './rng';

/**
 * Deterministic mock-data synthesis. Everything derives from the placeId seed,
 * so values are stable across reloads and the demo never depends on a backend.
 * The four demo cities carry tuned profiles; any other place gets a plausible
 * profile derived from its seed and latitude.
 */

interface CityProfile {
  baseAqi: number;
  /** multiplier applied to the +36h forecast peak, drives the GRAP demo */
  forecastPeakFactor: number;
  so2Bias: number; // multiplier on synthesized SO₂
  fireCount: number;
  congestionRatio: number;
  greenPct: number;
  populationTotal: number;
  windFromDeg: number;
  windKmh: number;
  blhM: number;
  stations?: { name: string; lat: number; lon: number; aqiDelta: number; so2?: number }[];
}

const PROFILES: Record<string, CityProfile> = {
  delhi: {
    baseAqi: 186,
    forecastPeakFactor: 2.2, // peaks ~410 → Severe, the GRAP Stage III demo
    so2Bias: 1.35,
    fireCount: 61,
    congestionRatio: 0.41,
    greenPct: 12.4,
    populationTotal: 20_600_000,
    windFromDeg: 315, // NW — stubble-burning corridor
    windKmh: 8.2,
    blhM: 420,
    stations: [
      { name: 'Anand Vihar', lat: 28.6469, lon: 77.3152, aqiDelta: 32, so2: 94 },
      { name: 'ITO', lat: 28.6289, lon: 77.241, aqiDelta: 12 },
      { name: 'R.K. Puram', lat: 28.5646, lon: 77.1747, aqiDelta: -8 },
      { name: 'Punjabi Bagh', lat: 28.674, lon: 77.131, aqiDelta: 18 },
      { name: 'Dwarka Sector 8', lat: 28.571, lon: 77.0719, aqiDelta: -14 },
      { name: 'Jahangirpuri', lat: 28.7328, lon: 77.1707, aqiDelta: 26 },
      { name: 'Okhla Phase 2', lat: 28.5311, lon: 77.274, aqiDelta: 6 },
      { name: 'Rohini', lat: 28.7325, lon: 77.12, aqiDelta: 14 },
      { name: 'Wazirpur', lat: 28.6997, lon: 77.1654, aqiDelta: 28, so2: 88 },
      { name: 'Mundka', lat: 28.6842, lon: 77.0313, aqiDelta: 22 },
      { name: 'Siri Fort', lat: 28.5504, lon: 77.2159, aqiDelta: -18 },
      { name: 'Bawana', lat: 28.7762, lon: 77.051, aqiDelta: 20, so2: 84 },
      { name: 'Narela', lat: 28.8227, lon: 77.1019, aqiDelta: 16 },
      { name: 'Nehru Nagar', lat: 28.5679, lon: 77.2506, aqiDelta: 4 },
    ],
  },
  mumbai: {
    baseAqi: 124,
    forecastPeakFactor: 1.25,
    so2Bias: 0.9,
    fireCount: 4,
    congestionRatio: 0.36,
    greenPct: 21.7,
    populationTotal: 12_400_000,
    windFromDeg: 250, // sea breeze
    windKmh: 14.6,
    blhM: 780,
    stations: [
      { name: 'Chembur', lat: 19.0522, lon: 72.8994, aqiDelta: 34, so2: 86 },
      { name: 'Bandra Kurla Complex', lat: 19.0653, lon: 72.8693, aqiDelta: 10 },
      { name: 'Andheri East', lat: 19.1178, lon: 72.8631, aqiDelta: 16 },
      { name: 'Powai', lat: 19.1197, lon: 72.9051, aqiDelta: -6 },
      { name: 'Borivali East', lat: 19.2307, lon: 72.8567, aqiDelta: -18 },
      { name: 'Kurla', lat: 19.0726, lon: 72.8845, aqiDelta: 20 },
      { name: 'Mulund West', lat: 19.1662, lon: 72.9422, aqiDelta: 2 },
      { name: 'Vile Parle West', lat: 19.1007, lon: 72.8376, aqiDelta: 6 },
    ],
  },
  kanpur: {
    baseAqi: 208,
    forecastPeakFactor: 1.45,
    so2Bias: 1.1,
    fireCount: 23,
    congestionRatio: 0.52,
    greenPct: 9.8,
    populationTotal: 3_100_000,
    windFromDeg: 300,
    windKmh: 6.4,
    blhM: 510,
  },
  kharagpur: {
    baseAqi: 132,
    forecastPeakFactor: 1.2,
    so2Bias: 0.95,
    fireCount: 9,
    congestionRatio: 0.68,
    greenPct: 28.4,
    populationTotal: 450_000,
    windFromDeg: 200,
    windKmh: 9.8,
    blhM: 690,
  },
};

export function profileFor(place: Place): CityProfile {
  const known = PROFILES[place.placeId];
  if (known) return known;
  const r = rngFor(place.placeId);
  const lat = place.centroid[1];
  const northBias = lat > 23 ? 45 : 0; // Indo-Gangetic plain runs dirtier
  return {
    baseAqi: Math.round(95 + r() * 90 + northBias),
    forecastPeakFactor: 1.15 + r() * 0.5,
    so2Bias: 0.8 + r() * 0.5,
    fireCount: Math.round(r() * 30),
    congestionRatio: 0.3 + r() * 0.4,
    greenPct: Math.round((8 + r() * 25) * 10) / 10,
    populationTotal: Math.round(place.areaKm2 * (2500 + r() * 8000)),
    windFromDeg: Math.round(r() * 360),
    windKmh: Math.round((4 + r() * 14) * 10) / 10,
    blhM: Math.round(350 + r() * 600),
  };
}

function pollutantsFromAqi(aqi: number, so2Bias: number, seed: string): Record<PollutantKey, number> {
  const r = rngFor(seed);
  const j = () => 0.85 + r() * 0.3;
  return {
    pm25: Math.round(aqi * 0.62 * j() * 10) / 10,
    pm10: Math.round(aqi * 1.22 * j() * 10) / 10,
    no2: Math.round((aqi * 0.3 + 12) * j() * 10) / 10,
    so2: Math.round((aqi * 0.24 + 8) * so2Bias * j() * 10) / 10,
    co: Math.round(aqi * 0.009 * j() * 100) / 100,
    o3: Math.round((aqi * 0.2 + 14) * j() * 10) / 10,
  };
}

function randomPointInside(boundary: Polygon | any, bbox: number[], r: () => number): [number, number] {
  for (let i = 0; i < 40; i++) {
    const lon = bbox[0] + r() * (bbox[2] - bbox[0]);
    const lat = bbox[1] + r() * (bbox[3] - bbox[1]);
    if (pointInBoundary(lon, lat, boundary)) return [lon, lat];
  }
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

const AREA_PREFIX = ['Shastri', 'Gandhi', 'Nehru', 'Subhash', 'Tagore', 'Patel', 'Azad', 'Bose', 'Rajiv', 'Indira'];
const AREA_SUFFIX = ['Nagar', 'Colony', 'Market', 'Chowk', 'Road', 'Puram', 'Vihar', 'Ganj', 'Bazar', 'Enclave'];

export function synthSnapshot(place: Place, now = new Date()): Snapshot {
  const p = profileFor(place);
  const r = rngFor(`${place.placeId}-snapshot`);
  const bbox = place.bbox;
  const nowIso = now.toISOString();

  // ————— stations —————
  let stations: Station[];
  if (p.stations) {
    stations = p.stations.map((s, i) => {
      const aqi = Math.max(25, Math.round(p.baseAqi + s.aqiDelta + (r() - 0.5) * 8));
      const pol = pollutantsFromAqi(aqi, p.so2Bias, `${place.placeId}-st-${i}`);
      if (s.so2) pol.so2 = s.so2;
      return {
        id: `${place.placeId.toUpperCase().slice(0, 2)}${String(i + 1).padStart(3, '0')}`,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        aqi,
        ...pol,
        source: 'CPCB',
        updatedAt: nowIso,
      };
    });
  } else {
    const n = Math.max(4, Math.min(12, Math.round(place.areaKm2 / 90)));
    stations = Array.from({ length: n }, (_, i) => {
      const [lon, lat] = randomPointInside(place.boundary, bbox, r);
      const aqi = Math.max(25, Math.round(p.baseAqi + (r() - 0.5) * 70));
      const name = `${AREA_PREFIX[Math.floor(r() * AREA_PREFIX.length)]} ${AREA_SUFFIX[Math.floor(r() * AREA_SUFFIX.length)]}`;
      return {
        id: `${place.placeId.toUpperCase().slice(0, 2)}${String(i + 1).padStart(3, '0')}`,
        name,
        lat: Math.round(lat * 1e4) / 1e4,
        lon: Math.round(lon * 1e4) / 1e4,
        aqi,
        ...pollutantsFromAqi(aqi, p.so2Bias, `${place.placeId}-st-${i}`),
        source: 'CPCB',
        updatedAt: nowIso,
      };
    });
  }

  // ————— fires — clustered upwind, many outside the boundary —————
  const fireR = rngFor(`${place.placeId}-fires`);
  const centroid = turf.point(place.centroid);
  const fires: FireDetection[] = Array.from({ length: p.fireCount }, () => {
    const bearing = p.windFromDeg + (fireR() - 0.5) * 90;
    const dist = 8 + fireR() * 90;
    const pt = turf.destination(centroid, dist, bearing, { units: 'kilometers' });
    const [lon, lat] = pt.geometry.coordinates;
    const within = pointInBoundary(lon, lat, place.boundary);
    return {
      lat: Math.round(lat * 1e4) / 1e4,
      lon: Math.round(lon * 1e4) / 1e4,
      frp: Math.round((2 + fireR() * 28) * 10) / 10,
      confidence: fireR() > 0.35 ? 'high' : 'nominal',
      satellite: fireR() > 0.5 ? 'VIIRS_SNPP' : 'VIIRS_NOAA20',
      acquiredAt: new Date(now.getTime() - fireR() * 20 * 3600_000).toISOString(),
      withinBoundary: within,
      district: within ? place.displayName.split(',')[0] : 'Neighbouring district',
    };
  });

  // ————— industrial sites — biased upwind so attribution reads true —————
  const indR = rngFor(`${place.placeId}-industry`);
  const indNames = ['Industrial Area Phase I', 'Industrial Estate', 'Manufacturing Cluster', 'Thermal Power Complex'];
  const industrialSites = Array.from({ length: 3 + Math.floor(indR() * 2) }, (_, i) => {
    const bearing = p.windFromDeg + (indR() - 0.5) * 120;
    const dist = 2 + indR() * (Math.sqrt(place.areaKm2) / 3);
    const c = turf.destination(centroid, dist, bearing, { units: 'kilometers' }).geometry.coordinates;
    const sizeKm = 0.8 + indR() * 1.6;
    const half = sizeKm / 111; // rough degrees
    const poly: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [c[0] - half, c[1] - half * 0.7],
          [c[0] + half, c[1] - half * 0.7],
          [c[0] + half, c[1] + half * 0.7],
          [c[0] - half, c[1] + half * 0.7],
          [c[0] - half, c[1] - half * 0.7],
        ],
      ],
    };
    return { name: indNames[i % indNames.length], polygon: poly, type: i === 3 ? 'power' : 'manufacturing' };
  });

  // ————— traffic segments — corridors through random interior points —————
  const trafR = rngFor(`${place.placeId}-traffic`);
  const roadNames = ['NH-24', 'Ring Road', 'Outer Ring Road', 'GT Road', 'Station Road', 'MG Road', 'Bypass'];
  const trafficSegments: TrafficSegment[] = Array.from({ length: 9 }, (_, i) => {
    const a = randomPointInside(place.boundary, bbox, trafR);
    const bearing = trafR() * 360;
    const len = 2 + trafR() * 8;
    const coords: [number, number][] = [a];
    let cur = turf.point(a);
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      cur = turf.destination(cur, len / steps, bearing + (trafR() - 0.5) * 40, { units: 'kilometers' });
      coords.push(cur.geometry.coordinates as [number, number]);
    }
    const free = 40 + Math.round(trafR() * 30);
    const ratio = Math.round((0.2 + trafR() * 0.7) * 100) / 100;
    return {
      geometry: { type: 'LineString', coordinates: coords },
      currentSpeed: Math.round(free * ratio),
      freeFlowSpeed: free,
      ratio,
      road: roadNames[i % roadNames.length],
    };
  });

  // ————— construction + vulnerable sites —————
  const conR = rngFor(`${place.placeId}-construction`);
  const constructionSites = Array.from({ length: 6 }, (_, i) => {
    const [lon, lat] = randomPointInside(place.boundary, bbox, conR);
    return { lat, lon, name: `Construction site ${i + 1}` };
  });
  const vulR = rngFor(`${place.placeId}-vulnerable`);
  const kinds = ['hospital', 'school', 'school', 'school', 'oldage'] as const;
  const vulnerableSites = Array.from({ length: 24 }, (_, i) => {
    const [lon, lat] = randomPointInside(place.boundary, bbox, vulR);
    const kind = kinds[i % kinds.length];
    const label = kind === 'hospital' ? 'District Hospital' : kind === 'school' ? 'Public School' : 'Care Home';
    return { lat, lon, name: `${label} ${Math.ceil((i + 1) / kinds.length)}`, kind };
  });

  // ————— population & green grids (coarse) —————
  const cells = buildGrid(place.boundary, 240);
  const popR = rngFor(`${place.placeId}-pop`);
  const maxDist = Math.sqrt(place.areaKm2) / 111;
  const popFeatures: Feature[] = [];
  const greenFeatures: Feature[] = [];
  let popSum = 0;
  const rawDensities: number[] = [];
  for (const cell of cells) {
    const d =
      Math.hypot(cell.centroid[0] - place.centroid[0], cell.centroid[1] - place.centroid[1]) / maxDist;
    const falloff = Math.max(0.08, 1 - d * 0.85);
    rawDensities.push(falloff * (0.55 + popR() * 0.9));
  }
  const targetMeanDensity = p.populationTotal / place.areaKm2;
  const rawMean = rawDensities.reduce((a, b) => a + b, 0) / rawDensities.length;
  cells.forEach((cell, i) => {
    const density = Math.round((rawDensities[i] / rawMean) * targetMeanDensity);
    popSum += density;
    popFeatures.push({
      ...cell.polygon,
      id: cell.id,
      properties: { value: density, unit: 'people/km2' },
    });
    const gR = rngFor(`${place.placeId}-green-${cell.id}`);
    const green = Math.max(
      1,
      Math.min(85, p.greenPct * (0.3 + (1 - rawDensities[i] / Math.max(...rawDensities)) * 1.4) + (gR() - 0.5) * 8),
    );
    greenFeatures.push({
      ...cell.polygon,
      id: cell.id,
      properties: { value: Math.round(green * 10) / 10, unit: 'pct_green' },
    });
  });
  void popSum;

  const cityAqi = Math.round(stations.reduce((a, s) => a + s.aqi, 0) / stations.length);
  const band = bandFor(cityAqi).key;
  const dominantPollutant: PollutantKey = 'pm25';
  const exposedShare = cityAqi > 200 ? 0.95 : cityAqi > 150 ? 0.4 : cityAqi > 100 ? 0.12 : 0;

  return {
    placeId: place.placeId,
    summary: {
      aqi: cityAqi,
      band,
      dominantPollutant,
      aqiForecast24h: Math.round(cityAqi * (1 + (p.forecastPeakFactor - 1) * 0.55)),
      populationTotal: p.populationTotal,
      populationExposedAbove200: Math.round(p.populationTotal * exposedShare),
      greenCoverPct: p.greenPct,
      activeFires24h: p.fireCount,
      congestionRatio: p.congestionRatio,
    },
    stations,
    fires,
    weather: {
      windSpeedKmh: p.windKmh,
      windDirectionDeg: p.windFromDeg,
      boundaryLayerHeightM: p.blhM,
      temperatureC: 24 + Math.round(r() * 10 * 10) / 10,
      humidityPct: 45 + Math.round(r() * 35),
      precipitationMm: 0,
    },
    trafficSegments,
    industrialSites,
    constructionSites,
    vulnerableSites: vulnerableSites as Snapshot['vulnerableSites'],
    populationGrid: { type: 'FeatureCollection', features: popFeatures } as FeatureCollection,
    greenGrid: { type: 'FeatureCollection', features: greenFeatures } as FeatureCollection,
    sources: ['cpcb', 'aqicn', 'firms', 'tomtom', 'open-meteo', 'worldpop', 'esa-worldcover'],
    fetchedAt: nowIso,
  };
}

/** 72h city-level forecast in 3h steps, with a diurnal cycle and a profile-driven peak. */
export function synthForecast(place: Place, snapshot: Snapshot, now = new Date()): Forecast {
  const p = profileFor(place);
  const base = snapshot.summary.aqi;
  const steps: ForecastStep[] = [];
  for (let h = 0; h <= 72; h += 3) {
    const hourOfDay = (now.getHours() + h) % 24;
    // boundary layer collapses at night → higher AQI overnight/early morning
    const diurnal = 1 + 0.12 * Math.cos(((hourOfDay - 4) / 24) * 2 * Math.PI);
    // profile peak centred at +36h
    const peak = 1 + (p.forecastPeakFactor - 1) * Math.exp(-Math.pow((h - 36) / 22, 2));
    const aqi = Math.round(base * diurnal * peak);
    const spread = 0.06 + (h / 72) * 0.16;
    steps.push({
      offsetHours: h,
      aqi,
      lower: Math.round(aqi * (1 - spread)),
      upper: Math.round(aqi * (1 + spread)),
    });
  }
  return {
    issuedAt: now.toISOString(),
    cityLevel: steps,
    baselines: { persistence: base, cams: Math.round(base * 1.04) },
    sources: ['model-v1', 'open-meteo-cams'],
  };
}
