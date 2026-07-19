import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';

export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3';
export type PollutantOrAqi = 'aqi' | PollutantKey;

export type AqiBandKey = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe';

export type LayerKey = 'pollution' | 'population' | 'green' | 'traffic' | 'sources';

export interface Place {
  placeId: string;
  displayName: string;
  state: string;
  language: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  areaKm2: number;
  boundary: Polygon | MultiPolygon;
  sources: string[];
  fetchedAt: string;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  source: string;
  updatedAt: string;
}

export interface FireDetection {
  lat: number;
  lon: number;
  frp: number;
  confidence: 'low' | 'nominal' | 'high';
  satellite: string;
  acquiredAt: string;
  withinBoundary: boolean;
  district: string;
}

export interface Weather {
  windSpeedKmh: number;
  windDirectionDeg: number; // direction wind is coming FROM, met convention
  boundaryLayerHeightM: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
}

export interface TrafficSegment {
  geometry: LineString;
  currentSpeed: number;
  freeFlowSpeed: number;
  ratio: number;
  road?: string;
}

export interface IndustrialSite {
  name: string;
  polygon: Polygon;
  type: string;
}

export interface ConstructionSite {
  lat: number;
  lon: number;
  name: string;
}

export interface VulnerableSite {
  lat: number;
  lon: number;
  name: string;
  kind: 'hospital' | 'school' | 'oldage';
}

export interface Snapshot {
  placeId: string;
  summary: {
    aqi: number;
    band: AqiBandKey;
    dominantPollutant: PollutantKey;
    aqiForecast24h: number;
    populationTotal: number;
    populationExposedAbove200: number;
    greenCoverPct: number;
    activeFires24h: number;
    congestionRatio: number;
  };
  stations: Station[];
  fires: FireDetection[];
  weather: Weather;
  trafficSegments: TrafficSegment[];
  industrialSites: IndustrialSite[];
  constructionSites: ConstructionSite[];
  vulnerableSites: VulnerableSite[];
  populationGrid: FeatureCollection;
  greenGrid: FeatureCollection;
  sources: string[];
  fetchedAt: string;
}

export interface ForecastStep {
  offsetHours: number;
  aqi: number;
  lower: number;
  upper: number;
}

export interface Forecast {
  issuedAt: string;
  cityLevel: ForecastStep[];
  baselines: { persistence: number; cams: number };
  sources: string[];
}

export interface PollutantReading {
  key: PollutantKey;
  value: number;
  unit: string;
  standard: number;
  ratio: number;
  exceeds: boolean;
}

export interface AttributionSource {
  key: 'industrial' | 'traffic' | 'biomass' | 'dust' | 'other';
  label: string;
  sharePct: number;
  evidenceSummary: string;
  evidence: FeatureCollection;
}

export interface InspectResult {
  location: { name: string; lat: number; lon: number; insideBoundary: boolean };
  airQuality: {
    aqi: number;
    band: AqiBandKey;
    dominantPollutant: PollutantKey;
    measurement: 'measured' | 'interpolated';
    stationCount: number;
    nearestStation: { name: string; distanceKm: number };
    pollutants: PollutantReading[];
  };
  exposure: {
    populationWithin2km: number;
    densityPerKm2: number;
    schools: number;
    hospitals: number;
    greenCoverPct: number;
  };
  attribution: {
    confidence: number;
    sources: AttributionSource[];
    windBackTrajectory: Feature<Polygon>;
    explanation: string;
  };
  forecast: {
    series: ForecastStep[];
    crossesBandAt: { offsetHours: number; band: AqiBandKey; at: string } | null;
  };
  actions: RankedAction[];
}

export interface RankedAction {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'statutory' | 'enforcement' | 'advisory' | 'infrastructure';
  action: string;
  reasoning: string;
  agency: string;
  legalBasis: string;
  legalBasisUrl: string;
  estimatedEffect: { aqiDelta: [number, number]; withinHours: number };
  rankScore: number;
}

export interface GeocodeSuggestion {
  displayName: string;
  osmType: string;
  osmId: number;
  lat: number;
  lon: number;
  fixtureId?: string;
}
