import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { MENDOZA, type LatLng } from '@/components/map/types';

type State =
  | { status: 'loading'; position: LatLng }
  | { status: 'located'; position: LatLng }
  | { status: 'denied' | 'error'; position: LatLng };

// Ubicación actual del dispositivo (en web usa la geolocalización del navegador).
// Mientras tanto, o si se deniega el permiso, devuelve el centro de Mendoza.
export function useCurrentLocation(): State {
  const [state, setState] = useState<State>({ status: 'loading', position: MENDOZA });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setState({ status: 'denied', position: MENDOZA });
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setState({
            status: 'located',
            position: { lat: current.coords.latitude, lng: current.coords.longitude },
          });
        }
      } catch {
        if (!cancelled) setState({ status: 'error', position: MENDOZA });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
