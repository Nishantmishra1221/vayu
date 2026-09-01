import { describe, expect, it } from 'vitest';
import { synthForecast, synthSnapshot } from './synth';
import type { Place } from '../types';
import delhiB from '../mocks/boundaries/delhi.json';
import mumbaiB from '../mocks/boundaries/mumbai.json';
import kanpurB from '../mocks/boundaries/kanpur.json';
import kharagpurB from '../mocks/boundaries/kharagpur.json';

const FIXTURES: Record<string, any> = {
  delhi: delhiB,
  mumbai: mumbaiB,
  kanpur: kanpurB,
  kharagpur: kharagpurB,
};

function place(id: string): Place {
  const f = FIXTURES[id];
  return {
    placeId: id,
    displayName: f.displayName,
    state: f.state,
    language: 'en',
    centroid: f.centroid,
    bbox: f.bbox,
    areaKm2: f.areaKm2,
    boundary: f.boundary,
    sources: ['nominatim'],
    fetchedAt: new Date().toISOString(),
  } as Place;
}

/**
 * The four tuned profiles carry observations from 2026-09-01 (see PROVENANCE in
 * synth.ts). These lock the synthesis to those numbers, so a profile edit that
 * drifts away from the source data fails here rather than silently in the demo.
 */
const OBSERVED: Record<string, { aqi: number; dominant: string }> = {
  delhi: { aqi: 412, dominant: 'pm10' },
  mumbai: { aqi: 63, dominant: 'o3' },
  kanpur: { aqi: 107, dominant: 'o3' },
  kharagpur: { aqi: 100, dominant: 'o3' },
};

describe('synthSnapshot — live-refreshed city profiles', () => {
  for (const [id, want] of Object.entries(OBSERVED)) {
    it(`${id} reproduces its observed AQI and dominant pollutant`, () => {
      const s = synthSnapshot(place(id));
      expect(s.summary.aqi).toBeGreaterThanOrEqual(want.aqi - 2);
      expect(s.summary.aqi).toBeLessThanOrEqual(want.aqi + 2);
      expect(s.summary.dominantPollutant).toBe(want.dominant);
    });
  }

  it('scales station concentrations from the observed pollutant mix', () => {
    const s = synthSnapshot(place('delhi'));
    // The Delhi episode is coarse-dust driven: PM10 runs far above PM2.5.
    const pm10 = s.stations.reduce((a, x) => a + x.pm10, 0) / s.stations.length;
    const pm25 = s.stations.reduce((a, x) => a + x.pm25, 0) / s.stations.length;
    expect(pm10 / pm25).toBeGreaterThan(3);
  });
});

describe('synthForecast', () => {
  it('follows the observed trajectory rather than a synthetic bump', () => {
    const p = place('delhi');
    const f = synthForecast(p, synthSnapshot(p));
    const at = (h: number) => f.cityLevel.find((s) => s.offsetHours === h)!.aqi;
    // Delhi's dust is clearing: AQI falls steadily over the first 12h and stays down.
    expect(at(0)).toBeGreaterThan(at(12));
    expect(at(12)).toBeLessThan(at(0) * 0.75);
    // A 24h-mean AQI carries no diurnal swing, so the curve must not exceed the start.
    expect(Math.max(...f.cityLevel.map((s) => s.aqi))).toBeLessThanOrEqual(at(0));
  });
});
