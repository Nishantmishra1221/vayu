# VAYU — Urban Air Quality Intelligence Platform

Frontend for ET AI Hackathon 2026, Problem Statement 5. A government operations console:
search any Indian place → real administrative boundary → live layers (pollution, population,
green cover, traffic, emission sources) → click anywhere → *what / who / why / so-what / do-this*,
ending in a statutorily grounded draft directive.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # rule-engine unit tests
npm run build      # typecheck + production build
```

No keys, no backend, no network required: by default (`VITE_USE_MOCKS` unset or `true`)
everything is served from cached boundary fixtures + deterministic client-side synthesis.
When online, place search and reverse geocoding upgrade transparently to live Nominatim.
Set `VITE_USE_MOCKS=false` once the backend serves the contracts in the build spec
(`/api/snapshot`, `/api/forecast`, `/api/inspect`).

## Demo path (4 min)

1. Type **Delhi** (or click the chip) — real NCT boundary draws, source-fusion checklist fills.
2. Stat strip: AQI, +24h forecast, 8.2M exposed, green cover, 61 VIIRS fires, congestion.
3. Click near **Anand Vihar** (east Delhi) — inspector: PM2.5 ~2.5× norm, **SO₂ over norm ⚠**.
4. Expand **Biomass burning** — fire pins + upwind back-trajectory cone draw on the map;
   several detections sit outside Delhi's jurisdiction (cross-district coordination insight).
5. Drag the time scrubber to +24h — the surface recolours toward Severe (press ▶ to animate).
6. Actions panel — GRAP stage invoked on the *forecast*, SO₂ stack-inspection rule with
   agency + legal basis. **Generate order draft** → formal dated directive citing the readings.
7. Search **Kharagpur** — everything works for a small town too.

Keyboard: `/` search · `1–5` layers · `Esc` close inspector · `Space` play scrubber.

## Where things live

- `src/lib/actions.ts` — the action rule engine (GRAP ladder + pollutant-specific rules,
  exposure-weighted ranking). Unit-tested in `src/lib/actions.test.ts`. **Single source of
  truth for GRAP text**; `src/lib/aqi.ts` owns CPCB bands and standards.
- `src/lib/inspect.ts` — builds the full click-point payload (IDW air quality, exposure,
  evidence-backed attribution, local forecast, actions).
- `src/lib/synth.ts` — deterministic mock synthesis; tuned profiles for Delhi / Mumbai /
  Kanpur / Kharagpur, seeded plausible data for any other place.
- `src/mocks/boundaries/` — real admin polygons (simplified), regenerate with
  `node scripts/fetch-boundaries.mjs`.
- `src/components/{layout,search,map,inspector,shared}` — UI per the build spec.

Stack: React 18 · TypeScript · Vite · MapLibre GL (CARTO dark-matter, ESRI satellite) ·
react-map-gl · Tailwind · Zustand · TanStack Query · Recharts · Turf.
