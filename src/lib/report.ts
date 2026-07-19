import type { InspectResult, Place } from '../types';
import { bandByKey, POLLUTANT_META } from './aqi';
import { formatCoord, formatDayTimeIST, formatDateLongIST, formatIN, formatKm } from './format';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="vg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#2563EB"/><stop offset="1" stop-color="#0EA5E9"/></linearGradient></defs><path d="M24 3.5 41.5 13.6v20.8L24 44.5 6.5 34.4V13.6Z" stroke="url(#vg)" stroke-width="3" stroke-linejoin="round"/><path d="M14 19h12.5a4 4 0 1 0-3.8-5.2" stroke="url(#vg)" stroke-width="2.6" stroke-linecap="round"/><path d="M12 25h20" stroke="url(#vg)" stroke-width="2.6" stroke-linecap="round"/><path d="M14 31h11.5a4 4 0 1 1-3.8 5.2" stroke="url(#vg)" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#8C2A2A',
  high: '#D63A2F',
  medium: '#DFA700',
  low: '#2563EB',
};

/** Inline SVG sparkline of the 72h forecast with CI ribbon. */
function forecastSvg(inspect: InspectResult): string {
  const series = inspect.forecast.series;
  if (series.length < 2) return '';
  const W = 640;
  const H = 140;
  const P = 8;
  const maxY = Math.max(...series.map((s) => s.upper)) * 1.1;
  const x = (h: number) => P + ((W - 2 * P) * h) / 72;
  const y = (v: number) => H - P - ((H - 2 * P) * v) / maxY;
  const line = series.map((s) => `${x(s.offsetHours).toFixed(1)},${y(s.aqi).toFixed(1)}`).join(' ');
  const ribbon =
    series.map((s) => `${x(s.offsetHours).toFixed(1)},${y(s.upper).toFixed(1)}`).join(' ') +
    ' ' +
    [...series]
      .reverse()
      .map((s) => `${x(s.offsetHours).toFixed(1)},${y(s.lower).toFixed(1)}`)
      .join(' ');
  const ticks = [0, 12, 24, 36, 48, 60, 72]
    .map(
      (h) =>
        `<text x="${x(h)}" y="${H - 2}" font-size="9" fill="#5F7288" text-anchor="middle" font-family="ui-monospace,monospace">${h === 0 ? 'now' : `+${h}h`}</text>`,
    )
    .join('');
  return `<svg viewBox="0 0 ${W} ${H + 14}" style="width:100%;height:auto">
    <polygon points="${ribbon}" fill="#2563EB" fill-opacity="0.12"/>
    <polyline points="${line}" fill="none" stroke="#2563EB" stroke-width="2"/>
    ${ticks}
  </svg>`;
}

