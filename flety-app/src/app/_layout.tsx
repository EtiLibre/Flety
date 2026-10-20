import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  return <Stack screenOptions={{ headerShown: false }} />;
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
