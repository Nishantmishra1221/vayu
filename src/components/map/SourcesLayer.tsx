import { useMemo } from 'react';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import { Flame, HardHat } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

/** The evidence layer: fires, industrial polygons, construction, road corridors. */
export default function SourcesLayer() {
  const place = useAppStore((s) => s.place);
  const active = useAppStore((s) => s.activeLayer) === 'sources';
  const { data: snapshot } = useSnapshot(place);

  const industrialFC: FeatureCollection | null = useMemo(() => {
    if (!snapshot) return null;
    return {
      type: 'FeatureCollection',
      features: snapshot.industrialSites.map((s) => ({
        type: 'Feature',
        geometry: s.polygon,
        properties: { name: s.name, kind: s.type },
      })),
    };
  }, [snapshot]);

  const roadsFC: FeatureCollection | null = useMemo(() => {
    if (!snapshot) return null;
    return {
      type: 'FeatureCollection',
      features: snapshot.trafficSegments.map((t) => ({
        type: 'Feature',
        geometry: t.geometry,
        properties: {},
      })),
    };
  }, [snapshot]);

  if (!active || !snapshot || !industrialFC || !roadsFC) return null;

  return (
    <>
      <Source id="src-roads" type="geojson" data={roadsFC}>
        <Layer
          id="src-roads-line"
          type="line"
          paint={{ 'line-color': '#8B7BD8', 'line-width': 2, 'line-opacity': 0.5 }}
        />
      </Source>
      <Source id="src-industrial" type="geojson" data={industrialFC}>
        <Layer
          id="src-industrial-fill"
          type="fill"
          paint={{ 'fill-color': '#D8622C', 'fill-opacity': 0.28 }}
        />
        <Layer
          id="src-industrial-line"
          type="line"
          paint={{ 'line-color': '#D8622C', 'line-width': 1.5, 'line-dasharray': [2, 1] }}
        />
      </Source>
      {snapshot.constructionSites.map((c, i) => (
        <Marker key={`c${i}`} longitude={c.lon} latitude={c.lat} anchor="center">
          <div title={c.name} className="text-source-dust">
            <HardHat size={14} />
          </div>
        </Marker>
      ))}
      {snapshot.fires.map((f, i) => (
        <Marker key={`f${i}`} longitude={f.lon} latitude={f.lat} anchor="center">
          <div
            title={`FRP ${f.frp} · ${f.satellite} · ${f.district}${f.withinBoundary ? '' : ' (outside boundary)'}`}
            className="text-aqi-verypoor"
            style={{ opacity: f.confidence === 'high' ? 1 : 0.65 }}
          >
            <Flame size={Math.min(22, 10 + f.frp / 3)} fill="#E0453B" strokeWidth={1} />
          </div>
        </Marker>
      ))}
    </>
  );
}
