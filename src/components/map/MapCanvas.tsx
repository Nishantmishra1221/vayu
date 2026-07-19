import { useCallback, useEffect, useRef } from 'react';
import Map, { AttributionControl, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import { useAppStore } from '../../store/useAppStore';
import { DARK_STYLE, SATELLITE_STYLE } from './basemaps';
import BoundaryLayer from './BoundaryLayer';
import PollutionLayer from './PollutionLayer';
import PopulationLayer from './PopulationLayer';
import GreenLayer from './GreenLayer';
import TrafficLayer from './TrafficLayer';
import SourcesLayer from './SourcesLayer';
import StationMarkers from './StationMarkers';
import EvidenceOverlay from './EvidenceOverlay';
import ClickPin from './ClickPin';
import WindOverlay from './WindOverlay';

const INDIA_VIEW = { longitude: 79.5, latitude: 22.5, zoom: 4.1 };

export default function MapCanvas() {
  const place = useAppStore((s) => s.place);
  const basemap = useAppStore((s) => s.basemap);
  const resolving = useAppStore((s) => s.resolving);
  const openInspector = useAppStore((s) => s.openInspector);
  const mapRef = useRef<MapRef>(null);

  // Fly to the boundary with 40px padding whenever the place changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (place) {
      map.fitBounds(
        [
          [place.bbox[0], place.bbox[1]],
          [place.bbox[2], place.bbox[3]],
        ],
        { padding: 60, duration: 2200 },
      );
    } else {
      map.flyTo({ center: [INDIA_VIEW.longitude, INDIA_VIEW.latitude], zoom: INDIA_VIEW.zoom, duration: 1600 });
    }
  }, [place]);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!useAppStore.getState().place || useAppStore.getState().resolving) return;
      openInspector(e.lngLat.lat, e.lngLat.lng);
    },
    [openInspector],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={INDIA_VIEW}
      mapStyle={basemap === 'roads' ? DARK_STYLE : (SATELLITE_STYLE as any)}
      onClick={onClick}
      attributionControl={false}
      cursor={place && !resolving ? 'crosshair' : 'grab'}
      style={{ position: 'absolute', inset: 0 }}
    >
      <AttributionControl compact position="bottom-right" />
      <PollutionLayer />
      <PopulationLayer />
      <GreenLayer />
      <TrafficLayer />
      <SourcesLayer />
      <BoundaryLayer />
      <EvidenceOverlay />
      <StationMarkers />
      <ClickPin />
      <WindOverlay />
    </Map>
  );
}
