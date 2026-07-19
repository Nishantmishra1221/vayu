# VAYU — Backend Integration Guide

This document is for the **backend team**. It explains how the frontend talks to a backend,
exactly which endpoints it calls, the JSON shapes it expects, and how to test your API
against the running frontend.

> Source of truth for all shapes: [`src/types.ts`](src/types.ts).
> Full product spec (including future endpoints): [`VAYU_FRONTEND_BUILD_SPEC.md`](VAYU_FRONTEND_BUILD_SPEC.md) §8.

---

## 1. The 60-second version

1. The frontend ships with mocks ON — it synthesises all data client-side and needs no backend.
2. To connect your backend, the frontend `.env` is changed to:
   ```env
   VITE_USE_MOCKS=false
   VITE_API_BASE_URL=http://localhost:8000   # your server
   ```
3. With mocks off, the frontend makes exactly **two** HTTP calls to you:

   | Endpoint | When it fires |
   |---|---|
   | `GET {base}/api/snapshot?placeId={id}` | Once when a city loads (cached 5 min) |
   | `GET {base}/api/forecast?placeId={id}` | Once when a city loads (cached 5 min) |

4. Everything else (geocoding, click-inspection, advisories) currently runs **inside the
   frontend** — you don't have to build it. See §5 for optional endpoints you can take over later.
5. Enable **CORS** for `http://localhost:5173` (Vite dev server) or the calls will fail.

---

## 2. Where the connection code lives (file map)

```
vayu/
├── .env.example              ← env template: VITE_USE_MOCKS, VITE_API_BASE_URL
├── src/
│   ├── config.ts             ← reads env; apiUrl() builds request URLs
│   ├── types.ts              ← ★ ALL request/response TypeScript shapes (contract)
│   ├── api/
│   │   ├── client.ts         ← ★ data access layer — the ONLY file that calls fetch()
│   │   │                        getSnapshot() / getForecast() switch on USE_MOCKS here
│   │   └── queries.ts        ← TanStack Query hooks (caching: staleTime 5 min, retry 1)
│   ├── lib/
│   │   ├── synth.ts          ← mock data generator — mimic its realism, not its code
│   │   ├── inspect.ts        ← builds the click-inspection from snapshot+forecast (client-side)
│   │   ├── interpolate.ts    ← IDW interpolation of station values onto a hex grid
│   │   ├── aqi.ts            ← CPCB bands, breakpoints, pollutant standards
│   │   └── narrative.ts      ← advisory / order-draft text generation (client-side)
│   └── mocks/boundaries/     ← offline boundary polygons: delhi, mumbai, kanpur, kharagpur
```

If you change or add an endpoint, the only frontend files that need touching are
`src/api/client.ts` (the fetch) and `src/types.ts` (the shape).

---

## 3. Endpoint contracts (what you must serve)

### 3.1 `GET /api/snapshot?placeId={id}`

One consolidated "current state of the city" document. Response `Content-Type: application/json`:

