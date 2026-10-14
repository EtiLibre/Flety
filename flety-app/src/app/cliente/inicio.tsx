import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogOut, Package, Route, Search, Truck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { AppMap } from '@/components/map/AppMap';
import { Sheet } from '@/components/Sheet';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, shadow } from '@/theme';

const SERVICIOS = [
  { tipo: 'flete', titulo: 'Flete', detalle: 'Pocas cosas', Icon: Truck },
  { tipo: 'mudanza', titulo: 'Mudanza', detalle: 'Casa o depto', Icon: Package },
  { tipo: 'larga_distancia', titulo: 'Larga distancia', detalle: 'Entre ciudades', Icon: Route },
] as const;

export default function InicioCliente() {
  const insets = useSafeAreaInsets();
  const { nombre } = useAuth();
  const location = useCurrentLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = nombre?.split(' ')[0];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <AppMap
        center={location.position}
        showUserMarker={location.status === 'located'}
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
                onPress={() => supabase.auth.signOut()}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
                <LogOut size={18} color={colors.danger} strokeWidth={2} />
                <Text style={styles.menuItemText}>Cerrar sesión</Text>
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
            onPress={() => router.push('/cliente/nuevo-pedido')}
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
                  onPress={() => router.push({ pathname: '/cliente/nuevo-pedido', params: { tipo } })}
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
            <Text style={styles.locationNote}>
              Activá la ubicación para ver dónde estás. Por ahora te mostramos Mendoza.
            </Text>
          ) : null}
        </Sheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mapLand },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  profileArea: { alignItems: 'flex-end', gap: 8 },
  menu: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 6,
    minWidth: 180,
    ...shadow.floating,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 44 },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
  sheetArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sheet: { width: '100%', maxWidth: 560 },
  titles: { gap: 2 },
  greeting: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, color: colors.ink },
  search: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  searchText: { fontFamily: fonts.medium, fontSize: 17, color: colors.muted },
  services: { flexDirection: 'row', gap: 10 },
  service: {
    flex: 1,
    height: 104,
    borderRadius: radius.xl,
    padding: 14,
    justifyContent: 'space-between',
  },
  serviceText: { gap: 2 },
  serviceTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  serviceDetail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  locationNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
