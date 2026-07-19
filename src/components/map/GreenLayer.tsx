import { Layer, Source } from 'react-map-gl/maplibre';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

export const GREEN_RAMP = ['#14301E', '#256B3A', '#3E9E58', '#79C98C'];

export default function GreenLayer() {
  const place = useAppStore((s) => s.place);
  const active = useAppStore((s) => s.activeLayer) === 'green';
  const { data: snapshot } = useSnapshot(place);
  if (!active || !snapshot) return null;

  return (
    <Source id="green" type="geojson" data={snapshot.greenGrid}>
      <Layer
        id="green-fill"
        type="fill"
        paint={{
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0,
            GREEN_RAMP[0],
            12,
            GREEN_RAMP[1],
            30,
            GREEN_RAMP[2],
            60,
            GREEN_RAMP[3],
          ] as any,
          'fill-opacity': 0.55,
          'fill-outline-color': 'rgba(0,0,0,0)',
        }}
      />
    </Source>
  );
}