/** A complete, self-contained, print-friendly HTML report for one inspection. */
export function buildReportHtml(inspect: InspectResult, place: Place): string {
  const aq = inspect.airQuality;
  const band = bandByKey(aq.band);
  const now = new Date();
  const crossing = inspect.forecast.crossesBandAt;

  const pollutantRows = aq.pollutants
    .map((p) => {
      const meta = POLLUTANT_META[p.key];
      return `<tr>
        <td>${meta.label}</td>
        <td class="num">${p.value.toFixed(1)} ${meta.unit}</td>
        <td class="num">${p.standard} ${meta.unit} (${meta.standardNote})</td>
        <td class="num">${p.ratio.toFixed(1)}×</td>
        <td>${p.exceeds ? '<span class="bad">EXCEEDS</span>' : '<span class="ok">within norm</span>'}</td>
      </tr>`;
    })
    .join('');

  const attributionBars = inspect.attribution.sources
    .map(
      (s) =>
        `<div class="attr-row">
          <span class="attr-label">${esc(s.label)}</span>
          <span class="attr-track"><span class="attr-fill" style="width:${s.sharePct}%"></span></span>
          <span class="attr-pct">${s.sharePct}%</span>
          <span class="attr-ev">${esc(s.evidenceSummary)}</span>
        </div>`,
    )
    .join('');

  const actionBlocks = inspect.actions
    .map(
      (a, i) => `<div class="action">
        <div class="action-head">
          <span class="sev" style="background:${SEVERITY_COLOR[a.severity]}1a;color:${SEVERITY_COLOR[a.severity]}">${a.severity.toUpperCase()}</span>
          <span class="cat">${a.category} · rank ${a.rankScore.toFixed(2)}</span>
        </div>
        <p class="action-text">${i + 1}. ${esc(a.action)}</p>
        <table class="kv">
          <tr><td>Why</td><td>${esc(a.reasoning)}</td></tr>
          <tr><td>Responsible</td><td>${esc(a.agency)}</td></tr>
          <tr><td>Legal basis</td><td>${esc(a.legalBasis)}</td></tr>
          <tr><td>Estimated effect</td><td>${a.estimatedEffect.aqiDelta[0]} to ${a.estimatedEffect.aqiDelta[1]} AQI within ${a.estimatedEffect.withinHours}h</td></tr>
        </table>
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VAYU report — ${esc(inspect.location.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1B2C40; background: #F3F6FA; padding: 24px; font-size: 14px; line-height: 1.55; }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 36px 40px; }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 18px; border-bottom: 2px solid #2563EB; }
  header .word { font-weight: 800; letter-spacing: .16em; font-size: 20px; }
  header .sub { color: #5F7288; font-size: 12px; }
  header .right { margin-left: auto; text-align: right; color: #5F7288; font-size: 12px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .14em; color: #5F7288; margin: 28px 0 10px; }
  .hero { display: flex; align-items: baseline; gap: 14px; margin-top: 18px; flex-wrap: wrap; }
  .hero .aqi { font-size: 56px; font-weight: 700; line-height: 1; }
  .hero .band { font-size: 18px; font-weight: 600; }
  .hero .meta { color: #44586E; }
  table.data { width: 100%; border-collapse: collapse; }
  table.data th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #5F7288; padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
  table.data td { padding: 7px 8px; border-bottom: 1px solid #EEF2F7; }
  td.num { font-variant-numeric: tabular-nums; }
  .ok { color: #16834A; font-weight: 600; font-size: 12px; }
  .bad { color: #CD3A30; font-weight: 700; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .stat { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; }
  .stat .v { font-size: 20px; font-weight: 700; }
  .stat .l { font-size: 11px; color: #5F7288; text-transform: uppercase; letter-spacing: .06em; }
  .attr-row { display: grid; grid-template-columns: 130px 1fr 44px; gap: 8px 10px; align-items: center; margin-bottom: 8px; }
  .attr-label { font-weight: 600; font-size: 13px; }
  .attr-track { height: 8px; background: #EAF0F6; border-radius: 4px; overflow: hidden; }
  .attr-fill { display: block; height: 100%; background: #2563EB; border-radius: 4px; }
  .attr-pct { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .attr-ev { grid-column: 2 / 4; color: #5F7288; font-size: 12px; margin-top: -4px; }
  .note { background: #F3F6FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; color: #44586E; }
  .crossing { color: #CC5F0A; font-weight: 600; }
  .action { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
  .action-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .sev { font-size: 11px; font-weight: 700; letter-spacing: .08em; padding: 2px 8px; border-radius: 99px; }
  .cat { font-size: 12px; color: #5F7288; text-transform: capitalize; }
  .action-text { font-weight: 600; margin-bottom: 8px; }
  table.kv td { padding: 3px 0; vertical-align: top; font-size: 13px; }
  table.kv td:first-child { color: #5F7288; width: 120px; }
  footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E2E8F0; color: #5F7288; font-size: 11px; }
  .print-btn { position: fixed; top: 16px; right: 16px; background: #2563EB; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,.35); }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: 0; border-radius: 0; padding: 12px 6px; max-width: none; }
    .print-btn { display: none; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
<div class="sheet">
  <header>
    ${LOGO_SVG}
    <div>
      <div class="word">VAYU</div>
      <div class="sub">Air Quality Inspection Report</div>
    </div>
    <div class="right">
      Generated ${formatDayTimeIST(now)} IST<br>${formatDateLongIST(now)}
    </div>
  </header>

  <div class="hero">
    <span class="aqi" style="color:${band.color}">${aq.aqi}</span>
    <div>
      <div class="band" style="color:${band.color}">${band.label}</div>
      <div class="meta">dominant pollutant ${POLLUTANT_META[aq.dominantPollutant].label}</div>
    </div>
    <div class="right" style="margin-left:auto;text-align:right;color:#44586E">
      <strong>${esc(inspect.location.name)}</strong><br>
      ${esc(place.displayName)}<br>
      ${formatCoord(inspect.location.lat)}, ${formatCoord(inspect.location.lon)}
    </div>
  </div>
  <p style="margin-top:8px;color:#5F7288;font-size:12px">
    ${
      aq.measurement === 'measured'
        ? `Measured at ${esc(aq.nearestStation.name)} station.`
        : `Interpolated from ${aq.stationCount} CPCB stations — nearest: ${esc(aq.nearestStation.name)}, ${formatKm(aq.nearestStation.distanceKm)} away.`
    }
    ${inspect.location.insideBoundary ? '' : ' Note: point lies outside the selected administrative boundary.'}
  </p>

  <h2>Pollutant readings vs CPCB standards</h2>
  <table class="data">
    <tr><th>Pollutant</th><th>Reading</th><th>CPCB standard</th><th>Ratio</th><th>Status</th></tr>
    ${pollutantRows}
  </table>

  <h2>Population exposed at this location</h2>
  <div class="grid">
    <div class="stat"><div class="v">${formatIN(inspect.exposure.populationWithin2km)}</div><div class="l">people within 2 km</div></div>
    <div class="stat"><div class="v">${formatIN(inspect.exposure.densityPerKm2)}</div><div class="l">per km² density</div></div>
    <div class="stat"><div class="v">${inspect.exposure.schools}</div><div class="l">schools within 2 km</div></div>
    <div class="stat"><div class="v">${inspect.exposure.hospitals}</div><div class="l">hospitals within 2 km</div></div>
    <div class="stat"><div class="v">${inspect.exposure.greenCoverPct.toFixed(1)}%</div><div class="l">green cover</div></div>
  </div>

  <h2>Source attribution — why it is like this (confidence ${inspect.attribution.confidence.toFixed(2)})</h2>
  ${attributionBars}
  <p class="note">${esc(inspect.attribution.explanation)}</p>

  <h2>72-hour forecast</h2>
  ${
    crossing
      ? `<p class="crossing">Crosses into ${bandByKey(crossing.band).label} in ~${crossing.offsetHours} hours (${formatDayTimeIST(crossing.at)} IST).</p>`
      : '<p>No CPCB band change expected within 72 hours.</p>'
  }
  ${forecastSvg(inspect)}
  <p style="color:#5F7288;font-size:11px">shaded ribbon = model confidence interval</p>

  <h2>Recommended actions (ranked)</h2>
  ${actionBlocks || '<p class="note">Air quality is within acceptable limits at this location. No interventions recommended.</p>'}

  <footer>
    Data: CPCB monitoring network · NASA VIIRS fire detections · TomTom traffic · WorldPop density ·
    ESA WorldCover · OpenStreetMap. Interpolated values are model estimates and carry uncertainty;
    verify against ground measurements before statutory action. Generated by VAYU.
  </footer>
</div>
</body>
</html>`;
}

/** Build the report and hand it to the browser as a file download. */
export function downloadReport(inspect: InspectResult, place: Place): void {
  const html = buildReportHtml(inspect, place);
  const slug = inspect.location.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vayu-report-${slug || 'location'}-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
