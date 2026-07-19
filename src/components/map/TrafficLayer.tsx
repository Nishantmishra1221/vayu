import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

/**
 * Road segments coloured by current/free-flow speed ratio. The overlays.traffic
 * flag is the with/without-congestion-colouring toggle: off shows plain
 * road geometry.
 */
export default function TrafficLayer() {
  const place = useAppStore((s) => s.place);
  const active = useAppStore((s) => s.activeLayer) === 'traffic';
  const coloured = useAppStore((s) => s.overlays.traffic);
  const { data: snapshot } = useSnapshot(place);

  const fc: FeatureCollection | null = useMemo(() => {
    if (!snapshot) return null;
    return {
      type: 'FeatureCollection',
      features: snapshot.trafficSegments.map((t) => ({
        type: 'Feature',
        geometry: t.geometry,
        properties: { ratio: t.ratio, road: t.road ?? '' },
      })),
    };
  }, [snapshot]);

  if (!active || !fc) return null;

  return (
    <Source id="traffic" type="geojson" data={fc}>
      <Layer
        id="traffic-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#FFFFFF', 'line-width': 6, 'line-opacity': 0.85 }}
      />
      <Layer
        id="traffic-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': coloured
            ? ([
                'step',
                ['get', 'ratio'],
                '#D63A2F', // jammed
                0.5,
                '#DFA700', // slow
                0.75,
                '#199A55', // free flow
              ] as any)
            : '#8B99A8',
          'line-width': 3.5,
          'line-opacity': 0.9,
        }}
      />
    </Source>
  );
}
