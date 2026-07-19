# VAYU — Urban Air Quality Intelligence Platform
## Complete Frontend Build Specification

**For:** ET AI Hackathon 2026, Problem Statement 5 — AI-Powered Urban Air Quality Intelligence for Smart City Intervention
**Deliverable:** Working web frontend, demo-ready
**Audience of this doc:** an AI coding agent (Claude Code) building the frontend end to end

---

## 0. How to use this document

Build in the phase order given in Section 12. Do not build everything at once. After each phase, the app must run and be demoable. Phase 1–4 is the minimum viable demo; Phase 5–7 is what wins points.

All data contracts in Section 8 are authoritative. Build the entire frontend against the mock JSON fixtures first. The backend team wires real APIs to the same shapes later. **Never let a missing backend block frontend progress.**

---

## 1. What we are building, in one paragraph

A city administrator opens a map. They type a place name — "Delhi", "Chembur, Mumbai", "Kharagpur" — and the map draws that place's real administrative boundary and fills with live intelligence: current air quality, forecast air quality for the next 72 hours, how many people are exposed, how much green cover exists, how dense the population is, and how bad the traffic is. They click anywhere on the map. A panel opens telling them: this is what the air is like here, this is *why* it is like this (which sources, with what confidence, based on what evidence), and this is what you as a government body can legally and practically do about it right now. They click somewhere else and get the same for that location. Every number carries a visible source.

The one-sentence pitch: **existing platforms tell you the air is bad; this tells you why, who it is hurting, and what to do.**

---

## 2. Prior art — what exists and where we differ

This section exists so the build makes deliberate choices, not accidental ones.

| System | What it does | Where it stops |
|---|---|---|
| IITM Pune Decision Support System (DSS) | Real-time source apportionment for Delhi — splits PM2.5 between Delhi's own sectors, 19 surrounding districts, and stubble burning; models intervention effects | Delhi/NCR only. Heavy WRF-Chem numerical model. Not a public interactive tool. No arbitrary-place input. |
| CPCB Sameer app | Hourly official AQI nationwide, public complaint filing | Numbers only. No attribution, no forecast at ward level, no action guidance |
| IQAir / aqi.in / AQICN map | Global live AQI maps, forecasts, health advice | Consumer-facing. No source attribution, no population exposure, no government action layer |
| Google Air Quality API | AQI + pollutant detail + health recommendations across 100+ countries | Paid, opaque, no attribution or enforcement layer |

**Our four differentiators — every one must be visible in the demo:**

1. **Any place, not fixed cities.** Place-name search resolves to a real boundary polygon. Works for a metro, a ward, or a landmark.
2. **Source attribution with visible evidence.** Not just "44% industrial" but the actual satellite fire detections, the industrial polygons, and the wind vector that produced that number.
3. **Population exposure, not just concentration.** "2.4 million people under AQI 186", computed from the actual polygon.
4. **Statutory action recommendations.** Pollutant + source + forecast maps to real GRAP stages, CPCB norms, and municipal powers — with the legal basis cited.

---

## 3. Design direction

### Aesthetic thesis

This is a **government operations console**, not a consumer weather app. It should look like something a Municipal Commissioner would have on a wall screen at 7am during a smog episode. Serious, dense, legible at distance, no whimsy. The map is the product; the chrome is quiet and gets out of its way.

The single risk we take: **the map is dark and everything else is near-monochrome, so that the pollution data is the only saturated colour on screen.** Data is the only thing allowed to be bright. This is the opposite of consumer AQI apps, which colour everything.

### Colour tokens

```css
:root {
  /* Chrome — near-monochrome, cool slate */
  --bg-base:      #0E1116;   /* app background, behind map */
  --bg-panel:     #161A21;   /* side panels, cards */
  --bg-elevated:  #1E242D;   /* hover, active rows, popovers */
  --border:       #2A313C;   /* hairlines */
  --border-strong:#3A424F;

  --text-primary:   #E8ECF1;
  --text-secondary: #99A3B0;
  --text-muted:     #667080;

  --accent:       #4C9AFF;   /* interactive: links, selected, focus */
  --accent-dim:   #1F3A5F;

  /* Data — the only saturated colour in the product */
  /* CPCB AQI bands, official six-category scale */
  --aqi-good:      #2E9E5B;  /*   0–50   Good        */
  --aqi-satisfy:   #96C93D;  /*  51–100  Satisfactory*/
  --aqi-moderate:  #F2C230;  /* 101–200  Moderate    */
  --aqi-poor:      #F07C1F;  /* 201–300  Poor        */
  --aqi-verypoor:  #E0453B;  /* 301–400  Very Poor   */
  --aqi-severe:    #8C2A2A;  /* 401+     Severe      */

  /* Layer ramps — used only when that layer is active */
  --pop-ramp:   #1B2A4A → #3D5FA8 → #6C8FE0 → #A8C0F5;  /* population density, blue */
  --green-ramp: #14301E → #256B3A → #3E9E58 → #79C98C;  /* vegetation, green */
  --traffic-free: #2E9E5B;  --traffic-slow: #F2C230;  --traffic-jam: #E0453B;

  --source-industrial: #D8622C;
  --source-traffic:    #8B7BD8;
  --source-biomass:    #3E9E58;
  --source-dust:       #8A8A80;
  --source-other:      #556070;
}
```

