import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useAppStore } from '../../store/useAppStore';
import { useForecast, useSnapshot } from '../../api/queries';
import { AQI_STOPS, BAND_COLORS, pollutantStops } from '../../lib/aqi';
import { buildGrid, interpolateSurface } from '../../lib/interpolate';

/** Step expression: value → CPCB band colour. */
function stepExpression(stops: number[]): any[] {
  const expr: any[] = ['step', ['get', 'value'], BAND_COLORS[0]];
  stops.forEach((s, i) => expr.push(s, BAND_COLORS[i + 1]));
  return expr;
}

export default function PollutionLayer() {
  const place = useAppStore((s) => s.place);
  const pollutant = useAppStore((s) => s.pollutant);
  const timeOffsetHours = useAppStore((s) => s.timeOffsetHours);
  const active = useAppStore((s) => s.activeLayer) === 'pollution';
  const { data: snapshot } = useSnapshot(place);
  const { data: forecast } = useForecast(place);

  const cells = useMemo(
    () => (place ? buildGrid(place.boundary, 650) : []),
    [place],
  );

  const surface = useMemo(() => {
    if (!snapshot || cells.length === 0) return null;
    let multiplier = 1;
    if (timeOffsetHours > 0 && forecast) {
      const now = forecast.cityLevel[0]?.aqi ?? 1;
      const then = forecast.cityLevel.find((s) => s.offsetHours === timeOffsetHours)?.aqi ?? now;
      multiplier = then / Math.max(1, now);
    }
    return interpolateSurface(cells, snapshot.stations, pollutant, multiplier);
  }, [snapshot, cells, pollutant, timeOffsetHours, forecast]);

  if (!active || !surface) return null;

  const stops = pollutant === 'aqi' ? AQI_STOPS : pollutantStops(pollutant);

  return (
    <Source id="pollution" type="geojson" data={surface}>
      <Layer
        id="pollution-fill"
        type="fill"
        paint={{
          'fill-color': stepExpression(stops) as any,
          'fill-opacity': 0.48,
          'fill-outline-color': 'rgba(0,0,0,0)',
        }}
      />
    </Source>
  );
}
