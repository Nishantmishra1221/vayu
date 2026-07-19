import { describe, expect, it } from 'vitest';
import { evaluateActions, rankScore, RULES, type LocationContext } from './actions';

function ctx(overrides: Partial<LocationContext> = {}): LocationContext {
  return {
    aqi: 90,
    band: 'satisfactory',
    forecastMaxAqi: 95,
    forecastCrossesBand: null,
    dominantPollutant: 'pm25',
    pollutants: { pm25: 40, pm10: 80, no2: 30, so2: 20, co: 1, o3: 40 },
    sourceShares: { industrial: 20, traffic: 25, biomass: 10, dust: 15, other: 30 },
    exposedPopulation: 100_000,
    densityPerKm2: 5000,
    greenCoverPct: 15,
    congestionRatio: 0.6,
    windSpeedKmh: 10,
    boundaryLayerHeightM: 800,
    precipitationMm: 0,
    firesOutsideBoundary: 0,
    firesWithin100km: 0,
    fireCoords: [],
    constructionSitesNearby: 0,
    stateName: 'Delhi',
    ...overrides,
  };
}

describe('action rule engine', () => {
  it('recommends nothing when air quality is acceptable', () => {
    expect(evaluateActions(ctx())).toHaveLength(0);
  });

  it('fires the SO₂ industrial inspection rule when SO₂ > 80 and industrial share > 30%', () => {
    const actions = evaluateActions(
      ctx({
        pollutants: { pm25: 40, pm10: 80, no2: 30, so2: 94, co: 1, o3: 40 },
        sourceShares: { industrial: 44, traffic: 20, biomass: 10, dust: 10, other: 16 },
      }),
    );
    const so2 = actions.find((a) => a.id === 'so2-stack-inspection');
    expect(so2).toBeDefined();
    expect(so2!.agency).toContain('Pollution Control Board');
    expect(so2!.legalBasis).toContain('Air (Prevention and Control of Pollution) Act 1981');
  });

  it('does not fire the SO₂ industrial rule when the industrial share is low', () => {
    const actions = evaluateActions(
      ctx({
        pollutants: { pm25: 40, pm10: 80, no2: 30, so2: 94, co: 1, o3: 40 },
        sourceShares: { industrial: 10, traffic: 40, biomass: 10, dust: 10, other: 30 },
        densityPerKm2: 1000,
      }),
    );
    expect(actions.find((a) => a.id === 'so2-stack-inspection')).toBeUndefined();
  });

  it('invokes GRAP Stage III on a Severe forecast even if current AQI is lower', () => {
    const actions = evaluateActions(
      ctx({ aqi: 218, band: 'poor', forecastMaxAqi: 412, forecastCrossesBand: { band: 'severe', offsetHours: 14 } }),
    );
    const grap3 = actions.find((a) => a.id === 'grap3-construction-halt');
    expect(grap3).toBeDefined();
    expect(grap3!.category).toBe('statutory');
    expect(grap3!.legalBasis).toContain('GRAP Stage III');
  });

  it('invokes GRAP Stage IV above forecast AQI 450', () => {
    const actions = evaluateActions(ctx({ forecastMaxAqi: 460 }));
    expect(actions.find((a) => a.id === 'grap4-severe-plus')).toBeDefined();
    expect(actions.find((a) => a.id === 'grap3-construction-halt')).toBeUndefined();
  });

  it('raises cross-jurisdiction coordination when contributing fires lie outside the boundary', () => {
    const actions = evaluateActions(
      ctx({
        sourceShares: { industrial: 15, traffic: 20, biomass: 28, dust: 10, other: 27 },
        firesOutsideBoundary: 3,
        firesWithin100km: 7,
      }),
    );
    expect(actions.find((a) => a.id === 'pm25-cross-jurisdiction')).toBeDefined();
  });

  it('ranks by exposure: the same rule scores higher where more people are exposed', () => {
    const rule = RULES.find((r) => r.id === 'grap1-dust-control')!;
    const low = rankScore(rule, ctx({ exposedPopulation: 4_000 }));
    const high = rankScore(rule, ctx({ exposedPopulation: 400_000 }));
    expect(high).toBeGreaterThan(low);
  });

  it('recommends plantation only where green cover is low', () => {
    const base = {
      pollutants: { pm25: 40, pm10: 160, no2: 30, so2: 20, co: 1, o3: 40 },
      sourceShares: { industrial: 15, traffic: 20, biomass: 10, dust: 28, other: 27 },
    };
    const lowGreen = evaluateActions(ctx({ ...base, greenCoverPct: 4 }), 10);
    const highGreen = evaluateActions(ctx({ ...base, greenCoverPct: 30 }), 10);
    expect(lowGreen.find((a) => a.id === 'pm10-green-buffer')).toBeDefined();
    expect(highGreen.find((a) => a.id === 'pm10-green-buffer')).toBeUndefined();
  });

  it('keeps one action per exceeding pollutant plus the GRAP rule, sorted by rank score', () => {
    const actions = evaluateActions(
      ctx({
        forecastMaxAqi: 420,
        pollutants: { pm25: 200, pm10: 300, no2: 100, so2: 100, co: 5, o3: 120 },
        sourceShares: { industrial: 35, traffic: 40, biomass: 30, dust: 25, other: 0 },
        firesOutsideBoundary: 2,
        firesWithin100km: 9,
        congestionRatio: 0.35,
        greenCoverPct: 5,
      }),
    );
    // every exceeded pollutant is represented even when GRAP rules rank higher
    for (const prefix of ['so2', 'pm25', 'pm10', 'no2', 'o3', 'co']) {
      expect(actions.some((a) => a.id.startsWith(`${prefix}-`))).toBe(true);
    }
    expect(actions.some((a) => a.id.startsWith('grap'))).toBe(true);
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i - 1].rankScore).toBeGreaterThanOrEqual(actions[i].rankScore);
    }
  });
});