Light mode is **not required**. Ship dark only. A control room is dark.

### Typography

- **Display / headings:** `Archivo` (variable, Google Fonts) at weights 500–600. Squarish, institutional, not the default Inter look.
- **Body / UI:** `Inter` 400/500.
- **Data / numerals:** `IBM Plex Mono` 400/500 for every AQI value, coordinate, timestamp, and percentage. Tabular numerals so digits do not jitter when values update live. This is the signature typographic move — all data reads as instrument output.

Type scale: 30 / 22 / 17 / 15 / 13 / 11 px. Sentence case everywhere. No ALL CAPS except three-letter source chips (CPCB, VIIRS).

### Layout skeleton

```
┌────────────────────────────────────────────────────────────────┐
│ TOP BAR  [VAYU]  [ search place… ]      [live 14:20] [layers ▾]│
├──────────┬─────────────────────────────────────┬───────────────┤
│  LEFT    │                                     │   RIGHT       │
│  RAIL    │                                     │   INSPECTOR   │
│  56px    │             MAP (fills)             │   380px       │
│  layer   │                                     │   (slides in  │
│  icons   │                                     │   on click)   │
│          │  ┌──────────────────────────────┐   │               │
│          │  │ legend      time scrubber    │   │               │
│          │  └──────────────────────────────┘   │               │
├──────────┴─────────────────────────────────────┴───────────────┤
│ STAT STRIP  AQI 186 │ +24h 241 │ exposed 2.4M │ green 12% │ …  │
└────────────────────────────────────────────────────────────────┘
```

The right inspector is closed on load and slides in when the user clicks the map. The map never gets smaller — the inspector overlays it with a slight scrim.

---

## 4. Tech stack — fixed, do not substitute

```
React 18 + TypeScript + Vite
MapLibre GL JS v4        — map engine (free, no token, unlike Mapbox)
react-map-gl v7          — React bindings for MapLibre
TailwindCSS v3           — styling, with the tokens above in tailwind.config
Zustand                  — global state (selected place, active layer, time index)
TanStack Query v5        — data fetching, caching, loading states
Recharts                 — the small charts in the inspector
Turf.js                  — client-side geospatial ops (bbox, centroid, point-in-polygon)
lucide-react             — icons
```

Basemap style: MapLibre demo tiles are too plain. Use **CARTO dark-matter** vector style, which is free and needs no key:
`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`

For the "road view / satellite view" toggle the teammate asked for, add:
- Roads: CARTO `dark-matter` (default) and `positron` (light roads, for the road view)
- Satellite: ESRI World Imagery raster tiles
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

**No Google Maps.** It needs billing and a key, it will fail in a demo, and MapLibre looks better here.

---

## 5. Screen-by-screen specification

### 5.1 Landing / search state

Full-bleed dark map of India, slightly desaturated, no data layers. Centred over it, a single search field — nothing else. Placeholder: `Search a city, ward, or landmark`.

Below the field, four one-click example chips: `Delhi` `Mumbai` `Kanpur` `Kharagpur`. These are pre-cached so a demo never waits.

