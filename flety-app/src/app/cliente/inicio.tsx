import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ListOrdered, LogOut, Package, Route, Search, Truck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { PedidoForm } from '@/components/pedido/PedidoForm';
import { PedidosList } from '@/components/pedido/PedidosList';
import { Sheet } from '@/components/Sheet';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { useAuth } from '@/lib/auth';
import { usePedidoDraft } from '@/lib/pedido-draft';
import { TERMINAL_ESTADOS } from '@/lib/state-machine';
import { supabase } from '@/lib/supabase';
import type { TipoServicio } from '@/lib/types';
import { colors, fonts, radius, shadow } from '@/theme';

const SERVICIOS = [
  { tipo: 'flete', titulo: 'Flete', detalle: 'Pocas cosas', Icon: Truck },
  { tipo: 'mudanza', titulo: 'Mudanza', detalle: 'Casa o depto', Icon: Package },
  { tipo: 'larga_distancia', titulo: 'Larga distancia', detalle: 'Entre ciudades', Icon: Route },
] as const;

export default function InicioCliente() {
  const isWide = useIsWide();
  return isWide ? <InicioDesktop /> : <InicioMovil />;
}

function useMapMarkers() {
  const location = useCurrentLocation();
  const { draft } = usePedidoDraft();
  const markers: MapMarker[] = [];
  if (location.status === 'located') markers.push({ id: 'yo', kind: 'user', position: location.position, label: 'Tu ubicación' });
  if (draft.origen) markers.push({ id: 'origen', kind: 'origen', position: draft.origen, label: 'Retiro' });
  if (draft.destino) markers.push({ id: 'destino', kind: 'destino', position: draft.destino, label: 'Entrega' });
  const line = draft.origen && draft.destino ? [draft.origen, draft.destino] : undefined;
  return { location, markers, line };
}

function InicioDesktop() {
  const { markers, line, location } = useMapMarkers();
  const { pedidos } = useMisPedidos();
  const activos = pedidos.filter((p) => !TERMINAL_ESTADOS.includes(p.estado));

  return (
    <ClienteShell
      active="pedir"
      panel={
        <>
          <Text style={styles.desktopTitle} accessibilityRole="header">
            ¿Qué movemos hoy?
          </Text>
          <PedidoForm onContinue={() => router.push('/cliente/opciones')} />
          <View style={styles.activos}>
            <Text style={styles.activosTitle}>Pedidos activos</Text>
            <PedidosList pedidos={activos} emptyText="No tenés pedidos activos." />
          </View>
        </>
      }
      map={
        <AppMap
          center={location.position}
          markers={markers}
          line={line}
          fitToMarkers={!!line}
          style={StyleSheet.absoluteFill}
        />
      }
    />
  );
}

function InicioMovil() {
  const insets = useSafeAreaInsets();
  const { nombre } = useAuth();
  const { update } = usePedidoDraft();
  const { markers, location } = useMapMarkers();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstName = nombre?.split(' ')[0];

  function pedir(tipo?: TipoServicio) {
    if (tipo) update({ tipo });
    router.push('/cliente/nuevo-pedido');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <AppMap
        center={location.position}
        markers={markers.filter((m) => m.kind === 'user')}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <View />
        <View style={styles.profileArea}>
          <IconButton label="Perfil" onPress={() => setMenuOpen((open) => !open)}>
            <User size={22} color={colors.ink} strokeWidth={2} />
          </IconButton>
          {menuOpen ? (
            <View style={styles.menu}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/cliente/pedidos');
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
                <ListOrdered size={18} color={colors.ink} strokeWidth={2} />
                <Text style={styles.menuItemText}>Mis pedidos</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => supabase.auth.signOut()}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
                <LogOut size={18} color={colors.danger} strokeWidth={2} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Cerrar sesión</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sheetArea} pointerEvents="box-none">
        <Sheet style={styles.sheet}>
          <View style={styles.titles}>
            {firstName ? <Text style={styles.greeting}>Hola, {firstName}</Text> : null}
            <Text style={styles.title} accessibilityRole="header">
              ¿Qué movemos hoy?
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir destino"
            onPress={() => pedir()}
            style={({ pressed }) => [styles.search, pressed && { opacity: 0.8 }]}>
            <Search size={22} color={colors.ink} strokeWidth={2} />
            <Text style={styles.searchText}>¿A dónde lo llevamos?</Text>
          </Pressable>

          <View style={styles.services}>
            {SERVICIOS.map(({ tipo, titulo, detalle, Icon }, index) => {
              const highlighted = index === 0;
              return (
                <Pressable
                  key={tipo}
                  accessibilityRole="button"
                  accessibilityLabel={`${titulo}: ${detalle}`}
                  onPress={() => pedir(tipo)}
                  style={({ pressed }) => [
                    styles.service,
                    { backgroundColor: highlighted ? colors.accent : colors.surface },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Icon size={28} color={colors.ink} strokeWidth={2} />
                  <View style={styles.serviceText}>
                    <Text style={styles.serviceTitle}>{titulo}</Text>
                    <Text style={[styles.serviceDetail, highlighted && { color: '#3A3F45' }]}>{detalle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {location.status === 'denied' ? (
            <Text style={styles.locationNote}>Activá la ubicación para ver dónde estás. Por ahora te mostramos Mendoza.</Text>
          ) : null}
        </Sheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopTitle: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  activos: { gap: 10, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  activosTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  screen: { flex: 1, backgroundColor: colors.mapLand },
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 1000 },
  profileArea: { alignItems: 'flex-end', gap: 8 },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 6, minWidth: 190, ...shadow.floating },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 44 },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  sheetArea: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', zIndex: 1000 },
  sheet: { width: '100%', maxWidth: 560 },
  titles: { gap: 2 },
  greeting: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, color: colors.ink },
  search: { height: 56, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  searchText: { fontFamily: fonts.medium, fontSize: 17, color: colors.muted },
  services: { flexDirection: 'row', gap: 10 },
  service: { flex: 1, height: 104, borderRadius: radius.xl, padding: 14, justifyContent: 'space-between' },
  serviceText: { gap: 2 },
  serviceTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  serviceDetail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  locationNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
