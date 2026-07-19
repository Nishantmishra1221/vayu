import type { StyleSpecification } from 'maplibre-gl';

/** CARTO positron — free light vector style, no key. The map stays quiet; data is the only saturated colour. */
export const ROADS_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** ESRI World Imagery raster tiles for the satellite view. */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Imagery © Esri',
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#E8EDF2' } },
    { id: 'esri', type: 'raster', source: 'esri', paint: { 'raster-saturation': -0.25 } },
  ],
};
