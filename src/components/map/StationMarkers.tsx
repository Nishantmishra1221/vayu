import { Marker } from 'react-map-gl/maplibre';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';
import { colorFor } from '../../lib/aqi';

export default function StationMarkers() {
  const place = useAppStore((s) => s.place);
  const visible = useAppStore((s) => s.overlays.stations);
  const pollutant = useAppStore((s) => s.pollutant);
  const { data: snapshot } = useSnapshot(place);
  if (!visible || !snapshot) return null;

  return (
    <>
      {snapshot.stations.map((st) => {
        const value = pollutant === 'aqi' ? st.aqi : st[pollutant];
        return (
          <Marker key={st.id} longitude={st.lon} latitude={st.lat} anchor="center">
            <div
              title={`${st.name} · AQI ${st.aqi} · ${st.source}`}
              className="flex items-center gap-1 rounded-full border border-line-strong bg-base/85 py-0.5 pl-1 pr-1.5 backdrop-blur-sm"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: colorFor(st.aqi) }}
              />
              <span className="font-mono text-[10px] leading-none text-primary">
                {pollutant === 'co' ? value.toFixed(1) : Math.round(value)}
              </span>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