Typing triggers geocoding autocomplete after a **1000ms debounce** (Nominatim's rate limit is 1 request per second — exceeding it gets you blocked mid-demo). Show a dropdown of up to 5 matches with `display_name`.

### 5.2 Resolving state

On selection, do **not** show a generic spinner. Show a checklist that fills in line by line — this is where the judges see multi-source fusion happening, so make it visible and make it take a beat:

```
✓ Boundary resolved — Delhi, 1,483 km²
✓ 38 monitoring stations in bounds
✓ Meteorology — wind 8 km/h NW, boundary layer 420 m
✓ 61 active fire detections within 100 km
✓ Population inside boundary — 20.6 million
⟳ Building forecast grid…
```

Each line appears as its fetch resolves. Total target: under 8 seconds.

### 5.3 Command centre (main screen)

Map flies to the boundary bounds with 40px padding. The boundary polygon draws with a 2px `--accent` outline and a very faint fill. **All data layers are clipped to this polygon** — the choropleth stops exactly at the administrative edge. This looks precise and takes one `fill` layer with the polygon as a mask.

Default active layer: **Pollution**.

**Stat strip** (bottom, always visible), six metric cells, mono numerals:

| Cell | Value | Sub-label |
|---|---|---|
| Current AQI | `186` coloured by band | `Moderate · CPCB` |
| Forecast +24h | `241` | `Poor · ↑ 55` |
| Population exposed | `20.6M` | `above AQI 200` |
| Green cover | `12.4%` | `of area` |
| Active fires | `61` | `VIIRS 24h` |
| Congestion | `0.41` | `of free flow` |

Each cell is clickable and switches the active map layer to the matching one.

### 5.4 Layer views — the left rail

Five mutually exclusive layers, icon buttons in the left rail, keyboard shortcuts 1–5:

**1. Pollution** (default)
Interpolated AQI surface across the boundary, coloured by the six CPCB bands. Station markers on top as small circles with their AQI value in mono text. A toggle switches between AQI / PM2.5 / PM10 / NO₂ / SO₂ / O₃ — the pollutant selector is a segmented control above the legend. This is what makes "SO₂ is high" a thing the user can actually see.

**2. Population density**
Choropleth in `--pop-ramp` from WorldPop gridded data. Legend in people per km². Overlay toggle: `show vulnerable sites` — pins for hospitals, schools, and old-age homes pulled from OpenStreetMap.

**3. Green cover**
Choropleth in `--green-ramp` from NDVI / ESA WorldCover land cover classes (tree cover, grassland, cropland classes count as green). Legend as % vegetated. This directly answers the teammate's "trees/green in the area" requirement.

**4. Traffic**
Road segments coloured by the ratio of current speed to free-flow speed from TomTom. **A toggle button switches traffic colouring on and off**, as specified by the teammate — off shows plain road geometry, on shows congestion colouring. Incident markers for accidents and closures.

**5. Sources**
All emission sources at once: fire detections as flame pins sized by fire radiative power, industrial land-use polygons hatched orange, construction sites, and major road corridors. This is the evidence layer.

**Always-available overlays** (checkboxes, stack on any layer):
- `Wind` — animated particle flow using current wind vector. Cheap to implement, enormously convincing on screen.
- `Boundary` — the administrative outline
- `Stations` — CPCB/AQICN monitor pins

**Basemap toggle** (top right): `Roads` / `Satellite`.

### 5.5 Time scrubber

Horizontal control at the bottom of the map. Range: `now` to `+72h` in 3-hour steps. Dragging it recolours the pollution choropleth from the forecast grid. A play button animates through the full range in about 10 seconds.

Label reads the absolute time, not an offset: `Mon 20 Jul, 09:00 · forecast`.

Only the Pollution layer is time-varying. When another layer is active, the scrubber dims and shows `current conditions`.

---

## 6. The click-on-map interaction — THE core feature

This is the single most important interaction in the product. Specify it carefully and build it first after the map works.

### Behaviour

The user clicks **anywhere** on the map inside the boundary. Not just on a marker — anywhere. A 20px accent-coloured ring pulses once at the click point, a pin drops, and the right inspector slides in over 200ms.

Clicking a different point **replaces** the inspector contents with the new location's data, and moves the pin. The previous pin is not kept. There is a `compare` button that pins the current location and lets a second click compare two locations side by side — build this only in Phase 7.

Pressing Escape or clicking the X closes the inspector.

### What the inspector shows — six stacked sections

The inspector scrolls. Sections in this exact order, because this order is the argument the product is making: *what → who → why → so what → do this*.

---

**Section 1 — Location header**

Reverse-geocoded place name from Nominatim, and coordinates in mono to 4 decimal places.

```
Anand Vihar, East Delhi
28.6469, 77.3152                    [×]
```

---

**Section 2 — Air quality now**

A large AQI number (48px, mono, coloured by band), the band name, and the dominant pollutant called out explicitly. Then a pollutant table.

```
       218
   Poor · dominant pollutant PM2.5

  PM2.5   142 µg/m³   ▓▓▓▓▓▓▓░░░  4.7× CPCB norm
  PM10    266 µg/m³   ▓▓▓▓▓▓░░░░  2.7× norm
  NO₂      68 µg/m³   ▓▓▓░░░░░░░  0.8× norm
  SO₂      94 µg/m³   ▓▓▓▓▓▓▓▓░░  1.2× norm   ⚠
  CO      1.8 mg/m³   ▓▓░░░░░░░░
  O₃       41 µg/m³   ▓░░░░░░░░░
```

Each row shows the value, a bar of the value against the CPCB 24-hour national ambient standard, and the multiple of the norm. **Any pollutant above 1.0× gets a warning marker and becomes a trigger for the action engine in Section 6.** This is exactly the "SO₂ is high, what can government do" path — it starts here.

CPCB 24-hour national ambient air quality standards to hardcode as the reference values:
```
PM2.5  60 µg/m³      PM10  100 µg/m³
NO₂    80 µg/m³      SO₂    80 µg/m³
CO      4 mg/m³ (1h) O₃    100 µg/m³ (8h)
```

Below the table: distance to the nearest real monitoring station and its name, so the user knows whether this reading is measured or interpolated. Label it honestly — `interpolated from 3 stations, nearest 4.2 km` — because judges will ask.

---

**Section 3 — Who is exposed here**

```
  Population within 2 km        412,000
  Population density         8,400 /km²
  Schools within 2 km                31
  Hospitals within 2 km               6
  Green cover in this cell         4.1%
```

The green cover figure connects to the teammate's requirement and doubles as an intervention lever — low green cover plus high particulate is a plantation recommendation.

---

**Section 4 — Why it is like this (source attribution)**

Horizontal stacked bar with the five source categories in their token colours, then a list with confidence and evidence.

```
  ████████████░░░░░░░░  attribution confidence 0.78

  Industrial          44%   ▸ 3 units within 3 km upwind
  Vehicular           29%   ▸ congestion 0.41 on NH-24
  Biomass burning     18%   ▸ 7 VIIRS detections, FRP 12.4
  Dust / construction  9%   ▸ 2 active sites
```

Each row is expandable. Expanding it **draws the evidence on the map** — the industrial polygons highlight, the fire pins pulse, the wind back-trajectory cone draws from the click point toward the upwind sources. This is the "geospatial evidence quality" criterion made literal, and it is the moment in the demo that convinces people.

Below it, a plain-language explanation generated from the attribution — one or two sentences, no jargon:

> Wind is carrying emissions from the industrial cluster 3 km northwest at 8 km/h, and a shallow 420 m boundary layer is preventing dispersion. Conditions are expected to worsen overnight as the boundary layer drops further.

---

**Section 5 — Forecast**

A 72-hour line chart (Recharts) of predicted AQI with the six band colours as horizontal background bands. Confidence interval as a shaded ribbon. Mark the point where the forecast crosses into a worse band, with the timestamp — this is the intervention window, and it is what "prediction lead time" means to a judge.

```
  Crosses into Very Poor in 14 hours — Mon 21:00
```

---

**Section 6 — Recommended actions** ← the answer to "what can government do"

See Section 7 for the full engine. In the UI it renders as a ranked list of cards:

```
┌──────────────────────────────────────────┐
│ ⬤ HIGH        Statutory · GRAP Stage III │
│ Halt non-essential construction           │
│ within 5 km of this point                 │
│                                           │
│ Why  Forecast AQI 412 crosses the Severe  │
│      threshold in 14h; dust contributes   │
│      9% and rises in dry conditions       │
│ Who  DPCC + Municipal Corporation         │
│ Legal basis  GRAP Stage III schedule      │
│ Est. effect  −18 to −30 AQI within 48h    │
│                                           │
│ [ Generate order draft ]  [ Dismiss ]     │
└──────────────────────────────────────────┘
```

Three to five cards, ranked by expected impact. Each has: severity, category (statutory / enforcement / advisory / long-term), the action, the reasoning tied to *this location's* data, the responsible agency, the legal basis, and an estimated effect with an honest range.

`Generate order draft` opens a modal with a formal draft directive — addressed, dated, citing the readings and the legal provision. This is the artifact that ends the demo.

---

## 7. The action recommendation engine

This is the intellectual core. Build it as a **rule engine with an LLM presentation layer**, not as a raw LLM call. Rules make it defensible and reproducible; the LLM only phrases the output. If a judge asks "how did it decide that", the answer must be a rule, not a vibe.

### Structure

```ts
type ActionRule = {
  id: string;
  trigger: (ctx: LocationContext) => boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'statutory' | 'enforcement' | 'advisory' | 'infrastructure';
  action: string;
  agency: string;
  legalBasis: string;
  estimatedEffect: { aqiDelta: [number, number]; withinHours: number };
  evidenceKeys: string[];   // which data fields justified it
};
```

### Trigger dimensions

Rules fire on combinations of: **dominant pollutant**, **dominant source**, **current AQI band**, **forecast AQI band**, **exposed population**, **meteorology** (boundary layer height, wind speed, precipitation), and **local factors** (green cover, construction density).

### The statutory ladder — GRAP

India's Graded Response Action Plan is the legal escalation framework, invoked by CAQM. Critically for our product: **GRAP stages are invoked in advance of the AQI actually reaching the projected level**, based on IMD/IITM forecasts — which is exactly the anticipatory logic our forecast enables. Stage IV corresponds to Severe+ conditions above AQI 450.

Encode the four stages against forecast AQI, and make the recommendation fire on the *forecast*, not the current reading:

| Stage | Forecast AQI band | Representative measures to encode |
|---|---|---|
| I | Poor, 201–300 | Dust control at construction sites, mechanised road sweeping, water sprinkling, enforce PUC certificates, ban open burning |
| II | Very Poor, 301–400 | Intensified sweeping and sprinkling, diesel generator restrictions, parking fee increases, boost public transport frequency |
| III | Severe, 401–450 | Halt non-essential construction and demolition, close stone crushers and mining, restrict BS-III petrol / BS-IV diesel vehicles, hybrid schooling for younger classes |
| IV | Severe+, above 450 | Stop truck entry except essentials, halt public construction projects, work-from-home directives, possible school closures |

**Do not hardcode the exact GRAP text verbatim into the product.** Store paraphrased action descriptions and link to the CAQM order page as the source. The current schedule is dated 21 November 2025 and is amended periodically, so the UI must show the version and date it is citing, and a note that the schedule is revised by CAQM.

### Pollutant-specific rules — the SO₂ case and others

This directly answers the question in the brief. Different pollutants have different sources and therefore completely different remedies. Encode at minimum:

**SO₂ elevated** (above 80 µg/m³, 24h)
Sulphur dioxide comes overwhelmingly from sulphur in fuel — coal combustion, industrial boilers, diesel generators, refineries, and smelting. It is not a traffic-dominated pollutant in the way NO₂ is. Rules:
- If SO₂ high AND industrial source share > 30% → *Inspect and sample stack emissions at the industrial units upwind. Verify flue gas desulphurisation operation and fuel sulphur content against consent conditions.* Agency: State Pollution Control Board. Basis: Air (Prevention and Control of Pollution) Act 1981, consent to operate conditions.
- If SO₂ high AND diesel generator density high AND grid supply unreliable → *Restrict diesel generator operation to essential services; prioritise grid reliability in this zone.* Basis: GRAP Stage II DG restrictions.
- If SO₂ high AND a thermal power plant is within 30 km → *Verify FGD installation and operational status against the emission norms compliance deadline.*
- Long-term: *Mandate fuel switching to PNG for industrial boilers in this cluster.*

**PM2.5 elevated with biomass source share > 25%**
- *Deploy field teams to the fire detection coordinates listed; issue notices under state crop-residue-burning rules.* Include the actual lat/lon list.
- *Coordinate with the neighbouring district if detections fall outside municipal jurisdiction* — trigger this whenever detections lie outside the searched boundary, which is very common and is a genuinely useful insight.

**PM10 elevated with dust source share > 20%**
- *Increase mechanised sweeping and water sprinkling frequency on the identified corridors; enforce anti-smog gun deployment at construction sites above 500 m².*
- *If green cover in the cell is below 10%, prioritise this ward for the plantation and green-buffer programme* — connects the green layer to an action.

**NO₂ elevated with vehicular share > 35%**
- *Signal-timing optimisation and traffic diversion on the congested corridors identified; intensify PUC enforcement at the entry points.*
- *If congestion ratio is below 0.4 during peak, evaluate a bus-lane or congestion-management intervention on this corridor.*

**O₃ elevated**
- Ozone is secondary — it forms from NOx and VOCs in sunlight, so it is not directly controllable. *Target precursor emissions: VOC leakage from fuel stations and solvent use, plus NOx from traffic. Issue a midday outdoor-exposure advisory for sensitive groups.*

**CO elevated**
- *Incomplete combustion — check for smouldering waste fires and biomass cookstove clusters in the exposed area.*

### Exposure-weighted ranking

Rank the fired rules by `estimatedAqiReduction × exposedPopulation × feasibility`, not by severity alone. An action that helps 400,000 people modestly outranks one that helps 4,000 people a lot. Show that ranking logic in a tooltip — judges reward visible reasoning.

### LLM layer

Send the fired rules plus the location context to the model and ask **only** for: (a) the plain-language explanation paragraph in Section 4, and (b) the formal order draft when requested. The model must not invent actions. Prompt it explicitly: *use only the provided rules; do not add recommendations that are not in the input.*

For citizen advisories, generate in the regional language of the state — Hindi for Delhi, Marathi for Maharashtra, Bengali for West Bengal, Tamil for Tamil Nadu, Kannada for Karnataka. Detect from the geocoded state name.

---

## 8. Data contracts

Build against these exactly. Put mock fixtures in `src/mocks/` matching every shape. Every response carries `sources` and `fetchedAt` so the UI can render provenance chips and staleness.

### `GET /api/place?q={query}`
```json
{
  "placeId": "delhi-nct",
  "displayName": "Delhi, India",
  "state": "Delhi",
  "language": "hi",
  "centroid": [77.2090, 28.6139],
  "bbox": [76.8389, 28.4045, 77.3465, 28.8834],
  "areaKm2": 1483,
  "boundary": { "type": "Polygon", "coordinates": [[[/* … */]]] },
  "sources": ["nominatim"],
  "fetchedAt": "2026-07-19T14:20:00Z"
}
```

### `GET /api/snapshot?placeId={id}`
```json
{
  "placeId": "delhi-nct",
  "summary": {
    "aqi": 186, "band": "moderate", "dominantPollutant": "pm25",
    "aqiForecast24h": 241,
    "populationTotal": 20600000,
    "populationExposedAbove200": 8400000,
    "greenCoverPct": 12.4,
    "activeFires24h": 61,
    "congestionRatio": 0.41
  },
  "stations": [
    { "id": "DL001", "name": "Anand Vihar", "lat": 28.6469, "lon": 77.3152,
      "aqi": 218, "pm25": 142, "pm10": 266, "no2": 68, "so2": 94, "co": 1.8, "o3": 41,
      "source": "CPCB", "updatedAt": "2026-07-19T14:00:00Z" }
  ],
  "fires": [
    { "lat": 28.91, "lon": 77.12, "frp": 12.4, "confidence": "high",
      "satellite": "VIIRS_SNPP", "acquiredAt": "2026-07-19T08:12:00Z",
      "withinBoundary": false, "district": "Sonipat, Haryana" }
  ],
  "weather": {
    "windSpeedKmh": 8.2, "windDirectionDeg": 315,
    "boundaryLayerHeightM": 420, "temperatureC": 31.4,
    "humidityPct": 62, "precipitationMm": 0
  },
  "trafficSegments": [
    { "geometry": { "type": "LineString", "coordinates": [[/* … */]] },
      "currentSpeed": 18, "freeFlowSpeed": 44, "ratio": 0.41 }
  ],
  "populationGrid": { "type": "FeatureCollection", "features": [] },
  "greenGrid":      { "type": "FeatureCollection", "features": [] },
  "sources": ["cpcb","aqicn","firms","tomtom","open-meteo","worldpop","esa-worldcover"],
  "fetchedAt": "2026-07-19T14:20:00Z"
}
```

Grid features carry `{ "properties": { "value": 8400, "unit": "people/km2" } }`.

### `GET /api/forecast?placeId={id}`
```json
{
  "issuedAt": "2026-07-19T14:00:00Z",
  "steps": [
    { "t": "2026-07-19T15:00:00Z", "offsetHours": 0,
      "grid": [ { "lat": 28.61, "lon": 77.20, "aqi": 186, "lower": 168, "upper": 205 } ] }
  ],
  "cityLevel": [ { "offsetHours": 0, "aqi": 186, "lower": 168, "upper": 205 } ],
  "baselines": { "persistence": 186, "cams": 194 },
  "sources": ["model-v1","open-meteo-cams"]
}
```

Including `baselines` in the payload matters — the evaluation criteria specifically ask for RMSE against a persistence baseline, so the UI should be able to show "our forecast vs persistence" on demand.

### `POST /api/inspect`
Request: `{ "placeId": "delhi-nct", "lat": 28.6469, "lon": 77.3152 }`
```json
{
  "location": { "name": "Anand Vihar, East Delhi", "lat": 28.6469, "lon": 77.3152 },
  "airQuality": {
    "aqi": 218, "band": "poor", "dominantPollutant": "pm25",
    "measurement": "interpolated",
    "nearestStation": { "name": "Anand Vihar", "distanceKm": 4.2 },
    "pollutants": [
      { "key": "so2", "value": 94, "unit": "µg/m³", "standard": 80,
        "ratio": 1.18, "exceeds": true }
    ]
  },
  "exposure": {
    "populationWithin2km": 412000, "densityPerKm2": 8400,
    "schools": 31, "hospitals": 6, "greenCoverPct": 4.1
  },
  "attribution": {
    "confidence": 0.78,
    "sources": [
      { "key": "industrial", "sharePct": 44, "evidenceSummary": "3 units within 3 km upwind",
        "evidence": { "type": "FeatureCollection", "features": [] } }
    ],
    "windBackTrajectory": { "type": "LineString", "coordinates": [] },
    "explanation": "Wind is carrying emissions from…"
  },
  "forecast": {
    "series": [ { "offsetHours": 0, "aqi": 218, "lower": 200, "upper": 236 } ],
    "crossesBandAt": { "offsetHours": 14, "band": "very_poor", "at": "2026-07-20T05:00:00Z" }
  },
  "actions": [
    { "id": "grap3-construction-halt", "severity": "high", "category": "statutory",
      "action": "Halt non-essential construction within 5 km",
      "reasoning": "Forecast AQI 412 crosses the Severe threshold in 14h…",
      "agency": "DPCC + Municipal Corporation",
      "legalBasis": "GRAP Stage III schedule, CAQM order dated 21 Nov 2025",
      "legalBasisUrl": "https://caqm.nic.in/",
      "estimatedEffect": { "aqiDelta": [-30, -18], "withinHours": 48 },
      "rankScore": 0.87 }
  ]
}
```

### `POST /api/advisory`
`{ "lat":…, "lon":…, "audience": "citizen" | "official", "language": "hi" }` → `{ "title":…, "body":…, "language":… }`

---

## 9. Component tree

```
src/
  App.tsx
  main.tsx
  store/
    useAppStore.ts            place, activeLayer, timeIndex, inspector, overlays
  api/
    client.ts                 fetch wrapper, mock switch via VITE_USE_MOCKS
    queries.ts                TanStack Query hooks
  mocks/
    delhi.snapshot.json  delhi.forecast.json  delhi.inspect.json
    mumbai.*  kharagpur.*
  components/
    layout/
      TopBar.tsx  LayerRail.tsx  StatStrip.tsx  AppShell.tsx
    search/
      PlaceSearch.tsx  SearchSuggestions.tsx  ExampleChips.tsx
      ResolvingChecklist.tsx
    map/
      MapCanvas.tsx           MapLibre instance, click handling
      BoundaryLayer.tsx
      PollutionLayer.tsx      interpolated AQI surface + clip mask
      PopulationLayer.tsx
      GreenLayer.tsx
      TrafficLayer.tsx        with the traffic on/off toggle
      SourcesLayer.tsx        fires, industry, construction
      StationMarkers.tsx
      WindOverlay.tsx         animated particles
      EvidenceOverlay.tsx     back-trajectory + highlighted sources
      MapLegend.tsx  TimeScrubber.tsx  BasemapToggle.tsx  ClickPin.tsx
    inspector/
      Inspector.tsx           the slide-in container
      LocationHeader.tsx
      AirQualityPanel.tsx     the pollutant table with norm bars
      ExposurePanel.tsx
      AttributionPanel.tsx    expandable rows that drive EvidenceOverlay
      ForecastPanel.tsx       Recharts
      ActionsPanel.tsx        the recommendation cards
      OrderDraftModal.tsx
    shared/
      SourceChip.tsx  AqiBadge.tsx  MetricCell.tsx  ConfidenceBar.tsx
      Skeleton.tsx  ErrorState.tsx  EmptyState.tsx
  lib/
    aqi.ts                    band calc, colour lookup, CPCB standards
    interpolate.ts            IDW interpolation from stations to grid
    geo.ts                    turf helpers, upwind cone construction
    actions.ts                the rule engine
    format.ts                 number and time formatting
  styles/
    tokens.css  index.css
```

### State shape

```ts
type AppState = {
  place: Place | null;
  activeLayer: 'pollution' | 'population' | 'green' | 'traffic' | 'sources';
  pollutant: 'aqi' | 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3';
  overlays: { wind: boolean; stations: boolean; boundary: boolean; traffic: boolean };
  basemap: 'roads' | 'satellite';
  timeOffsetHours: number;        // 0…72, step 3
  inspector: { open: boolean; lat: number; lon: number } | null;
  expandedEvidence: string | null; // which attribution row is drawing on the map
};
```

---

## 10. Interaction and quality rules

- **Every number shows its source.** A `SourceChip` next to any figure: `CPCB` `VIIRS` `TomTom` `WorldPop` `MODEL`. Non-negotiable — it is the difference between a dashboard and an intelligence product.
- **Never render a bare loading spinner over the whole app.** Skeletons in place, map stays interactive.
- **Interpolated values are labelled as interpolated.** Do not present a modelled number as a measurement.
- **Confidence is always visible** on attribution and forecast. A product that claims certainty it does not have loses technical credibility instantly.
- Round every displayed number. AQI as an integer, pollutant concentrations to one decimal, percentages to whole numbers, population with `toLocaleString('en-IN')` so it renders in the lakh/crore grouping.
- Timestamps in IST with the offset shown.
- Keyboard: `/` focuses search, `1`–`5` switch layers, `Esc` closes the inspector, `Space` plays the time scrubber.
- Responsive down to 1024px minimum. Below that show a message that the console needs a wider screen — this is a control-room tool and pretending otherwise wastes build time.
- Respect `prefers-reduced-motion`: disable the wind particles and the scrubber animation.
- Visible focus rings on every interactive element.

---

## 11. Failure and empty states

Write these carefully — judges probe them.

| Situation | What to show |
|---|---|
| Place not found | `No boundary found for "xyz". Try a city, district, or ward name.` |
| Place found but zero stations inside | Show the boundary, note `No CPCB stations inside this boundary — showing satellite and modelled estimates only`, and continue with reduced confidence. Do not fail. |
| An upstream API times out | Degrade that layer only. Show `Traffic data unavailable` in the layer rail with a retry. Everything else still works. |
| Click outside the boundary | Pin still drops, inspector opens, with a banner: `Outside the selected boundary — data may be less reliable here.` Do not block the click. |
| No actions fire | `Air quality is within acceptable limits at this location. No interventions recommended.` Not an error — a good outcome. |
| Rate limited by geocoder | `Search is rate limited. Try again in a moment.` Never a raw 429. |

---

## 12. Build phases

Each phase ends in a running, demoable app. Commit at every phase boundary.

**Phase 1 — Shell and map** (foundation)
Vite + React + TS + Tailwind with the tokens. AppShell, TopBar, LayerRail, StatStrip skeleton. MapLibre with CARTO dark-matter, centred on India. Basemap toggle. Verify: map pans, zooms, renders dark.

**Phase 2 — Place search and boundary**
PlaceSearch with debounced Nominatim autocomplete. On select, fly to bbox, draw the boundary polygon, populate the stat strip from the mock snapshot. ResolvingChecklist. Example chips. Verify: typing "Delhi" produces a boundary and stats.

**Phase 3 — Pollution layer and stations**
IDW interpolation from station points to a grid, clipped to the boundary, coloured by CPCB bands. Station markers. Legend. Pollutant segmented control. Verify: layer renders, switching pollutant recolours.

**Phase 4 — Click to inspect** ← the core feature
Map click handler, pin, inspector slide-in. Sections 1, 2, 3 (header, air quality, exposure). Clicking elsewhere updates it. Verify: click anywhere, get real-feeling detail; click again, it updates.

**Phase 5 — Attribution and evidence**
AttributionPanel with expandable rows. EvidenceOverlay drawing the back-trajectory cone and highlighting contributing sources on the map. Sources layer. Verify: expanding "Biomass burning" draws fire pins and the wind cone.

**Phase 6 — Forecast and actions**
Time scrubber recolouring the pollution layer. ForecastPanel chart with band crossing marked. The rule engine in `lib/actions.ts`. ActionsPanel cards. OrderDraftModal. Verify: SO₂ above norm produces the SO₂-specific industrial inspection recommendation.

**Phase 7 — Remaining layers and polish**
Population, green, and traffic layers with the traffic on/off toggle. Wind overlay. Vulnerable sites. Compare mode. Advisory generation. Keyboard shortcuts. Empty and error states. Reduced motion.

**Phase 8 — Demo hardening**
Offline mode reading entirely from cached fixtures, toggled by `VITE_USE_MOCKS=true`. Pre-warm Delhi, Mumbai, Kanpur, Kharagpur. Verify the full demo path runs with the network disconnected.

---

## 13. Acceptance criteria

The build is done when all of these are true:

1. Typing any Indian city name draws its real administrative boundary within 8 seconds.
2. All five layers render and switch without a page reload, each with a correct legend.
3. Traffic layer has a working with-traffic / without-traffic toggle.
4. Clicking any point on the map opens an inspector with all six sections populated.
5. Clicking a second point replaces the inspector contents correctly.
6. Every displayed figure has a visible source attribution chip.
7. Expanding an attribution row visibly draws its supporting evidence on the map.
8. A location with SO₂ above 80 µg/m³ produces an SO₂-specific recommendation naming the responsible agency and legal basis.
9. The time scrubber animates the forecast and recolours the map.
10. `Generate order draft` produces a formal, dated draft citing the actual readings.
11. The entire demo path runs with the network disconnected.
12. No console errors. No layout shift on inspector open.

---

## 14. Demo script — 4 minutes

1. **0:00** — Land on the search screen. Type `Delhi`. Boundary draws, checklist fills. *"One input. Everything else derives from it."*
2. **0:30** — Stat strip. *"AQI 186 — but the number that matters is 20.6 million people under it."*
3. **0:50** — Click Anand Vihar. Inspector opens. Scroll to the pollutant table. *"PM2.5 is 4.7 times the national standard. SO₂ is also over."*
4. **1:30** — Expand `Biomass burning`. Fire pins and the wind cone draw. *"Seven satellite detections, upwind, and three of them are in Sonipat — outside Delhi's jurisdiction. That is a coordination problem this system surfaces automatically."*
5. **2:10** — Time scrubber. Animate to +24h. Map darkens to Severe. *"Fourteen hours of lead time before this crosses into Severe."*
6. **2:40** — Actions panel. *"That lead time is why GRAP allows invoking a stage in advance of the AQI reaching it. Here is the specific action, the agency, and the legal provision."*
7. **3:10** — Generate order draft. Show the document.
8. **3:30** — Back to search. Type `Kharagpur`. It works. *"Not a Delhi tool. Any city, any ward, today."*

---

## 15. Notes for the implementing agent

- Do not use Google Maps. Do not use Mapbox. MapLibre + CARTO only.
- Do not use browser `localStorage`. Keep everything in Zustand.
- Do not invent air quality data outside the mock fixtures — if a value is unknown, render `—` and label it unavailable.
- Do not put the CPCB standards or GRAP stage descriptions in more than one place. `lib/aqi.ts` and `lib/actions.ts` own them.
- Prefer a smaller number of well-finished screens over many rough ones. One inspector that feels real beats five half-layers.
- Write the rule engine with pure functions and unit tests. It is the part a judge is most likely to interrogate.
- When in doubt about visual density, err denser. This is an operations console, not a landing page.
