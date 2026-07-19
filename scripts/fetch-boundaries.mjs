// One-time fixture generator: fetches real admin boundaries from Nominatim,
// simplifies them, and writes src/mocks/boundaries/<id>.json
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';

const CITIES = [
  { id: 'mumbaiA', q: 'Mumbai' },
  { id: 'mumbaiB', q: 'Mumbai Suburban, Maharashtra, India' },
];

const outDir = path.resolve('src/mocks/boundaries');
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const c of CITIES) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(c.q)}&format=jsonv2&polygon_geojson=1&limit=3&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vayu-hackathon-fixture-gen/1.0' } });
  if (!res.ok) {
    console.error(`FAIL ${c.id}: HTTP ${res.status}`);
    process.exitCode = 1;
    await sleep(1200);
    continue;
  }
  const results = await res.json();
  const hit = results.find((r) => r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon'));
  if (!hit) {
    console.error(`FAIL ${c.id}: no polygon result`);
    process.exitCode = 1;
    await sleep(1200);
    continue;
  }
  let geom = hit.geojson;
  // keep only the largest polygon of a MultiPolygon, then simplify
  if (geom.type === 'MultiPolygon') {
    let best = null;
    let bestArea = -1;
    for (const coords of geom.coordinates) {
      const a = turf.area(turf.polygon(coords));
      if (a > bestArea) {
        bestArea = a;
        best = coords;
      }
    }
    geom = { type: 'Polygon', coordinates: best };
  }
  const simplified = turf.simplify(turf.feature(geom), { tolerance: 0.002, highQuality: true });
  const areaKm2 = Math.round(turf.area(simplified) / 1e6);
  const bbox = turf.bbox(simplified).map((v) => Math.round(v * 1e4) / 1e4);
  const centroid = turf.centroid(simplified).geometry.coordinates.map((v) => Math.round(v * 1e4) / 1e4);
  const coords = simplified.geometry.coordinates.map((ring) =>
    ring.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]),
  );
  const out = {
    displayName: hit.display_name.split(',').slice(0, 2).join(',').trim(),
    state: hit.address?.state ?? hit.address?.city ?? '',
    centroid,
    bbox,
    areaKm2,
    boundary: { type: 'Polygon', coordinates: coords },
  };
  fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(out));
  console.log(`OK ${c.id}: ${out.displayName} | ${areaKm2} km² | ${coords[0].length} vertices`);
  await sleep(1200);
}
