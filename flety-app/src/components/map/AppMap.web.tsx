import 'maplibre-gl/dist/maplibre-gl.css';
import './map.web.css';

import { LngLatBounds, Map as MapLibreMap, Marker, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme';

import { applyFletyPalette, OPENFREEMAP_STYLE_URL } from './flety-style';
import type { AppMapProps, MapMarker } from './types';

// En web: MapLibre + teselas vectoriales de OpenFreeMap (gratis, sin API key),
// recoloreadas con la paleta de Flety. En iOS/Android se usa AppMap.tsx.

let stylePromise: Promise<StyleSpecification> | null = null;
function loadStyle() {
  stylePromise ??= fetch(OPENFREEMAP_STYLE_URL)
    .then((res) => res.json())
    .then((style) => applyFletyPalette(style) as StyleSpecification);
  return stylePromise;
}

const TRUCK_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC233" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2z"/><path d="M14 10h4l4 4v2h-8z"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>';

const MARKER_HTML: Record<MapMarker['kind'], string> = {
  user: `<div class="flety-pin flety-pin-user"><div></div></div>`,
  origen: `<div class="flety-pin flety-pin-origen"></div>`,
  destino: `<div class="flety-pin flety-pin-destino"></div>`,
  chofer: `<div class="flety-pin flety-pin-chofer"><div>${TRUCK_SVG}</div></div>`,
};

function createMarkerElement(marker: MapMarker) {
  const el = document.createElement('div');
  el.innerHTML = MARKER_HTML[marker.kind];
  if (marker.label) el.setAttribute('aria-label', marker.label);
  return el;
}

const ROUTE_SOURCE = 'flety-ruta';

export function AppMap({ center, markers = [], line, fitToMarkers, padding, style }: AppMapProps) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef(new Map<string, { marker: Marker; kind: MapMarker['kind'] }>());
  const [ready, setReady] = useState(false);
  const initialCenter = useRef(center);

  // Crear el mapa una sola vez.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;

    loadStyle().then((mapStyle) => {
      if (cancelled) return;
      const map = new MapLibreMap({
        container,
        style: mapStyle,
        center: [initialCenter.current.lng, initialCenter.current.lat],
        zoom: 14,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      map.on('load', () => {
        map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'flety-ruta-casing',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': colors.white, 'line-width': 9 },
        });
        map.addLayer({
          id: 'flety-ruta',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': colors.ink, 'line-width': 5 },
        });
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    });

    const markersById = markerRefs.current;
    return () => {
      cancelled = true;
      markersById.forEach(({ marker }) => marker.remove());
      markersById.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcadores: crear, mover o sacar según la lista recibida.
  const markersKey = markers.map((m) => `${m.id}:${m.kind}:${m.position.lat},${m.position.lng}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markerRefs.current;
    const ids = new Set(markers.map((m) => m.id));

    current.forEach(({ marker }, id) => {
      if (!ids.has(id)) {
        marker.remove();
        current.delete(id);
      }
    });
    for (const m of markers) {
      const existing = current.get(m.id);
      if (existing && existing.kind === m.kind) {
        existing.marker.setLngLat([m.position.lng, m.position.lat]);
      } else {
        existing?.marker.remove();
        const marker = new Marker({ element: createMarkerElement(m) }).setLngLat([m.position.lng, m.position.lat]).addTo(map);
        current.set(m.id, { marker, kind: m.kind });
      }
    }
    // markersKey resume la lista para no recrear marcadores en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, ready]);

  // Recorrido.
  const lineKey = line?.map((pt) => `${pt.lat},${pt.lng}`).join('|') ?? '';
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    source?.setData({
      type: 'FeatureCollection',
      features:
        line && line.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line.map((pt) => [pt.lng, pt.lat]) } }]
          : [],
    });
    // lineKey resume el recorrido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey, ready]);

  // Encuadre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (fitToMarkers && markers.length > 1) {
      const bounds = new LngLatBounds();
      markers.forEach((m) => bounds.extend([m.position.lng, m.position.lat]));
      map.fitBounds(bounds, { padding: padding ?? { top: 80, right: 80, bottom: 80, left: 80 }, maxZoom: 15.5, duration: 600 });
    } else {
      map.easeTo({ center: [center.lng, center.lat], duration: 600 });
    }
    // markersKey resume los marcadores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, markersKey, fitToMarkers, ready]);

  // El contenedor interno es el que toma MapLibre (le pone position: relative),
  // así no pisa el posicionamiento que recibe el componente por `style`.
  return (
    <View style={style}>
      <View ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
