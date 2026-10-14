import 'leaflet/dist/leaflet.css';
import './map.web.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { AttributionControl, CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';

import { colors } from '@/theme';

import type { AppMapProps, LatLng } from './types';

// react-native-maps no corre en web: acá usamos Leaflet + OpenStreetMap (sin API key).
// Cuando haya key de Google Maps se puede reemplazar este archivo.

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [map, center.lat, center.lng]);
  return null;
}

export function AppMap({ center, showUserMarker, style }: AppMapProps) {
  const position: [number, number] = [center.lat, center.lng];

  return (
    <View style={style}>
      <MapContainer
        center={position}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="flety-tiles"
          maxZoom={19}
        />
        <AttributionControl position="topleft" prefix={false} />
        <Recenter center={center} />
        {showUserMarker ? (
          <>
            <CircleMarker
              center={position}
              radius={30}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: colors.accent, fillOpacity: 0.3 }}
            />
            <CircleMarker
              center={position}
              radius={10}
              interactive={false}
              pathOptions={{ color: colors.white, weight: 4, fillColor: colors.ink, fillOpacity: 1 }}
            />
          </>
        ) : null}
      </MapContainer>
    </View>
  );
}
