import { bandFor } from '../../lib/aqi';

export default function AqiBadge({ aqi, size = 'md' }: { aqi: number; size?: 'sm' | 'md' | 'lg' }) {
  const band = bandFor(aqi);
  const cls =
    size === 'lg'
      ? 'text-[48px] leading-none font-semibold'
      : size === 'md'
        ? 'text-lg font-medium'
        : 'text-xs font-medium';
  return (
    <span className={`font-mono ${cls}`} style={{ color: band.color }}>
      {Math.round(aqi)}
    </span>
  );
}
