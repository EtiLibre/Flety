import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { metrosEntre, rumbo } from '@/lib/geo';
import { colors } from '@/theme';

import { GOOGLE_MAP_STYLE } from './flety-style';
import { TruckSprite } from './TruckSprite';
import type { AppMapProps, LatLng, MapMarker } from './types';

const DELTA = 0.012;

export function AppMap({ center, markers = [], line, fitToMarkers, padding, style }: AppMapProps) {
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
    const heading = chofer.heading ?? (moved && truck.position ? rumbo(truck.position, chofer.position) : truck.heading);
    setTruck({ key: choferKey, position: chofer.position, heading });
  }
  const truckHeading = chofer?.heading ?? truck.heading;

  const fitKey = markers.map((m) => (m.kind === 'chofer' ? 'chofer' : `${m.id}:${m.position.lat},${m.position.lng}`)).join('|');

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (fitToMarkers && markers.length > 1) {
      map.fitToCoordinates(
        markers.map((m) => ({ latitude: m.position.lat, longitude: m.position.lng })),
        { edgePadding: padding ?? { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
      );
    } else {
      map.animateToRegion(
        { latitude: center.lat, longitude: center.lng, latitudeDelta: DELTA, longitudeDelta: DELTA },
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
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      // Paleta Flety en Google Maps (Android); en iPhone (Apple Maps) se usa la variante atenuada.
      customMapStyle={GOOGLE_MAP_STYLE}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      showsPointsOfInterests={false}
      toolbarEnabled={false}>
      {line && line.length > 1 ? (
        <Polyline
          coordinates={line.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          strokeColor={colors.ink}
          strokeWidth={5}
        />
      ) : null}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.position.lat, longitude: marker.position.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          // El camión "apoya" sobre el mapa y gira con el rumbo del chofer.
          flat={marker.kind === 'chofer'}
          rotation={marker.kind === 'chofer' ? truckHeading : 0}
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
  }
}

const styles = StyleSheet.create({
  halo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 194, 51, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, borderWidth: 4, borderColor: colors.white },
  origen: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, borderWidth: 5, borderColor: colors.ink },
  destino: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 4, borderColor: colors.ink },
});
