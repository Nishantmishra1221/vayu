import type { AqiBandKey, PollutantKey, RankedAction } from '../types';
import { bandFor, CPCB_STANDARDS } from './aqi';

/**
 * The action recommendation engine. A deterministic rule engine — every
 * recommendation traces back to a named rule with an explicit trigger.
 *
 * GRAP stage descriptions are paraphrased from the CAQM schedule dated
 * 21 November 2025 (revised periodically — the UI cites version and date).
 */

export const GRAP_VERSION = 'CAQM GRAP schedule dated 21 Nov 2025';
export const GRAP_URL = 'https://caqm.nic.in/';

export interface LocationContext {
  aqi: number;
  band: AqiBandKey;
  forecastMaxAqi: number; // max forecast AQI in next 72h
  forecastCrossesBand: { band: AqiBandKey; offsetHours: number } | null;
  dominantPollutant: PollutantKey;
  pollutants: Record<PollutantKey, number>;
  sourceShares: { industrial: number; traffic: number; biomass: number; dust: number; other: number };
  exposedPopulation: number; // within 2 km of the point
  densityPerKm2: number;
  greenCoverPct: number;
  congestionRatio: number; // current/free-flow, lower = worse
  windSpeedKmh: number;
  windDirectionDegForText?: number; // wind FROM direction, used only for narrative text
  boundaryLayerHeightM: number;
  precipitationMm: number;
  firesOutsideBoundary: number;
  firesWithin100km: number;
  fireCoords: [number, number][];
  constructionSitesNearby: number;
  stateName: string;
}

export interface ActionRule {
  id: string;
  severity: RankedAction['severity'];
  category: RankedAction['category'];
  trigger: (ctx: LocationContext) => boolean;
  action: (ctx: LocationContext) => string;
  reasoning: (ctx: LocationContext) => string;
  agency: string;
  legalBasis: string;
  legalBasisUrl: string;
  estimatedEffect: { aqiDelta: [number, number]; withinHours: number };
  feasibility: number; // 0..1, used in ranking
  evidenceKeys: string[];
}

const exceeds = (ctx: LocationContext, key: PollutantKey, factor = 1) =>
  ctx.pollutants[key] > CPCB_STANDARDS[key] * factor;

const forecastBand = (ctx: LocationContext) => bandFor(ctx.forecastMaxAqi).key;

