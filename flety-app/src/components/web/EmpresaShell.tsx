import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Building2,
  ChartBar,
  ChevronRight,
  Clock,
  Eye,
  Headset,
  LayoutGrid,
  LifeBuoy,
  Megaphone,
  Menu,
  Wallet,
  LogOut,
  Package,
  ShieldCheck,
  Tag,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferior, type TabItem } from '@/components/nav/BarraInferior';

import { useIsWide } from '@/hooks/use-is-wide';
import { useNavEmpresa } from '@/hooks/use-nav-empresa';
import { useAuth } from '@/lib/auth';
import type { Empresa } from '@/lib/empresa';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

export type SeccionEmpresa =
  | 'panel'
  | 'pedidos'
  | 'choferes'
  | 'tarifas'
  | 'empresas'
  | 'contabilidad'
  | 'marketing'
  | 'anuncios'
  | 'soporte'
  | 'ayuda'
  | 'cuenta';

const SECCIONES: {
  id: SeccionEmpresa;
  label: string;
  Icon: typeof Package;
  // Solo para estos roles (si no se indica, para todos los del panel).
  roles?: string[];
  // Ayuda y Mi cuenta: abajo del todo en la barra lateral y en "Más".
  extra?: boolean;
}[] = [
  { id: 'panel', label: 'Panel', Icon: LayoutGrid, roles: ['empresa', 'superadmin'] },
  { id: 'pedidos', label: 'Fletes', Icon: Package, roles: ['empresa', 'superadmin', 'contabilidad'] },
  { id: 'choferes', label: 'Choferes', Icon: Users, roles: ['empresa', 'superadmin'] },
  { id: 'tarifas', label: 'Tarifas', Icon: Tag, roles: ['empresa'] },
  { id: 'empresas', label: 'Empresas', Icon: Building2, roles: ['superadmin'] },
  { id: 'contabilidad', label: 'Contabilidad', Icon: Wallet, roles: ['contabilidad', 'superadmin'] },
  { id: 'marketing', label: 'Marketing', Icon: ChartBar, roles: ['marketing', 'superadmin'] },
  { id: 'anuncios', label: 'Anuncios', Icon: Megaphone, roles: ['marketing', 'superadmin'] },
  { id: 'soporte', label: 'Soporte', Icon: Headset, roles: ['superadmin'] },
  { id: 'ayuda', label: 'Ayuda', Icon: LifeBuoy, extra: true },
  { id: 'cuenta', label: 'Mi cuenta', Icon: UserRound, extra: true },
];

export const PANEL_BG = '#F4F5F7';
export const CARD_BORDER = '#E3E6EA';

