import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { PedidoForm } from '@/components/pedido/PedidoForm';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { usePedidoDraft } from '@/lib/pedido-draft';
import { ROLE_HOME } from '@/lib/types';
import { colors, fonts } from '@/theme';

// "Pedir un flete" sin cuenta: se arma el pedido y la cuenta se pide recién al
// ver vehículos y precios. El borrador queda guardado (lib/pedido-draft) y se
// retoma en /cliente/opciones después de registrarse o iniciar sesión.
export default function Pedir() {
  const isWide = useIsWide();
  const { session, role } = useAuth();
  const { draft } = usePedidoDraft();
  const { ruta } = useRuta([draft.origen, draft.destino]);

  if (session && role) return <Redirect href={role === 'cliente' ? '/cliente/inicio' : ROLE_HOME[role]} />;

  const markers: MapMarker[] = [];
  if (draft.origen) markers.push({ id: 'origen', kind: 'origen', position: draft.origen, label: 'Retiro' });
  if (draft.destino) markers.push({ id: 'destino', kind: 'destino', position: draft.destino, label: 'Entrega' });

  const map = (
    <AppMap
      center={draft.origen ?? draft.destino ?? MENDOZA}
      markers={markers}
      line={ruta?.coords}
      fitToMarkers={markers.length > 0}
      style={StyleSheet.absoluteFill}
    />
  );

  const panel = (
    <>
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">
          ¿Qué movemos hoy?
        </Text>
        <Text style={styles.subtitle}>Armá tu pedido. Te pedimos la cuenta recién al ver vehículos y precios.</Text>
      </View>
      <PedidoForm onContinue={() => router.push({ pathname: '/registro', params: { next: '/cliente/opciones' } })} />
    </>
  );

  if (isWide) return <ClienteShell active="pedir" panel={panel} map={map} />;
  return (
    <MobileMapLayout
      map={map}
      mapHeight={260}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {panel}
    </MobileMapLayout>
  );
}

const styles = StyleSheet.create({
  titles: { gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
});
