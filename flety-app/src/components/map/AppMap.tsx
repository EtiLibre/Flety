import { Truck } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors } from '@/theme';

import { GOOGLE_MAP_STYLE } from './flety-style';
import type { AppMapProps, MapMarker } from './types';

const DELTA = 0.012;

export function AppMap({ center, markers = [], line, fitToMarkers, padding, style }: AppMapProps) {
  const mapRef = useRef<MapView>(null);
  const markersKey = markers.map((m) => `${m.id}:${m.position.lat},${m.position.lng}`).join('|');

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
    // markersKey resume los marcadores para no reencuadrar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, markersKey, fitToMarkers]);

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
      return (
        <View style={styles.choferHalo}>
          <View style={styles.chofer}>
            <Truck size={18} color={colors.accent} strokeWidth={2.2} />
          </View>
        </View>
      );
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
  choferHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 194, 51, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chofer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
