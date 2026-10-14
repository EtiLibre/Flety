import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type AppMapProps = {
  center: LatLng;
  // Muestra el marcador "estás acá" solo si la ubicación es real (no el centro por defecto).
  showUserMarker: boolean;
  style?: StyleProp<ViewStyle>;
};

// Centro de Mendoza: ciudad de lanzamiento (sección 10.4 del doc).
export const MENDOZA: LatLng = { lat: -32.8895, lng: -68.8458 };
