const LABELS: Record<string, string> = {
  cpcb: 'CPCB',
  aqicn: 'AQICN',
  firms: 'VIIRS',
  viirs: 'VIIRS',
  tomtom: 'TOMTOM',
  'open-meteo': 'METEO',
  worldpop: 'WORLDPOP',
  'esa-worldcover': 'ESA',
  nominatim: 'OSM',
  osm: 'OSM',
  model: 'MODEL',
  'model-v1': 'MODEL',
  grap: 'GRAP',
};

/** Three-letter-ish provenance chip. Every displayed figure carries one. */
export default function SourceChip({ source, title }: { source: string; title?: string }) {
  const label = LABELS[source.toLowerCase()] ?? source.toUpperCase().slice(0, 8);
  return (
    <span
      title={title ?? `Source: ${label}`}
      className="inline-block rounded-sm border border-line px-1 py-px text-[9px] font-mono leading-none text-muted tracking-wider align-middle select-none"
    >
      {label}
    </span>
  );
}
