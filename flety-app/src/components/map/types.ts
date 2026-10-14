import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type MapMarkerKind = 'user' | 'origen' | 'destino' | 'chofer';

export type MapMarker = {
  id: string;
  position: LatLng;
  kind: MapMarkerKind;
  label?: string;
  // Rumbo en grados (solo chofer). Si falta, se calcula a partir del movimiento.
  heading?: number;
};

export type AppMapProps = {
  center: LatLng;
  markers?: MapMarker[];
  // Recorrido a dibujar (por ahora, tramos rectos entre puntos).
  line?: LatLng[];
  // Con 2+ marcadores, encuadra el mapa para que entren todos.
  fitToMarkers?: boolean;
  // Margen extra (px) para no tapar marcadores con paneles superpuestos.
  padding?: { top: number; right: number; bottom: number; left: number };
  style?: StyleProp<ViewStyle>;
};

// Centro de Mendoza: ciudad de lanzamiento (sección 10.4 del doc).
export const MENDOZA: LatLng = { lat: -32.8895, lng: -68.8458 };