// Layout del panel de empresas (canvas "Empresa · panel web"): barra lateral
// oscura en desktop; en el celular, barra de abajo con las secciones
// principales y "Más" para el resto.
export function EmpresaShell({
  active,
  empresa,
  title,
  subtitle,
  actions,
  aviso,
  children,
}: {
  active: SeccionEmpresa;
  empresa: Empresa | null;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  // Aviso de error de carga (se muestra arriba del contenido).
  aviso?: string | null;
  children: React.ReactNode;
}) {
  const isWide = useIsWide();
  const { role } = useAuth();
  const nav = useNavEmpresa();
  const secciones = SECCIONES.filter((s) => !s.roles || (role && s.roles.includes(role)));
  const principales = secciones.filter((s) => !s.extra);
  const extras = secciones.filter((s) => s.extra);
  const [mas, setMas] = useState(false);

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
            {principales.map(({ id, label, Icon }) => {
              const current = id === active;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="link"
                  aria-current={current ? 'page' : undefined}
                  onPress={() => nav.ir(id)}
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
          {role === 'superadmin' ? <VerComo /> : null}
          <View style={styles.sidebarFooter}>
            <EmpresaCard empresa={empresa} />
            <View style={styles.nav}>
              {extras.map(({ id, label, Icon }) => {
                const current = id === active;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="link"
                    aria-current={current ? 'page' : undefined}
                    onPress={() => nav.ir(id)}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.navItemChico,
                      (current || hovered) && styles.navItemActive,
                    ]}>
                    <Icon size={18} color={current ? colors.white : '#C5CBD3'} strokeWidth={2} />
                    <Text style={[styles.navText, styles.navTextChico, current && styles.navTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
              <Salir />
            </View>
          </View>
        </View>
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          {header}
          {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
          {children}
        </ScrollView>
      </View>
    );
  }

  // Hasta 3 secciones en la barra; el resto, en "Más".
  const enBarra = principales.slice(0, 3);
  const enMas = [...principales.slice(3), ...extras];
  const tabs: TabItem<SeccionEmpresa | 'mas'>[] = [
    ...enBarra.map(({ id, label, Icon }) => ({ id, label, Icon })),
    { id: 'mas', label: 'Más', Icon: Menu },
  ];
  const tabActivo: SeccionEmpresa | 'mas' = mas || !enBarra.some((s) => s.id === active) ? 'mas' : active;

  return (
    <SafeAreaView style={styles.screenNarrow} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Marca />
      </View>
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContentNarrow}>
        <EmpresaCard empresa={empresa} light />
        {role === 'superadmin' && active === 'panel' ? <VerComo light /> : null}
        {header}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
        {children}
      </ScrollView>
      <BarraInferior
        items={tabs}
        activo={tabActivo}
        onIr={(id) => (id === 'mas' ? setMas(true) : nav.ir(id))}
        tema="claro"
      />
      <MenuMas
        abierto={mas}
        secciones={enMas}
        active={active}
        superadmin={role === 'superadmin'}
        onIr={(id) => {
          setMas(false);
          nav.ir(id);
        }}
        onClose={() => setMas(false)}
      />
    </SafeAreaView>
  );
}

// "Más" en el celular: el resto de las secciones, ayuda, cuenta y salir.
function MenuMas({
  abierto,
  secciones,
  active,
  superadmin,
  onIr,
  onClose,
}: {
  abierto: boolean;
  secciones: (typeof SECCIONES)[number][];
  active: SeccionEmpresa;
  superadmin: boolean;
  onIr: (id: SeccionEmpresa) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={abierto} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.masBackdrop} onPress={onClose} accessibilityLabel="Cerrar menú">
        <Pressable style={[styles.masSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.masHead}>
            <Text style={styles.masTitulo}>Más opciones</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.ink} />
            </Pressable>
          </View>
          {secciones.map(({ id, label, Icon }) => (
            <Pressable
              key={id}
              accessibilityRole="link"
              aria-current={id === active ? 'page' : undefined}
              onPress={() => onIr(id)}
              style={({ pressed }) => [styles.masItem, id === active && styles.masItemOn, pressed && { opacity: 0.8 }]}>
              <View style={styles.masIcono}>
                <Icon size={19} color={colors.ink} strokeWidth={2} />
              </View>
              <Text style={styles.masLabel}>{label}</Text>
              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          ))}
          {superadmin ? <VerComo light /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => supabase.auth.signOut()}
            style={({ pressed }) => [styles.masItem, pressed && { opacity: 0.8 }]}>
            <View style={[styles.masIcono, { backgroundColor: colors.dangerBg }]}>
              <LogOut size={19} color={colors.danger} strokeWidth={2} />
            </View>
            <Text style={[styles.masLabel, { color: colors.danger }]}>Cerrar sesión</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Superadmin: recorrer la app como la ve cada tipo de usuario.
const VISTAS: { label: string; detalle: string; href: Href }[] = [
  { label: 'Visitante', detalle: 'Página pública', href: { pathname: '/', params: { vista: 'publica' } } },
  { label: 'Cliente', detalle: 'Pedir y seguir fletes', href: '/cliente/inicio' },
  { label: 'Chofer', detalle: 'Demo con datos de ejemplo', href: '/preview-chofer' },
  { label: 'Empresa', detalle: 'Demo con datos de ejemplo', href: '/preview-empresa' },
];

function VerComo({ light }: { light?: boolean }) {
  return (
    <View style={[styles.verComo, light && styles.verComoLight]}>
      <View style={styles.verComoHead}>
        <Eye size={14} color={light ? colors.muted : '#A9B0BA'} strokeWidth={2.2} />
        <Text style={[styles.verComoTitulo, light && { color: colors.muted }]}>Ver la app como…</Text>
      </View>
      <View style={light ? styles.verComoChips : styles.verComoLista}>
        {VISTAS.map((v) => (
          <Pressable
            key={v.label}
            accessibilityRole="link"
            accessibilityLabel={`Ver la app como ${v.label.toLowerCase()}: ${v.detalle}`}
            onPress={() => router.push(v.href)}
            style={({ hovered }: { hovered?: boolean }) => [
              light ? styles.verComoChip : styles.verComoItem,
              hovered && (light ? { backgroundColor: colors.surface } : { backgroundColor: '#232A34' }),
            ]}>
            <Text style={[styles.verComoLabel, light && { color: colors.ink }]}>{v.label}</Text>
            {light ? null : <Text style={styles.verComoDetalle}>{v.detalle}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
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
  if (role === 'superadmin' || role === 'contabilidad' || role === 'marketing') {
    const equipo = {
      superadmin: 'Administración Flety',
      contabilidad: 'Contabilidad Flety',
      marketing: 'Marketing Flety',
    }[role];
    const detalle = {
      superadmin: 'Ves todas las empresas, pedidos y estadísticas',
      contabilidad: 'Comisiones y liquidaciones de todas las empresas',
      marketing: 'Estadísticas de uso y anuncios',
    }[role];
    return (
      <View style={[styles.empresaCard, light && styles.empresaCardLight]}>
        <Text style={[styles.empresaEstado, { color: light ? colors.ink : '#FFC233' }]}>{equipo}</Text>
        <Text style={[styles.empresaNombre, light && { color: colors.ink }]}>{detalle}</Text>
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
        {aprobada ? (
          <ShieldCheck size={14} color={color} strokeWidth={2.2} />
        ) : (
          <Clock size={14} color={color} strokeWidth={2.2} />
        )}
        <Text style={[styles.empresaEstado, { color }]}>
          {aprobada
            ? 'Empresa verificada'
            : empresa.estado_aprobacion === 'rechazada'
              ? 'Empresa no aprobada'
              : 'Esperando aprobación'}
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

function Salir() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      onPress={() => supabase.auth.signOut()}
      style={({ pressed }) => [styles.salir, pressed && { opacity: 0.7 }]}>
      <LogOut size={18} color="#C5CBD3" strokeWidth={2} />
      <Text style={styles.salirText}>Cerrar sesión</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: PANEL_BG },
  screenNarrow: { flex: 1, backgroundColor: colors.ink },
  sidebar: { width: 248, backgroundColor: colors.ink, paddingVertical: 24, paddingHorizontal: 16, gap: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  verComo: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#232A34' },
  verComoLight: {
    padding: 14,
    borderRadius: 16,
    borderTopWidth: 1,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: colors.white,
  },
  verComoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  verComoTitulo: { fontFamily: fonts.semibold, fontSize: 12, color: '#A9B0BA' },
  verComoLista: { gap: 2 },
  verComoItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  verComoLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  verComoDetalle: { fontFamily: fonts.regular, fontSize: 11, color: '#8B95A1' },
  verComoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  verComoChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  sidebarFooter: { marginTop: 'auto', gap: 12 },
  empresaCard: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1B2129',
    borderWidth: 1,
    borderColor: '#2A313B',
  },
  empresaCardLight: { backgroundColor: colors.white, borderColor: CARD_BORDER },
  empresaCardWarn: { backgroundColor: '#FFF3D6', borderColor: '#FFE3A3' },
  empresaEstadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empresaEstado: { fontFamily: fonts.bold, fontSize: 12 },
  empresaNombre: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  empresaAviso: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: '#A9B0BA' },
  salir: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  salirText: { fontFamily: fonts.medium, fontSize: 14, color: '#C5CBD3' },
  main: { flex: 1, backgroundColor: PANEL_BG },
  mainContent: { padding: 32, gap: 24, maxWidth: 1280, width: '100%' },
  mainContentNarrow: { padding: 16, gap: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navItemChico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navTextChico: { fontSize: 14 },
  masBackdrop: { flex: 1, backgroundColor: 'rgba(18,22,28,0.5)', justifyContent: 'flex-end' },
  masSheet: {
    gap: 4,
    padding: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  masHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  masTitulo: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  masItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  masItemOn: { backgroundColor: colors.surface },
  masIcono: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  aviso: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    padding: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  headerText: { gap: 4, flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: colors.ink },
  titleNarrow: { fontSize: 26 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
});
