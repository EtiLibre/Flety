import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { metrosEntre, rumbo } from '@/lib/geo';
import { IconoCamioneta } from '@/plataforma/estilo';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors } from '@/theme';

import { applyFletyPalette, MAP_PALETTE, MAP_PALETTE_DARK, OPENFREEMAP_STYLE_URL } from './flety-style';
import { GRUA_3D_SVG, GRUA_SIZE } from './grua-sprite';
import { TruckSprite } from './TruckSprite';
import { GIRA_CON_RUMBO, type AppMapProps, type LatLng, type MapMarker } from './types';

// En iOS/Android: MapLibre nativo con las mismas teselas de OpenFreeMap y la
// misma paleta que la web (AppMap.web.tsx). Gratis, sin Google ni API key.

const estilos: Partial<Record<'light' | 'dark', Promise<StyleSpecification>>> = {};
function cargarEstilo(tono: 'light' | 'dark') {
  estilos[tono] ??= fetch(OPENFREEMAP_STYLE_URL)
    .then((res) => res.json())
    .then((style) => applyFletyPalette(style, tono === 'dark' ? MAP_PALETTE_DARK : MAP_PALETTE) as StyleSpecification);
  return estilos[tono];
}

const lngLat = (p: LatLng): [number, number] => [p.lng, p.lat];

export function AppMap({
  center,
  markers = [],
  line,
  fitToMarkers,
  padding,
  tone = 'light',
  initialZoom = 14,
  estatico,
  onMoveStart,
  onCenterChange,
  style,
}: AppMapProps) {
  const camara = useRef<CameraRef>(null);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [inicial] = useState(() => ({ center: lngLat(center), zoom: initialZoom }));

  useEffect(() => {
    let cancelled = false;
    cargarEstilo(tone).then((s) => !cancelled && setMapStyle(s));
    return () => {
      cancelled = true;
    };
  }, [tone]);

  // Rumbo del chofer: si no viene, sale del movimiento (patrón "info del render anterior").
  const chofer = markers.find((m) => m.kind === 'chofer');
  const choferKey = chofer ? `${chofer.position.lat},${chofer.position.lng}` : '';
  const [truck, setTruck] = useState<{ key: string; position: LatLng | null; heading: number }>({
    key: '',
    position: null,
    heading: 0,
  });
  if (chofer && truck.key !== choferKey) {
    const moved = truck.position ? metrosEntre(truck.position, chofer.position) > 3 : false;
    const heading =
      chofer.heading ?? (moved && truck.position ? rumbo(truck.position, chofer.position) : truck.heading);
    setTruck({ key: choferKey, position: chofer.position, heading });
  }
  const truckHeading = chofer?.heading ?? truck.heading;

  // Encuadre: puntos fijos (retiro/entrega) y si aparece el chofer; no la
  // flota de ambiente (amb-*) ni cada paso de los vehículos.
  const aEncuadrar = markers.filter((m) => !m.id.startsWith('amb-'));
  const fitKey = aEncuadrar
    .map((m) => (GIRA_CON_RUMBO.has(m.kind) ? m.id : `${m.id}:${m.position.lat},${m.position.lng}`))
    .join('|');
  const listo = !!mapStyle;
  useEffect(() => {
    const cam = camara.current;
    if (!cam || !listo) return;
    if (fitToMarkers && aEncuadrar.length > 1) {
      const lats = aEncuadrar.map((m) => m.position.lat);
      const lngs = aEncuadrar.map((m) => m.position.lng);
      cam.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], {
        padding: padding ?? { top: 80, right: 60, bottom: 80, left: 60 },
        duration: 600,
      });
    } else {
      cam.easeTo({ center: lngLat(center), duration: 500 });
    }
    // fitKey resume los puntos que importan para el encuadre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, fitKey, fitToMarkers, listo]);

  if (!mapStyle) {
    return <View style={[style, { backgroundColor: tone === 'dark' ? '#1A1F26' : colors.mapLand }]} />;
  }

  return (
    <View style={style}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logo={false}
        compass={false}
        touchRotate={false}
        touchPitch={false}
        dragPan={!estatico}
        touchZoom={!estatico}
        doubleTapZoom={!estatico}
        doubleTapHoldZoom={!estatico}
        attributionPosition={{ bottom: 6, right: 6 }}
        onRegionWillChange={(e) => {
          if (e.nativeEvent.userInteraction) onMoveStart?.();
        }}
        onRegionDidChange={(e) => {
          const [lng, lat] = e.nativeEvent.center;
          onCenterChange?.({ lat, lng });
        }}>
        <Camera ref={camara} initialViewState={inicial} />
        {line && line.length > 1 ? (
          <GeoJSONSource
            id="flety-ruta"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: line.map(lngLat) },
            }}>
            <Layer
              id="flety-ruta-borde"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': tone === 'dark' ? colors.ink : colors.white, 'line-width': 9 }}
            />
            <Layer
              id="flety-ruta"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': tone === 'dark' ? colors.accent : colors.ink, 'line-width': 5 }}
            />
          </GeoJSONSource>
        ) : null}
        {markers.map((m) => (
          <Marker key={m.id} id={m.id} lngLat={lngLat(m.position)} anchor="center" accessibilityLabel={m.label}>
            <View
              style={
                GIRA_CON_RUMBO.has(m.kind)
                  ? { transform: [{ rotate: `${m.kind === 'chofer' ? truckHeading : (m.heading ?? 0)}deg` }] }
                  : undefined
              }>
              <MarkerView kind={m.kind} />
            </View>
          </Marker>
        ))}
      </Map>
    </View>
  );
}

function MarkerView({ kind }: { kind: MapMarker['kind'] }) {
  switch (kind) {
    case 'user':
      return (
        <View style={styles.halo}>
          <View style={styles.dot} />
        </View>
      );
    case 'origen':
      return <View style={styles.origen} />;
    case 'destino':
      return <View style={styles.destino} />;
    case 'chofer':
      return <TruckSprite />;
    case 'flotaFlete':
      return <TruckSprite ancho={20} />;
    case 'flotaGrua':
      return <SvgXml xml={GRUA_3D_SVG} width={20} height={(20 * GRUA_SIZE.height) / GRUA_SIZE.width} />;
    case 'fletero':
      return (
        <View style={styles.fletero}>
          <IconoCamioneta size={17} color={colors.ink} strokeWidth={2.3} />
        </View>
      );
    case 'grua':
      return (
        <View style={styles.grua}>
          <IconoGrua size={18} color={colors.white} strokeWidth={2.2} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fletero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFC233',
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grua: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF6B1A',
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 194, 51, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    borderWidth: 4,
    borderColor: colors.white,
  },
  origen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 5,
    borderColor: colors.ink,
  },
  destino: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.ink,
  },
});