```jsonc
{
  "placeId": "delhi",
  "summary": {
    "aqi": 186,                       // integer, CPCB AQI
    "band": "moderate",               // "good" | "satisfactory" | "moderate" | "poor" | "very_poor" | "severe"
    "dominantPollutant": "pm25",      // "pm25" | "pm10" | "no2" | "so2" | "co" | "o3"
    "aqiForecast24h": 241,
    "populationTotal": 20600000,
    "populationExposedAbove200": 8400000,
    "greenCoverPct": 12.4,
    "activeFires24h": 61,
    "congestionRatio": 0.41           // 0..1, current speed / free-flow speed
  },
  "stations": [                       // every CPCB/AQICN station inside the bbox
    {
      "id": "DL001", "name": "Anand Vihar",
      "lat": 28.6469, "lon": 77.3152,
      "aqi": 218,
      "pm25": 142, "pm10": 266, "no2": 68, "so2": 94, "co": 1.8, "o3": 41,
      "source": "CPCB", "updatedAt": "2026-07-19T14:00:00Z"
    }
  ],
  "fires": [                          // VIIRS detections, last 24 h, within ~100 km
    {
      "lat": 28.91, "lon": 77.12, "frp": 12.4,
      "confidence": "high",           // "low" | "nominal" | "high"
      "satellite": "VIIRS_SNPP", "acquiredAt": "2026-07-19T08:12:00Z",
      "withinBoundary": false, "district": "Sonipat, Haryana"
    }
  ],
  "weather": {
    "windSpeedKmh": 8.2,
    "windDirectionDeg": 315,          // direction wind comes FROM (met convention)
    "boundaryLayerHeightM": 420,
    "temperatureC": 31.4, "humidityPct": 62, "precipitationMm": 0
  },
  "trafficSegments": [
    {
      "geometry": { "type": "LineString", "coordinates": [[77.20, 28.61], [77.22, 28.63]] },
      "currentSpeed": 18, "freeFlowSpeed": 44, "ratio": 0.41,
      "road": "NH-48"                 // optional
    }
  ],
  "industrialSites": [
    { "name": "Okhla Industrial Area", "type": "industrial",
      "polygon": { "type": "Polygon", "coordinates": [[[ /* … */ ]]] } }
  ],
  "constructionSites": [
    { "lat": 28.60, "lon": 77.25, "name": "Metro Phase IV site" }
  ],
  "vulnerableSites": [
    { "lat": 28.62, "lon": 77.21, "name": "AIIMS", "kind": "hospital" }  // "hospital" | "school" | "oldage"
  ],
  "populationGrid": {                 // GeoJSON FeatureCollection of polygons
    "type": "FeatureCollection",
    "features": [ /* each: { properties: { "value": 8400 } } = people per km² */ ]
  },
  "greenGrid": {
    "type": "FeatureCollection",
    "features": [ /* each: { properties: { "value": 24.8 } } = % vegetated */ ]
  },
  "sources": ["cpcb", "firms", "tomtom", "open-meteo", "worldpop", "esa-worldcover"],
  "fetchedAt": "2026-07-19T14:20:00Z"
}
```

Notes:
- **Every field above is read by the UI** — missing fields will crash panels. If you have no
  data for a list, send an empty array, not `null`.
- Grid features: any polygon tiling works (the mock uses ~650 m hexagons). The map colours
  each polygon by `properties.value`.
- `stations` drive the pollution surface: the frontend IDW-interpolates station values itself.

### 3.2 `GET /api/forecast?placeId={id}`

```jsonc
{
  "issuedAt": "2026-07-19T14:00:00Z",
  "cityLevel": [                      // 0..72 h in 3 h steps (25 entries)
    { "offsetHours": 0,  "aqi": 186, "lower": 168, "upper": 205 },
    { "offsetHours": 3,  "aqi": 195, "lower": 172, "upper": 219 }
    // … up to offsetHours: 72
  ],
  "baselines": { "persistence": 186, "cams": 194 },
  "sources": ["model-v1", "open-meteo"]
}
```

Notes:
- `lower`/`upper` are the confidence interval — drawn as the shaded ribbon in charts.
- `cityLevel` powers the time scrubber (map animation), the 72 h chart, the
  "+24 h" stat card, and the "crosses into `<band>` in N hours" warnings.
- 3-hour steps are expected; other step sizes will render but the scrubber snaps to 3 h.

### 3.3 Error behaviour

- Non-200 → the frontend shows a retry/error state (it throws `snapshot 500` etc.).
- Timeouts: no explicit timeout on these two calls; keep responses < 2 s for a good demo.
- Caching: responses are cached client-side for 5 minutes per `placeId` (TanStack Query).

---

## 4. `placeId` — what you'll receive

The frontend geocodes via Nominatim (OSM) directly, then calls you with:

| Pattern | Example | Meaning |
|---|---|---|
| fixture id | `delhi`, `mumbai`, `kanpur`, `kharagpur` | bundled demo cities |
| OSM id | `osm-R1234567`, `osm-W888`, `osm-N999` | live-geocoded place (R=relation, W=way, N=node) |