export const RULES: ActionRule[] = [
  // ————— GRAP statutory ladder — fires on the FORECAST, not the current reading —————
  {
    id: 'grap1-dust-control',
    severity: 'medium',
    category: 'statutory',
    trigger: (c) => forecastBand(c) === 'poor',
    action: () =>
      'Invoke GRAP Stage I: enforce dust control at construction sites, mechanised road sweeping and water sprinkling on major corridors, strict PUC certificate checks, ban open waste burning',
    reasoning: (c) =>
      `Forecast AQI reaches ${Math.round(c.forecastMaxAqi)} (Poor band) within 72h${
        c.forecastCrossesBand ? ` — crossing in ~${c.forecastCrossesBand.offsetHours}h` : ''
      }. GRAP stages are invoked in advance of the AQI reaching the projected level.`,
    agency: 'CAQM / State Pollution Control Board + Municipal Corporation',
    legalBasis: `GRAP Stage I schedule, ${GRAP_VERSION}`,
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-15, -5], withinHours: 48 },
    feasibility: 0.9,
    evidenceKeys: ['forecastMaxAqi'],
  },
  {
    id: 'grap2-dg-restrictions',
    severity: 'high',
    category: 'statutory',
    trigger: (c) => forecastBand(c) === 'very_poor',
    action: () =>
      'Invoke GRAP Stage II: intensify mechanised sweeping and sprinkling, restrict diesel generator operation to essential services, raise parking fees, increase public transport frequency',
    reasoning: (c) =>
      `Forecast AQI reaches ${Math.round(c.forecastMaxAqi)} (Very Poor)${
        c.forecastCrossesBand ? `, crossing the band threshold in ~${c.forecastCrossesBand.offsetHours}h` : ''
      }. Anticipatory invocation is provided for under the GRAP framework.`,
    agency: 'CAQM / State Pollution Control Board + Transport Department',
    legalBasis: `GRAP Stage II schedule, ${GRAP_VERSION}`,
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-25, -10], withinHours: 48 },
    feasibility: 0.8,
    evidenceKeys: ['forecastMaxAqi', 'forecastCrossesBand'],
  },
  {
    id: 'grap3-construction-halt',
    severity: 'high',
    category: 'statutory',
    trigger: (c) => forecastBand(c) === 'severe' && c.forecastMaxAqi <= 450,
    action: () =>
      'Invoke GRAP Stage III: halt non-essential construction and demolition within 5 km of this point, close stone crushers, restrict BS-III petrol and BS-IV diesel vehicles, shift younger classes to hybrid schooling',
    reasoning: (c) =>
      `Forecast AQI ${Math.round(c.forecastMaxAqi)} crosses the Severe threshold${
        c.forecastCrossesBand ? ` in ~${c.forecastCrossesBand.offsetHours}h` : ''
      }; dust contributes ${Math.round(c.sourceShares.dust)}% and rises in dry conditions.`,
    agency: 'DPCC / State PCB + Municipal Corporation',
    legalBasis: `GRAP Stage III schedule, ${GRAP_VERSION}`,
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-30, -18], withinHours: 48 },
    feasibility: 0.7,
    evidenceKeys: ['forecastMaxAqi', 'sourceShares.dust'],
  },
  {
    id: 'grap4-severe-plus',
    severity: 'critical',
    category: 'statutory',
    trigger: (c) => c.forecastMaxAqi > 450,
    action: () =>
      'Invoke GRAP Stage IV: stop truck entry except essential goods, halt public construction projects, issue work-from-home directives, consider school closures',
    reasoning: (c) =>
      `Forecast AQI ${Math.round(c.forecastMaxAqi)} exceeds the Severe+ threshold of 450. Stage IV measures apply city-wide.`,
    agency: 'CAQM + State Government',
    legalBasis: `GRAP Stage IV schedule, ${GRAP_VERSION}`,
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-60, -30], withinHours: 72 },
    feasibility: 0.5,
    evidenceKeys: ['forecastMaxAqi'],
  },

  // ————— SO₂ — fuel-sulphur pollutant, industrial remedies —————
  {
    id: 'so2-stack-inspection',
    severity: 'high',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'so2') && c.sourceShares.industrial > 30,
    action: () =>
      'Inspect and sample stack emissions at the industrial units upwind of this location; verify flue-gas desulphurisation operation and fuel sulphur content against consent-to-operate conditions',
    reasoning: (c) =>
      `SO₂ at ${c.pollutants.so2.toFixed(0)} µg/m³ is ${(c.pollutants.so2 / CPCB_STANDARDS.so2).toFixed(1)}× the 24h standard and the industrial source share is ${Math.round(c.sourceShares.industrial)}%. SO₂ comes overwhelmingly from sulphur in fuel — coal combustion, boilers and DG sets — not traffic.`,
    agency: 'State Pollution Control Board',
    legalBasis: 'Air (Prevention and Control of Pollution) Act 1981, consent-to-operate conditions',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-20, -8], withinHours: 72 },
    feasibility: 0.85,
    evidenceKeys: ['pollutants.so2', 'sourceShares.industrial'],
  },
  {
    id: 'so2-dg-restriction',
    severity: 'medium',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'so2') && c.densityPerKm2 > 6000,
    action: () =>
      'Restrict diesel generator operation to essential services in this zone; coordinate with the distribution utility to prioritise grid reliability here',
    reasoning: (c) =>
      `SO₂ exceeds the standard in a dense zone (${Math.round(c.densityPerKm2).toLocaleString('en-IN')}/km²) where commercial DG-set clusters are a typical sulphur source.`,
    agency: 'State PCB + Electricity Distribution Utility',
    legalBasis: `GRAP Stage II DG-set restrictions, ${GRAP_VERSION}`,
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-10, -4], withinHours: 48 },
    feasibility: 0.75,
    evidenceKeys: ['pollutants.so2', 'densityPerKm2'],
  },
  {
    id: 'so2-png-switch',
    severity: 'low',
    category: 'infrastructure',
    trigger: (c) => exceeds(c, 'so2') && c.sourceShares.industrial > 30,
    action: () =>
      'Mandate fuel switching to piped natural gas for industrial boilers in this cluster, with a compliance timeline under consent conditions',
    reasoning: () =>
      'Long-term SO₂ abatement: eliminating sulphur-bearing fuel at source is the only durable remedy for a fuel-sulphur pollutant.',
    agency: 'State PCB + Industries Department',
    legalBasis: 'Air Act 1981 §17; consent-to-operate amendment powers',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-15, -6], withinHours: 24 * 90 },
    feasibility: 0.4,
    evidenceKeys: ['pollutants.so2', 'sourceShares.industrial'],
  },

  // ————— PM2.5 + biomass —————
  {
    id: 'pm25-biomass-field-teams',
    severity: 'high',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'pm25') && c.sourceShares.biomass > 25,
    action: (c) =>
      `Deploy field teams to the ${Math.min(c.fireCoords.length, 12)} fire detection coordinates listed; issue notices under state crop-residue-burning rules`,
    reasoning: (c) =>
      `PM2.5 at ${c.pollutants.pm25.toFixed(0)} µg/m³ with a ${Math.round(c.sourceShares.biomass)}% biomass share, supported by ${c.firesWithin100km} VIIRS detections within 100 km in the last 24h.`,
    agency: 'District Administration + Agriculture Department',
    legalBasis: 'State crop-residue-burning rules; Air Act 1981 §19',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-25, -10], withinHours: 24 },
    feasibility: 0.7,
    evidenceKeys: ['pollutants.pm25', 'sourceShares.biomass', 'firesWithin100km'],
  },
  {
    id: 'pm25-cross-jurisdiction',
    severity: 'medium',
    category: 'advisory',
    trigger: (c) => c.sourceShares.biomass > 15 && c.firesOutsideBoundary > 0,
    action: (c) =>
      `Coordinate with the neighbouring district administration — ${c.firesOutsideBoundary} of the contributing fire detections fall outside this boundary's jurisdiction`,
    reasoning: (c) =>
      `${c.firesOutsideBoundary} upwind fire detections lie outside the searched boundary. Municipal action alone cannot address them; inter-district coordination is required.`,
    agency: 'District Magistrate + neighbouring District Administration',
    legalBasis: 'CAQM inter-state coordination mandate, CAQM Act 2021',
    legalBasisUrl: GRAP_URL,
    estimatedEffect: { aqiDelta: [-20, -5], withinHours: 48 },
    feasibility: 0.6,
    evidenceKeys: ['firesOutsideBoundary', 'sourceShares.biomass'],
  },

  // ————— PM10 + dust —————
  {
    id: 'pm10-dust-corridors',
    severity: 'medium',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'pm10') && c.sourceShares.dust > 20,
    action: () =>
      'Increase mechanised sweeping and water sprinkling frequency on the identified corridors; enforce anti-smog gun deployment at construction sites above 500 m²',
    reasoning: (c) =>
      `PM10 at ${c.pollutants.pm10.toFixed(0)} µg/m³ (${(c.pollutants.pm10 / CPCB_STANDARDS.pm10).toFixed(1)}× standard) with a ${Math.round(c.sourceShares.dust)}% dust share and ${c.constructionSitesNearby} active construction sites nearby.`,
    agency: 'Municipal Corporation',
    legalBasis: 'C&D Waste Management Rules 2016; dust mitigation directions under Air Act §31A',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-15, -6], withinHours: 24 },
    feasibility: 0.9,
    evidenceKeys: ['pollutants.pm10', 'sourceShares.dust', 'constructionSitesNearby'],
  },
  {
    id: 'pm10-green-buffer',
    severity: 'low',
    category: 'infrastructure',
    trigger: (c) => exceeds(c, 'pm10') && c.sourceShares.dust > 20 && c.greenCoverPct < 10,
    action: (c) =>
      `Prioritise this ward for the plantation and green-buffer programme — green cover here is ${c.greenCoverPct.toFixed(1)}%, well below the urban norm`,
    reasoning: (c) =>
      `Low vegetation (${c.greenCoverPct.toFixed(1)}%) removes a natural dust sink; combined with elevated PM10 this cell qualifies for the greening priority list.`,
    agency: 'Municipal Corporation, Horticulture Department',
    legalBasis: 'State urban greening policy; NCAP city action plan',
    legalBasisUrl: 'https://prana.cpcb.gov.in/',
    estimatedEffect: { aqiDelta: [-8, -3], withinHours: 24 * 180 },
    feasibility: 0.8,
    evidenceKeys: ['greenCoverPct', 'pollutants.pm10'],
  },

  // ————— NO₂ + vehicular —————
  {
    id: 'no2-traffic-management',
    severity: 'medium',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'no2') && c.sourceShares.traffic > 35,
    action: () =>
      'Optimise signal timing and divert traffic on the congested corridors identified; intensify PUC enforcement at the entry points to this zone',
    reasoning: (c) =>
      `NO₂ at ${c.pollutants.no2.toFixed(0)} µg/m³ with a ${Math.round(c.sourceShares.traffic)}% vehicular share and congestion at ${(c.congestionRatio * 100).toFixed(0)}% of free-flow speed.`,
    agency: 'Traffic Police + Transport Department',
    legalBasis: 'Motor Vehicles Act 1988 §190(2); CMVR PUC rules',
    legalBasisUrl: 'https://morth.nic.in/',
    estimatedEffect: { aqiDelta: [-12, -5], withinHours: 24 },
    feasibility: 0.85,
    evidenceKeys: ['pollutants.no2', 'sourceShares.traffic', 'congestionRatio'],
  },
  {
    id: 'no2-bus-lane',
    severity: 'low',
    category: 'infrastructure',
    trigger: (c) => exceeds(c, 'no2') && c.sourceShares.traffic > 35 && c.congestionRatio < 0.4,
    action: () =>
      'Evaluate a dedicated bus lane or congestion-management intervention on this corridor — sustained congestion below 40% of free-flow indicates structural over-capacity',
    reasoning: (c) =>
      `Peak congestion ratio ${c.congestionRatio.toFixed(2)} on the adjacent corridor indicates recurring, not incidental, congestion.`,
    agency: 'Municipal Corporation + Transport Department',
    legalBasis: 'State comprehensive mobility plan; NCAP city action plan',
    legalBasisUrl: 'https://prana.cpcb.gov.in/',
    estimatedEffect: { aqiDelta: [-10, -4], withinHours: 24 * 120 },
    feasibility: 0.5,
    evidenceKeys: ['congestionRatio', 'sourceShares.traffic'],
  },

  // ————— O₃ — secondary pollutant —————
  {
    id: 'o3-precursor-control',
    severity: 'medium',
    category: 'advisory',
    trigger: (c) => exceeds(c, 'o3'),
    action: () =>
      'Target precursor emissions: audit VOC leakage at fuel stations and solvent users, tighten NOx from traffic; issue a midday outdoor-exposure advisory for sensitive groups',
    reasoning: (c) =>
      `O₃ at ${c.pollutants.o3.toFixed(0)} µg/m³ exceeds the 8h standard. Ozone is secondary — formed from NOx and VOCs in sunlight — so control targets precursors, not ozone itself.`,
    agency: 'State PCB + Health Department',
    legalBasis: 'Air Act 1981 §31A directions; NAAQS 2009 O₃ standard',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-10, -3], withinHours: 48 },
    feasibility: 0.6,
    evidenceKeys: ['pollutants.o3'],
  },

  // ————— CO —————
  {
    id: 'co-combustion-check',
    severity: 'medium',
    category: 'enforcement',
    trigger: (c) => exceeds(c, 'co'),
    action: () =>
      'Deploy inspection teams for smouldering waste fires and biomass cookstove clusters in the exposed area — CO indicates incomplete combustion close to ground level',
    reasoning: (c) =>
      `CO at ${c.pollutants.co.toFixed(1)} mg/m³ exceeds the 1h standard of ${CPCB_STANDARDS.co} mg/m³. Nearby low-temperature combustion is the usual cause.`,
    agency: 'Municipal Corporation + Fire Services',
    legalBasis: 'Solid Waste Management Rules 2016 (open burning prohibition)',
    legalBasisUrl: 'https://cpcb.nic.in/air-pollution/',
    estimatedEffect: { aqiDelta: [-8, -3], withinHours: 24 },
    feasibility: 0.85,
    evidenceKeys: ['pollutants.co'],
  },
];

