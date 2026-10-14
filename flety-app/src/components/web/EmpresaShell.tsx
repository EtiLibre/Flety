import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Clock, LayoutGrid, LogOut, Package, ShieldCheck, Truck, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsWide } from '@/hooks/use-is-wide';
import { useAuth } from '@/lib/auth';
import type { Empresa } from '@/lib/empresa';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

export type SeccionEmpresa = 'panel' | 'pedidos' | 'choferes';

const SECCIONES: { id: SeccionEmpresa; label: string; href: '/empresa/panel' | '/empresa/pedidos' | '/empresa/choferes'; Icon: typeof Package }[] = [
  { id: 'panel', label: 'Panel', href: '/empresa/panel', Icon: LayoutGrid },
  { id: 'pedidos', label: 'Pedidos', href: '/empresa/pedidos', Icon: Package },
  { id: 'choferes', label: 'Choferes', href: '/empresa/choferes', Icon: Users },
];

export const PANEL_BG = '#F4F5F7';
export const CARD_BORDER = '#E3E6EA';

// Layout del panel de empresas (canvas "Empresa · panel web"): barra lateral
// oscura en desktop; en el celular, barra superior + pestañas.
export function EmpresaShell({
  active,
  empresa,
  title,
  subtitle,
  actions,
  children,
}: {
  active: SeccionEmpresa;
  empresa: Empresa | null;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isWide = useIsWide();

  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, !isWide && styles.titleNarrow]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions}
    </View>
  );

  if (isWide) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.sidebar} role="navigation" aria-label="Principal">
          <Marca />
          <View style={styles.nav}>
            {SECCIONES.map(({ id, label, href, Icon }) => {
              const current = id === active;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="link"
                  aria-current={current ? 'page' : undefined}
                  onPress={() => router.navigate(href)}
                  style={({ hovered }: { hovered?: boolean }) => [
                      styles.navItem,
                      (current || hovered) && styles.navItemActive,
                    ]}>
                    <Icon size={20} color={current ? colors.white : '#C5CBD3'} strokeWidth={2} />
                    <Text style={[styles.navText, current && styles.navTextActive]}>{label}</Text>
                  </Pressable>
              );
            })}
          </View>
          <View style={styles.sidebarFooter}>
            <EmpresaCard empresa={empresa} />
            <Salir />
          </View>
        </View>
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          {header}
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screenNarrow} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Marca />
        <Salir compact />
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {SECCIONES.map(({ id, label, href }) => {
          const current = id === active;
          return (
            <Link key={id} href={href} style={[styles.tab, current && styles.tabActive]} aria-current={current ? 'page' : undefined}>
              {label}
            </Link>
          );
        })}
      </View>
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContentNarrow}>
        <EmpresaCard empresa={empresa} light />
        {header}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Marca() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Truck size={20} color={colors.ink} strokeWidth={2} />
      </View>
      <Text style={styles.brandWord}>flety</Text>
      <Text style={styles.brandBadge}>Empresas</Text>
    </View>
  );
}

function EmpresaCard({ empresa, light }: { empresa: Empresa | null; light?: boolean }) {
  const { role } = useAuth();
  if (role === 'superadmin' || role === 'contabilidad') {
    return (
      <View style={[styles.empresaCard, light && styles.empresaCardLight]}>
        <Text style={[styles.empresaEstado, { color: light ? colors.ink : '#FFC233' }]}>
          {role === 'superadmin' ? 'Administración Flety' : 'Contabilidad Flety'}
        </Text>
        <Text style={[styles.empresaNombre, light && { color: colors.ink }]}>Ves los pedidos de todas las empresas</Text>
      </View>
    );
  }
  if (!empresa) {
    // En celular solo se muestra cuando hay algo que avisar.
    return light ? null : (
      <View style={styles.empresaCard}>
        <Text style={styles.empresaNombre}>Tu usuario todavía no está asociado a una empresa.</Text>
      </View>
    );
  }
  const aprobada = empresa.estado_aprobacion === 'aprobada';
  if (light && aprobada) return null;
  const color = aprobada ? '#6FD6A3' : light ? '#7A4F00' : '#FFC233';
  return (
    <View style={[styles.empresaCard, light && styles.empresaCardWarn]}>
      <View style={styles.empresaEstadoRow}>
        {aprobada ? <ShieldCheck size={14} color={color} strokeWidth={2.2} /> : <Clock size={14} color={color} strokeWidth={2.2} />}
        <Text style={[styles.empresaEstado, { color }]}>
          {aprobada ? 'Empresa verificada' : empresa.estado_aprobacion === 'rechazada' ? 'Empresa no aprobada' : 'Esperando aprobación'}
        </Text>
      </View>
      <Text style={[styles.empresaNombre, light && { color: colors.ink }]}>{empresa.nombre}</Text>
      {!aprobada ? (
        <Text style={[styles.empresaAviso, light && { color: '#7A4F00' }]}>
          Cuando Flety apruebe tu empresa vas a ver la cola de pedidos.
        </Text>
      ) : null}
    </View>
  );
}

function Salir({ compact }: { compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      onPress={() => supabase.auth.signOut()}
      style={({ pressed }) => [styles.salir, compact && styles.salirCompact, pressed && { opacity: 0.7 }]}>
      <LogOut size={18} color="#C5CBD3" strokeWidth={2} />
      {compact ? null : <Text style={styles.salirText}>Cerrar sesión</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: PANEL_BG },
  screenNarrow: { flex: 1, backgroundColor: colors.ink },
  sidebar: { width: 248, backgroundColor: colors.ink, paddingVertical: 24, paddingHorizontal: 16, gap: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  brandMark: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandWord: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.white },
  brandBadge: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#A9B0BA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#232A34',
    overflow: 'hidden',
  },
  nav: { gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 12 },
  navItemActive: { backgroundColor: '#232A34' },
  navText: { fontFamily: fonts.medium, fontSize: 15, color: '#C5CBD3' },
  navTextActive: { fontFamily: fonts.semibold, color: colors.white },
  sidebarFooter: { marginTop: 'auto', gap: 12 },
  empresaCard: { gap: 6, padding: 14, borderRadius: 16, backgroundColor: '#1B2129', borderWidth: 1, borderColor: '#2A313B' },
  empresaCardLight: { backgroundColor: colors.white, borderColor: CARD_BORDER },
  empresaCardWarn: { backgroundColor: '#FFF3D6', borderColor: '#FFE3A3' },
  empresaEstadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empresaEstado: { fontFamily: fonts.bold, fontSize: 12 },
  empresaNombre: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  empresaAviso: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: '#A9B0BA' },
  salir: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  salirCompact: { padding: 10 },
  salirText: { fontFamily: fonts.medium, fontSize: 14, color: '#C5CBD3' },
  main: { flex: 1, backgroundColor: PANEL_BG },
  mainContent: { padding: 32, gap: 24, maxWidth: 1280, width: '100%' },
  mainContentNarrow: { padding: 16, gap: 18, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  tabs: { flexDirection: 'row', backgroundColor: colors.ink, paddingHorizontal: 16, gap: 22 },
  tab: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#A9B0BA',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { fontFamily: fonts.bold, color: colors.white, borderBottomColor: colors.accent },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  headerText: { gap: 4, flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: colors.ink },
  titleNarrow: { fontSize: 26 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
});
