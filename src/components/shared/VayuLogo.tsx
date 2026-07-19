import { useId } from 'react';

/**
 * The VAYU mark: a hexagon (the map cell) with wind flowing through it —
 * "vayu" is Sanskrit for wind/air. Gradient from accent blue to sky teal.
 */
export default function VayuLogo({ size = 24 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 41.5 13.6v20.8L24 44.5 6.5 34.4V13.6Z"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M14 19h12.5a4 4 0 1 0-3.8-5.2"
        stroke={`url(#${id})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M12 25h20" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M14 31h11.5a4 4 0 1 1-3.8 5.2"
        stroke={`url(#${id})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
