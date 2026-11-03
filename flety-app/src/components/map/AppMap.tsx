import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SvgXml } from 'react-native-svg';

import { metrosEntre, rumbo } from '@/lib/geo';
import { IconoCamioneta } from '@/plataforma/estilo';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors } from '@/theme';

import { GOOGLE_MAP_STYLE, GOOGLE_MAP_STYLE_DARK } from './flety-style';
import { GRUA_3D_SVG, GRUA_SIZE } from './grua-sprite';
import { TruckSprite } from './TruckSprite';
import { GIRA_CON_RUMBO, type AppMapProps, type LatLng, type MapMarker } from './types';

const DELTA = 0.012;

// Android sin clave de Google Maps (ver app.config.js): en vez de cerrarse la
// app, se muestra un aviso donde iría el mapa.
const SIN_MAPA = Platform.OS === 'android' && !Constants.expoConfig?.extra?.mapasAndroid;

export function AppMap(props: AppMapProps) {
  if (SIN_MAPA) {
    const oscuro = props.tone === 'dark';
    return (
      <View style={[props.style, styles.sinMapa, oscuro && { backgroundColor: '#1A1F26' }]}>
        <Text style={[styles.sinMapaTexto, oscuro && { color: colors.dark.muted }]}>
          Mapa no disponible en esta versión
        </Text>
      </View>
    );
  }
  return <MapaNativo {...props} />;
}

function MapaNativo({
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
  // Mismo encuadre que el zoom de MapLibre en web (cada nivel duplica la escala).
  const delta = DELTA * Math.pow(2, 14 - initialZoom);
  const mapRef = useRef<MapView>(null);

  // Última posición/rumbo del chofer, para girar el camión hacia donde va
  // (patrón de React "guardar info del render anterior").
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

  const fitKey = markers
    .filter((m) => !m.id.startsWith('amb-'))
    .map((m) => (GIRA_CON_RUMBO.has(m.kind) ? m.id : `${m.id}:${m.position.lat},${m.position.lng}`))
    .join('|');

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Los vehículos de ambiente (amb-*) no cuentan para el encuadre.
    const aEncuadrar = markers.filter((m) => !m.id.startsWith('amb-'));
    if (fitToMarkers && aEncuadrar.length > 1) {
      map.fitToCoordinates(
        aEncuadrar.map((m) => ({ latitude: m.position.lat, longitude: m.position.lng })),
        { edgePadding: padding ?? { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
      );
    } else {
      map.animateToRegion(
        { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta },
        400
      );
    }
    // fitKey resume los puntos que importan para el encuadre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, fitKey, fitToMarkers]);

  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta }}
      onRegionChange={onMoveStart ? () => onMoveStart() : undefined}
      onRegionChangeComplete={(r) => onCenterChange?.({ lat: r.latitude, lng: r.longitude })}
      // Paleta Flety en Google Maps (Android); en iPhone (Apple Maps) se usa la variante atenuada.
      customMapStyle={tone === 'dark' ? GOOGLE_MAP_STYLE_DARK : GOOGLE_MAP_STYLE}
      userInterfaceStyle={tone}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      showsPointsOfInterests={false}
      scrollEnabled={!estatico}
      zoomEnabled={!estatico}
      pitchEnabled={!estatico}
      rotateEnabled={false}
      toolbarEnabled={false}>
      {line && line.length > 1 ? (
        <Polyline
          coordinates={line.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          strokeColor={tone === 'dark' ? colors.accent : colors.ink}
          strokeWidth={5}
        />
      ) : null}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.position.lat, longitude: marker.position.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          // El camión "apoya" sobre el mapa y gira con el rumbo del chofer.
          flat={GIRA_CON_RUMBO.has(marker.kind)}
          rotation={marker.kind === 'chofer' ? truckHeading : (marker.heading ?? 0)}
          tracksViewChanges={false}
          accessibilityLabel={marker.label}>
          <MarkerView kind={marker.kind} />
        </Marker>
      ))}
    </MapView>
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
  sinMapa: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9ECEF' },
  sinMapaTexto: { fontSize: 13, color: '#5B6470' },
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