/**
 * Exposure-weighted ranking: estimatedAqiReduction × exposedPopulation × feasibility.
 * An action that helps 400,000 people modestly outranks one that helps 4,000 a lot.
 */
export function rankScore(rule: ActionRule, ctx: LocationContext): number {
  const midReduction = Math.abs((rule.estimatedEffect.aqiDelta[0] + rule.estimatedEffect.aqiDelta[1]) / 2);
  const popFactor = Math.min(1, ctx.exposedPopulation / 500_000);
  const raw = (midReduction / 60) * 0.5 + popFactor * 0.3 + rule.feasibility * 0.2;
  return Math.round(raw * 100) / 100;
}

const POLLUTANT_PREFIXES = ['so2', 'pm25', 'pm10', 'no2', 'o3', 'co'];

export function evaluateActions(ctx: LocationContext, limit = 5): RankedAction[] {
  const fired = RULES.filter((r) => {
    try {
      return r.trigger(ctx);
    } catch {
      return false;
    }
  });
  const ranked = fired
    .map((r) => ({
      id: r.id,
      severity: r.severity,
      category: r.category,
      action: r.action(ctx),
      reasoning: r.reasoning(ctx),
      agency: r.agency,
      legalBasis: r.legalBasis,
      legalBasisUrl: r.legalBasisUrl,
      estimatedEffect: r.estimatedEffect,
      rankScore: rankScore(r, ctx),
    }))
    .sort((a, b) => b.rankScore - a.rankScore);

  // Guarantee representation: the top GRAP rule and the top rule for each
  // exceeding pollutant always survive the cut — a high SO₂ reading must
  // surface its SO₂-specific remedy even when statutory rules rank higher.
  const guaranteed = new Set<string>();
  const grapTop = ranked.find((a) => a.id.startsWith('grap'));
  if (grapTop) guaranteed.add(grapTop.id);
  for (const prefix of POLLUTANT_PREFIXES) {
    const top = ranked.find((a) => a.id.startsWith(`${prefix}-`));
    if (top) guaranteed.add(top.id);
  }
  const keep = ranked.filter((a) => guaranteed.has(a.id));
  const rest = ranked.filter((a) => !guaranteed.has(a.id));
  return [...keep, ...rest]
    .slice(0, Math.max(limit, keep.length))
    .sort((a, b) => b.rankScore - a.rankScore);
}
