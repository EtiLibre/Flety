import 'maplibre-gl/dist/maplibre-gl.css';
import './map.web.css';

import { LngLatBounds, Map as MapLibreMap, Marker, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { metrosEntre, rumbo } from '@/lib/geo';
import { colors } from '@/theme';

import { applyFletyPalette, MAP_PALETTE, MAP_PALETTE_DARK, OPENFREEMAP_STYLE_URL } from './flety-style';
import { TRUCK_3D_SVG } from './truck-sprite';
import type { AppMapProps, LatLng, MapMarker } from './types';

// En web: MapLibre + teselas vectoriales de OpenFreeMap (gratis, sin API key),
// recoloreadas con la paleta de Flety. En iOS/Android se usa AppMap.tsx.

const stylePromises: Partial<Record<'light' | 'dark', Promise<StyleSpecification>>> = {};
function loadStyle(tone: 'light' | 'dark') {
  stylePromises[tone] ??= fetch(OPENFREEMAP_STYLE_URL)
    .then((res) => res.json())
    .then(
      (style) => applyFletyPalette(style, tone === 'dark' ? MAP_PALETTE_DARK : MAP_PALETTE) as StyleSpecification
    );
  return stylePromises[tone];
}

const MARKER_HTML: Record<MapMarker['kind'], string> = {
  user: `<div class="flety-pin flety-pin-user"><div></div></div>`,
  origen: `<div class="flety-pin flety-pin-origen"></div>`,
  destino: `<div class="flety-pin flety-pin-destino"></div>`,
  chofer: `<div class="flety-truck"><div class="flety-truck-pulse"></div>${TRUCK_3D_SVG}</div>`,
};

function createMarkerElement(marker: MapMarker) {
  const el = document.createElement('div');
  el.innerHTML = MARKER_HTML[marker.kind];
  if (marker.label) el.setAttribute('aria-label', marker.label);
  return el;
}

type MarkerEntry = {
  marker: Marker;
  kind: MapMarker['kind'];
  position: LatLng;
  heading: number;
  frame: number | null;
};

const ROUTE_SOURCE = 'flety-ruta';
const MOVE_MS = 1000;

// Desliza el marcador hasta la nueva posición (en vez de "saltar").
function animateTo(entry: MarkerEntry, target: LatLng) {
  if (entry.frame !== null) cancelAnimationFrame(entry.frame);
  const from = entry.marker.getLngLat();
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / MOVE_MS);
    const ease = t * (2 - t);
    entry.marker.setLngLat([from.lng + (target.lng - from.lng) * ease, from.lat + (target.lat - from.lat) * ease]);
    entry.frame = t < 1 ? requestAnimationFrame(step) : null;
  };
  entry.frame = requestAnimationFrame(step);
}

export function AppMap({ center, markers = [], line, fitToMarkers, padding, tone = 'light', style }: AppMapProps) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef(new Map<string, MarkerEntry>());
  const [ready, setReady] = useState(false);
  const initialCenter = useRef(center);
  // El tono se fija al crear el mapa.
  const initialTone = useRef(tone);

  // Crear el mapa una sola vez.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;

    const dark = initialTone.current === 'dark';
    loadStyle(initialTone.current).then((mapStyle) => {
      if (cancelled) return;
      const map = new MapLibreMap({
        container,
        style: mapStyle,
        center: [initialCenter.current.lng, initialCenter.current.lat],
        zoom: 14,
        attributionControl: { compact: true },
        dragRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      map.on('load', () => {
        map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'flety-ruta-casing',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          // En oscuro la ruta va en amarillo (como en el canvas del chofer).
          paint: { 'line-color': dark ? colors.ink : colors.white, 'line-width': 9 },
        });
        map.addLayer({
          id: 'flety-ruta',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': dark ? colors.accent : colors.ink, 'line-width': 5 },
        });
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    });

    const entries = markerRefs.current;
    return () => {
      cancelled = true;
      entries.forEach((entry) => {
        if (entry.frame !== null) cancelAnimationFrame(entry.frame);
        entry.marker.remove();
      });
      entries.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcadores: crear, mover (el chofer se desliza y gira hacia donde va) o sacar.
  const markersKey = markers.map((m) => `${m.id}:${m.kind}:${m.position.lat},${m.position.lng}:${m.heading ?? ''}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markerRefs.current;
    const ids = new Set(markers.map((m) => m.id));

    current.forEach((entry, id) => {
      if (!ids.has(id)) {
        if (entry.frame !== null) cancelAnimationFrame(entry.frame);
        entry.marker.remove();
        current.delete(id);
      }
    });

    for (const m of markers) {
      const existing = current.get(m.id);
      if (existing && existing.kind === m.kind) {
        if (m.kind === 'chofer') {
          const moved = metrosEntre(existing.position, m.position) > 3;
          const heading = m.heading ?? (moved ? rumbo(existing.position, m.position) : existing.heading);
          existing.heading = heading;
          existing.marker.setRotation(heading);
          if (moved) animateTo(existing, m.position);
        } else {
          existing.marker.setLngLat([m.position.lng, m.position.lat]);
        }
        existing.position = m.position;
      } else {
        existing?.marker.remove();
        const isTruck = m.kind === 'chofer';
        const marker = new Marker({
          element: createMarkerElement(m),
          // El camión "apoya" sobre el mapa: gira con el rumbo y se inclina con la perspectiva.
          rotationAlignment: isTruck ? 'map' : 'viewport',
          pitchAlignment: isTruck ? 'map' : 'viewport',
          rotation: isTruck ? (m.heading ?? 0) : 0,
        })
          .setLngLat([m.position.lng, m.position.lat])
          .addTo(map);
        current.set(m.id, { marker, kind: m.kind, position: m.position, heading: m.heading ?? 0, frame: null });
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

  // Encuadre: se recalcula cuando cambian los puntos fijos (retiro/entrega) o
  // aparece/desaparece el chofer, no con cada paso del camión.
  const fitKey = markers
    .map((m) => (m.kind === 'chofer' ? 'chofer' : `${m.id}:${m.position.lat},${m.position.lng}`))
    .join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (fitToMarkers && markers.length > 1) {
      const bounds = new LngLatBounds();
      markers.forEach((m) => bounds.extend([m.position.lng, m.position.lat]));
      map.fitBounds(bounds, {
        padding: padding ?? { top: 80, right: 80, bottom: 80, left: 80 },
        maxZoom: 15.5,
        duration: 700,
      });
    } else {
      map.easeTo({ center: [center.lng, center.lat], duration: 700 });
    }
    // fitKey resume los puntos que importan para el encuadre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, fitKey, fitToMarkers, ready]);

  // El contenedor interno es el que toma MapLibre (le pone position: relative),
  // así no pisa el posicionamiento que recibe el componente por `style`.
  return (
    <View style={style}>
      <View ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