Treat `placeId` as an **opaque string key**. If you need the boundary polygon server-side,
resolve the OSM id yourself (`https://nominatim.openstreetmap.org/lookup?osm_ids=R1234567&polygon_geojson=1`)
or expose your own `/api/place` (below) so the id space is fully yours.

---

## 5. Optional endpoints (spec §8 — not called today, adopt when ready)

The build spec defines three more contracts. The frontend currently implements these
**client-side**, so they are optional. If the backend wants to own them, say so and the
frontend will switch `client.ts` to call you:

| Endpoint | Current frontend implementation |
|---|---|
| `GET /api/place?q=` | Nominatim search + `turf.simplify` of the polygon (`client.ts`) |
| `POST /api/inspect` `{placeId, lat, lon}` | `lib/inspect.ts` — builds air-quality/exposure/attribution/actions from snapshot+forecast |
| `POST /api/advisory` `{lat, lon, audience, language}` | `lib/narrative.ts` — templated text |

Full request/response JSON for these is in `VAYU_FRONTEND_BUILD_SPEC.md` §8.

---

## 6. Local dev — how to run the pair

**Frontend** (this repo):
```bash
git clone https://github.com/Nishantmishra1221/vayu.git
cd vayu
npm install
cp .env.example .env      # then edit:
#   VITE_USE_MOCKS=false
#   VITE_API_BASE_URL=http://localhost:8000
npm run dev               # → http://localhost:5173
```

**Backend requirements:**
- Listen on the URL you put in `VITE_API_BASE_URL` (default assumption: `http://localhost:8000`).
- **CORS**: allow origin `http://localhost:5173`, method `GET`, no credentials needed.
  - FastAPI: `app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])`
  - Express: `app.use(cors({ origin: "http://localhost:5173" }))`
- Alternative to CORS: serve the frontend and API from the same origin behind one reverse
  proxy — `VITE_API_BASE_URL` can then be left empty (same-origin requests).

**Quick self-test without the frontend:**
```bash
curl "http://localhost:8000/api/snapshot?placeId=delhi"  | jq .summary
curl "http://localhost:8000/api/forecast?placeId=delhi"  | jq '.cityLevel | length'   # expect 25
```

**Faking your API before it exists** — the mock generator (`src/lib/synth.ts`) shows exactly
what "realistic" data looks like (station spreads, fire clusters, diurnal forecast shape).
Copying its distributions makes the UI look right immediately.

---

## 7. Reference values the UI assumes

**CPCB AQI bands** (colours and thresholds are hard-coded frontend-side, `lib/aqi.ts`):

| Band | AQI range |
|---|---|
| good | 0–50 |
| satisfactory | 51–100 |
| moderate | 101–200 |
| poor | 201–300 |
| very_poor | 301–400 |
| severe | 401+ |

**CPCB pollutant standards** used for the "N× norm" bars:
`pm25: 60 µg/m³ (24h)` · `pm10: 100 (24h)` · `no2: 80 (24h)` · `so2: 80 (24h)` ·
`co: 4 mg/m³ (1h)` · `o3: 100 (8h)`

**Units**: concentrations in µg/m³ except CO in mg/m³; wind km/h; population absolute counts;
all timestamps ISO-8601 UTC (`Z`). The UI renders them in IST.

---

## 8. Integration checklist

- [ ] `GET /api/snapshot?placeId=delhi` returns the §3.1 shape (all keys, empty arrays not null)
- [ ] `GET /api/forecast?placeId=delhi` returns 25 `cityLevel` steps (0→72 h, step 3)
- [ ] Handles `osm-R…` style placeIds (or tells the frontend team to switch to `/api/place`)
- [ ] CORS allows `http://localhost:5173`
- [ ] Responses < 2 s
- [ ] Timestamps ISO-8601 UTC
- [ ] Frontend smoke test: set `VITE_USE_MOCKS=false`, load Delhi, check every stat card,
      map layer, and the click-inspector fills in

Questions / shape changes: update `src/types.ts` + this file in the same PR so the contract
never drifts from the code.
