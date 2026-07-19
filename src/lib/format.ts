/** Indian-locale number: 84,00,000 style grouping. */
export function formatIN(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

/** Compact population: 20.6M, 412K. */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

export function formatDecimal(n: number, places = 1): string {
  return n.toFixed(places);
}

const IST_OPTS: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

/** e.g. "14:20 IST" */
export function formatTimeIST(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return (
    d.toLocaleTimeString('en-IN', { ...IST_OPTS, hour: '2-digit', minute: '2-digit', hour12: false }) +
    ' IST'
  );
}

/** e.g. "Mon 20 Jul, 09:00" */
export function formatDayTimeIST(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const day = d.toLocaleDateString('en-IN', { ...IST_OPTS, weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { ...IST_OPTS, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
}

/** e.g. "19 July 2026" */
export function formatDateLongIST(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', { ...IST_OPTS, day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatCoord(n: number): string {
  return n.toFixed(4);
}

/** "4.2 km" / "850 m" */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
