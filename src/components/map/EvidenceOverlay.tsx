import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import { Flame, HardHat } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useInspect } from '../../api/queries';

const SOURCE_COLORS: Record<string, string> = {
  industrial: '#D8622C',
  traffic: '#8B7BD8',
  biomass: '#3E9E58',
  dust: '#8A8A80',
  other: '#556070',
};

/**
 * Draws the supporting evidence for the expanded attribution row directly on
 * the map: the upwind back-trajectory cone plus the highlighted source
 * features (industrial polygons, fire detections, congested corridors).
 */
export default function EvidenceOverlay() {
  const place = useAppStore((s) => s.place);
  const inspector = useAppStore((s) => s.inspector);
  const expanded = useAppStore((s) => s.expandedEvidence);
  const { data: inspect } = useInspect(place, inspector);

  if (!inspect || !expanded) return null;
  const source = inspect.attribution.sources.find((s) => s.key === expanded);
  if (!source) return null;
  const color = SOURCE_COLORS[source.key];

  const pointFeatures =
    source.evidence.features.filter((f) => f.geometry.type === 'Point') ?? [];
  const shapeFeatures = {
    type: 'FeatureCollection' as const,
    features: source.evidence.features.filter((f) => f.geometry.type !== 'Point'),
  };

  return (
    <>
      <Source id="evidence-cone" type="geojson" data={inspect.attribution.windBackTrajectory}>
        <Layer
          id="evidence-cone-fill"
          type="fill"
          paint={{ 'fill-color': '#4C9AFF', 'fill-opacity': 0.1 }}
        />
        <Layer
          id="evidence-cone-line"
          type="line"
          paint={{ 'line-color': '#4C9AFF', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.8 }}
        />
      </Source>
      {shapeFeatures.features.length > 0 && (
        <Source id="evidence-shapes" type="geojson" data={shapeFeatures}>
          <Layer
            id="evidence-shapes-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{ 'fill-color': color, 'fill-opacity': 0.4 }}
          />
          <Layer
            id="evidence-shapes-line"
            type="line"
            paint={{ 'line-color': color, 'line-width': 3, 'line-opacity': 0.95 }}
          />
        </Source>
      )}
      {pointFeatures.map((f, i) => {
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        return (
          <Marker key={i} longitude={lon} latitude={lat} anchor="center">
            <div
              className="fire-pulse"
              style={{ color }}
              title={
                source.key === 'biomass'
                  ? `VIIRS · FRP ${props.frp} · ${props.district}${props.withinBoundary === false ? ' (outside boundary)' : ''}`
                  : String(props.name ?? '')
              }
            >
              {source.key === 'biomass' ? (
                <Flame size={20} fill={color} strokeWidth={1} />
              ) : (
                <HardHat size={16} />
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
