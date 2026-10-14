import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { colors } from '@/theme';

import type { AppMapProps } from './types';

const DELTA = 0.012;

export function AppMap({ center, showUserMarker, style }: AppMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { latitude: center.lat, longitude: center.lng, latitudeDelta: DELTA, longitudeDelta: DELTA },
      400
    );
  }, [center.lat, center.lng]);

  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      showsPointsOfInterests={false}
      toolbarEnabled={false}>
      {showUserMarker ? (
        <Marker
          coordinate={{ latitude: center.lat, longitude: center.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          accessibilityLabel="Tu ubicación">
          <View style={styles.halo}>
            <View style={styles.dot} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
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
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    borderWidth: 4,
    borderColor: colors.white,
  },
});
