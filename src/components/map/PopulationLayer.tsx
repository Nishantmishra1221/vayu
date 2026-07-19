import { Layer, Source } from 'react-map-gl/maplibre';
import { Marker } from 'react-map-gl/maplibre';
import { Cross, GraduationCap, HeartPulse } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

export const POP_RAMP = ['#1B2A4A', '#3D5FA8', '#6C8FE0', '#A8C0F5'];

export default function PopulationLayer() {
  const place = useAppStore((s) => s.place);
  const active = useAppStore((s) => s.activeLayer) === 'population';
  const showVulnerable = useAppStore((s) => s.overlays.vulnerable);
  const { data: snapshot } = useSnapshot(place);
  if (!active || !snapshot) return null;

  return (
    <>
      <Source id="population" type="geojson" data={snapshot.populationGrid}>
        <Layer
          id="population-fill"
          type="fill"
          paint={{
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'value'],
              0,
              POP_RAMP[0],
              4000,
              POP_RAMP[1],
              12000,
              POP_RAMP[2],
              25000,
              POP_RAMP[3],
            ] as any,
            'fill-opacity': 0.55,
            'fill-outline-color': 'rgba(0,0,0,0)',
          }}
        />
      </Source>
      {showVulnerable &&
        snapshot.vulnerableSites.map((v, i) => (
          <Marker key={i} longitude={v.lon} latitude={v.lat} anchor="center">
            <div
              title={`${v.name} (${v.kind})`}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-panel text-secondary"
            >
              {v.kind === 'hospital' ? (
                <Cross size={10} className="text-aqi-verypoor" />
              ) : v.kind === 'school' ? (
                <GraduationCap size={11} className="text-accent" />
              ) : (
                <HeartPulse size={10} className="text-aqi-poor" />
              )}
            </div>
          </Marker>
        ))}
    </>
  );
}
