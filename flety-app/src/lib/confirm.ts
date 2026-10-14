import { Alert, Platform } from 'react-native';

// Confirmación simple que funciona en web (window.confirm) y en iOS/Android (Alert).
export function confirmar(message: string, confirmLabel = 'Sí'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Confirmar', message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function avisar(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Flety', message);
  }
}
