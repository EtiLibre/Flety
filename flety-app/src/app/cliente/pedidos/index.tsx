import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { AppMap } from '@/components/map/AppMap';
import { PedidosList } from '@/components/pedido/PedidosList';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { TERMINAL_ESTADOS } from '@/lib/state-machine';
import { colors, fonts } from '@/theme';

export default function MisPedidos() {
  const isWide = useIsWide();
  const location = useCurrentLocation();
  const { pedidos, loading } = useMisPedidos();
  const activos = pedidos.filter((p) => !TERMINAL_ESTADOS.includes(p.estado));
  const historial = pedidos.filter((p) => TERMINAL_ESTADOS.includes(p.estado));

  const contenido = loading ? (
    <ActivityIndicator color={colors.ink} />
  ) : (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activos</Text>
        <PedidosList pedidos={activos} emptyText="No tenés pedidos activos." />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial</Text>
        <PedidosList pedidos={historial} emptyText="Todavía no terminaste ningún pedido." />
      </View>
    </>
  );

  if (isWide) {
    return (
      <ClienteShell
        active="pedidos"
        panel={
          <>
            <Text style={styles.title} accessibilityRole="header">
              Mis pedidos
            </Text>
            {contenido}
          </>
        }
        map={
          <AppMap
            center={location.position}
            markers={location.status === 'located' ? [{ id: 'yo', kind: 'user', position: location.position }] : []}
            style={StyleSheet.absoluteFill}
          />
        }
      />
    );
  }

  return (
    <FormScreen
      illustration={false}
      title="Mis pedidos"
      footer={<Button title="Pedir un servicio" onPress={() => router.push('/cliente/nuevo-pedido')} />}>
      {contenido}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
});
