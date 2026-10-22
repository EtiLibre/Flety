import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VolverAlAdmin } from '@/components/VolverAlAdmin';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PedidoDraftProvider } from '@/lib/pedido-draft';
import { registrarVisita } from '@/lib/visitas';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { initializing } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  const ready = (fontsLoaded || !!fontError) && !initializing;
  const pathname = usePathname();

  // Estadísticas de uso (anónimas) para el panel de marketing.
  useEffect(() => {
    if (ready) registrarVisita(pathname);
  }, [ready, pathname]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    // La barra del superadmin va arriba, en el flujo: empuja la app y no tapa nada.
    <View style={{ flex: 1 }}>
      <VolverAlAdmin />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* El borrador del pedido vive arriba de todo (la landing puede preelegir el tipo de servicio). */}
        <PedidoDraftProvider>
          <RootStack />
        </PedidoDraftProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Si una pantalla falla, en vez de quedar en blanco se ve esto (expo-router lo
// usa para cualquier error de render de las rutas).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 14,
        backgroundColor: '#F5F5F2',
      }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#12161C', textAlign: 'center' }}>Algo salió mal</Text>
      <Text style={{ fontSize: 15, color: '#5B6470', textAlign: 'center', maxWidth: 420 }}>
        Esta pantalla tuvo un problema. Probá de nuevo; si sigue pasando, avisanos.
      </Text>
      {__DEV__ ? <Text style={{ fontSize: 12, color: '#B42318', textAlign: 'center' }}>{error.message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{
          height: 50,
          paddingHorizontal: 28,
          borderRadius: 14,
          backgroundColor: '#FFC233',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#12161C' }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
