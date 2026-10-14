// Paleta del mapa (la misma del canvas de diseño): fondo gris claro, calles
// blancas, avenidas principales en ámbar suave, parques verdes y agua celeste.
export const MAP_PALETTE = {
  land: '#E9ECEF',
  landuse: '#E4E7EA',
  building: '#DFE3E7',
  buildingOutline: '#D5DAE0',
  park: '#D4E7D2',
  wood: '#D9E8D5',
  water: '#CFE1EF',
  waterway: '#B8D3E8',
  road: '#FFFFFF',
  roadCasing: '#DDE1E6',
  avenue: '#F7D98F',
  avenueCasing: '#EBC56E',
  rail: '#D5D9DE',
  label: '#5B6470',
  placeLabel: '#3A3F45',
  waterLabel: '#4A6A85',
  halo: '#FFFFFF',
} as const;

// Estilo base de OpenFreeMap (gratis, sin API key, uso comercial permitido).
export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

type Paint = Record<string, unknown>;
type Layer = { id: string; type: string; paint?: Paint };
type Style = { layers: Layer[] };

const p = MAP_PALETTE;

// Colores por capa del estilo "positron". Las capas que no aparecen quedan como vienen.
const OVERRIDES: Record<string, Paint> = {
  background: { 'background-color': p.land },
  park: { 'fill-color': p.park },
  water: { 'fill-color': p.water },
  waterway: { 'line-color': p.waterway },
  // Zonas residenciales y edificios casi fundidos con el fondo: el mapa queda
  // limpio y lo que resalta son calles, avenidas y los marcadores del pedido.
  landuse_residential: { 'fill-color': p.land },
  landcover_wood: { 'fill-color': p.wood },
  building: { 'fill-color': p.building, 'fill-outline-color': p.building, 'fill-opacity': 0.45 },
  road_area_pier: { 'fill-color': p.land },
  road_pier: { 'line-color': p.land },
  highway_path: { 'line-color': '#F7F8F9' },
  highway_minor: { 'line-color': p.road, 'line-opacity': 1 },
  // Avenidas principales (primary/trunk) en ámbar suave, como en el canvas.
  highway_major_casing: { 'line-color': ['match', ['get', 'class'], ['primary', 'trunk'], p.avenueCasing, p.roadCasing] },
  highway_major_inner: { 'line-color': ['match', ['get', 'class'], ['primary', 'trunk'], p.avenue, p.road] },
  highway_major_subtle: { 'line-color': p.road },
  highway_motorway_casing: { 'line-color': p.avenueCasing },
  highway_motorway_inner: { 'line-color': p.avenue },
  highway_motorway_subtle: { 'line-color': p.avenue },
  highway_motorway_bridge_casing: { 'line-color': p.avenueCasing },
  highway_motorway_bridge_inner: { 'line-color': p.avenue },
  tunnel_motorway_casing: { 'line-color': p.avenueCasing },
  tunnel_motorway_inner: { 'line-color': p.avenue },
  railway: { 'line-color': p.rail },
  railway_transit: { 'line-color': p.rail },
  railway_service: { 'line-color': p.rail },
  'highway-name-path': { 'text-color': p.label, 'text-halo-color': p.halo },
  'highway-name-minor': { 'text-color': p.label, 'text-halo-color': p.halo },
  'highway-name-major': { 'text-color': p.label, 'text-halo-color': p.halo },
  water_name_point_label: { 'text-color': p.waterLabel },
  water_name_line_label: { 'text-color': p.waterLabel },
  waterway_line_label: { 'text-color': p.waterLabel },
};

const PLACE_LABEL = /^label_/;

export function applyFletyPalette<T extends Style>(style: T): T {
  for (const layer of style.layers) {
    const override = OVERRIDES[layer.id];
    if (override) layer.paint = { ...layer.paint, ...override };
    if (PLACE_LABEL.test(layer.id)) {
      layer.paint = { ...layer.paint, 'text-color': p.placeLabel, 'text-halo-color': p.halo };
    }
  }
  return style;
}

// Estilo para Google Maps (Android, y iOS si se usa el proveedor de Google).
export const GOOGLE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: p.land }] },
  { elementType: 'labels.text.fill', stylers: [{ color: p.label }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: p.halo }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: p.park }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: p.road }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: p.avenue }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: p.avenueCasing }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: p.water }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: p.waterLabel }] },
];
