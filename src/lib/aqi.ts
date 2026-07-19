import type { AqiBandKey, PollutantKey } from '../types';

/** CPCB six-category AQI scale. Single source of truth for bands and colours. */
export const AQI_BANDS: {
  key: AqiBandKey;
  label: string;
  min: number;
  max: number;
  color: string;
}[] = [
  { key: 'good', label: 'Good', min: 0, max: 50, color: '#2E9E5B' },
  { key: 'satisfactory', label: 'Satisfactory', min: 51, max: 100, color: '#96C93D' },
  { key: 'moderate', label: 'Moderate', min: 101, max: 200, color: '#F2C230' },
  { key: 'poor', label: 'Poor', min: 201, max: 300, color: '#F07C1F' },
  { key: 'very_poor', label: 'Very Poor', min: 301, max: 400, color: '#E0453B' },
  { key: 'severe', label: 'Severe', min: 401, max: 1000, color: '#8C2A2A' },
];

export function bandFor(aqi: number) {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

export function bandByKey(key: AqiBandKey) {
  return AQI_BANDS.find((b) => b.key === key) ?? AQI_BANDS[0];
}

export function colorFor(aqi: number): string {
  return bandFor(aqi).color;
}

/**
 * CPCB 24-hour National Ambient Air Quality Standards.
 * CO is the 1-hour standard in mg/m³; O₃ is the 8-hour standard.
 */
export const CPCB_STANDARDS: Record<PollutantKey, number> = {
  pm25: 60,
  pm10: 100,
  no2: 80,
  so2: 80,
  co: 4,
  o3: 100,
};

export const POLLUTANT_META: Record<
  PollutantKey,
  { label: string; unit: string; standardNote: string }
> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', standardNote: '24h' },
  pm10: { label: 'PM10', unit: 'µg/m³', standardNote: '24h' },
  no2: { label: 'NO₂', unit: 'µg/m³', standardNote: '24h' },
  so2: { label: 'SO₂', unit: 'µg/m³', standardNote: '24h' },
  co: { label: 'CO', unit: 'mg/m³', standardNote: '1h' },
  o3: { label: 'O₃', unit: 'µg/m³', standardNote: '8h' },
};

export const POLLUTANT_KEYS: PollutantKey[] = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];

/**
 * Colour a raw pollutant concentration using the AQI band palette, scaled so
 * that 1.0× the CPCB standard sits at the Moderate/Poor boundary.
 */
export function pollutantColor(key: PollutantKey, value: number): string {
  const ratio = value / CPCB_STANDARDS[key];
  if (ratio <= 0.25) return AQI_BANDS[0].color;
  if (ratio <= 0.5) return AQI_BANDS[1].color;
  if (ratio <= 1.0) return AQI_BANDS[2].color;
  if (ratio <= 1.5) return AQI_BANDS[3].color;
  if (ratio <= 2.5) return AQI_BANDS[4].color;
  return AQI_BANDS[5].color;
}

/** Thresholds for MapLibre step expressions, per pollutant (concentration units). */
export function pollutantStops(key: PollutantKey): number[] {
  const s = CPCB_STANDARDS[key];
  return [0.25 * s, 0.5 * s, 1.0 * s, 1.5 * s, 2.5 * s];
}

export const AQI_STOPS = [51, 101, 201, 301, 401];
export const BAND_COLORS = AQI_BANDS.map((b) => b.color);
