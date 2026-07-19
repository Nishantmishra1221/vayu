import { Layer, Source } from 'react-map-gl/maplibre';
import { useAppStore } from '../../store/useAppStore';

export default function BoundaryLayer() {
  const place = useAppStore((s) => s.place);
  const visible = useAppStore((s) => s.overlays.boundary);
  if (!place || !visible) return null;
  return (
    <Source id="boundary" type="geojson" data={{ type: 'Feature', geometry: place.boundary, properties: {} }}>
      <Layer
        id="boundary-fill"
        type="fill"
        paint={{ 'fill-color': '#2563EB', 'fill-opacity': 0.04 }}
      />
      <Layer
        id="boundary-line"
        type="line"
        paint={{ 'line-color': '#2563EB', 'line-width': 2, 'line-opacity': 0.85 }}
      />
    </Source>
  );
}
