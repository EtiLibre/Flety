import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LayoutGrid, LogOut, Tag, UserRound, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraInferior, type TabItem } from '@/components/nav/BarraInferior';
import { useIsWide } from '@/hooks/use-is-wide';
import { supabase } from '@/lib/supabase';
import type { Empresa } from '@/modulos/gruas/tipos';
import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors, fonts } from '@/theme';

// Layout del panel de la EMPRESA DE GRÚAS. Mismo armado que el panel de
// empresas de Mudanzas (barra lateral oscura en la compu, barra de abajo en el
// celular) pero independiente: sus propias secciones, datos y marca.

export type SeccionGruas = 'panel' | 'servicios' | 'gruistas' | 'tarifas' | 'cuenta';

const SECCIONES: TabItem<SeccionGruas>[] = [
  { id: 'panel', label: 'Panel', Icon: LayoutGrid },
  { id: 'servicios', label: 'Servicios', Icon: IconoGrua },
  { id: 'gruistas', label: 'Gruistas', Icon: Users },
  { id: 'tarifas', label: 'Tarifas', Icon: Tag },
  { id: 'cuenta', label: 'Mi cuenta', Icon: UserRound },
];

const RUTAS = {
  panel: '/empresa-gruas',
  servicios: '/empresa-gruas/servicios',
  gruistas: '/empresa-gruas/gruistas',
  tarifas: '/empresa-gruas/tarifas',
  cuenta: '/empresa-gruas/cuenta',
} as const;

export const PANEL_GRUAS_BG = '#F6F4F2';

export function EmpresaGruasShell({
  active,
  empresa,
  demo,
  title,
  subtitle,
  actions,
  aviso,
  children,
}: {
  active: SeccionGruas;
  empresa: Empresa | null;
  demo?: boolean;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  aviso?: string | null;
  children: React.ReactNode;
}) {
  const isWide = useIsWide();
  const ir = (s: SeccionGruas) => router.navigate(RUTAS[s] as never);

  const header = (
    <View style={styles.header}>
      <View style={{ gap: 4, flexShrink: 1 }}>
        <Text style={[styles.title, !isWide && { fontSize: 26 }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions}
    </View>
  );
  const avisoDemo = demo ? (
    <View style={styles.demo}>
      <Text style={styles.demoTitulo}>Vista de ejemplo (solo la ves vos)</Text>
      <Text style={styles.demoTexto}>
        Así ve el panel una empresa de grúas. Los datos son de ejemplo y los cambios no se guardan.
      </Text>
    </View>
  ) : null;

  if (isWide) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.sidebarWrap} role="navigation" aria-label="Principal">
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sidebar} showsVerticalScrollIndicator={false}>
            <Marca />
            <View style={styles.nav}>
              {SECCIONES.filter((s) => s.id !== 'cuenta').map(({ id, label, Icon }) => {
                const current = id === active;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="link"
                    aria-current={current ? 'page' : undefined}
                    onPress={() => ir(id)}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.navItem,
                      (current || hovered) && styles.navItemActive,
                      current && styles.navItemCurrent,
                    ]}>
                    <Icon size={20} color={current ? colors.white : '#C5CBD3'} strokeWidth={2} />
                    <Text style={[styles.navText, current && styles.navTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.sidebarFooter}>
              <EmpresaCard empresa={empresa} />
              <Pressable
                accessibilityRole="link"
                aria-current={active === 'cuenta' ? 'page' : undefined}
                onPress={() => ir('cuenta')}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.navItem,
                  (active === 'cuenta' || hovered) && styles.navItemActive,
                ]}>
                <UserRound size={18} color="#C5CBD3" strokeWidth={2} />
                <Text style={styles.navText}>Mi cuenta y ayuda</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => supabase.auth.signOut()}
                style={({ hovered }: { hovered?: boolean }) => [styles.navItem, hovered && styles.navItemActive]}>
                <LogOut size={18} color="#C5CBD3" strokeWidth={2} />
                <Text style={styles.navText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          {avisoDemo}
          {header}
          {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
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
      </View>
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContentNarrow}>
        {avisoDemo}
        <EmpresaCard empresa={empresa} light />
        {header}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
        {children}
      </ScrollView>
      <BarraInferior
        items={SECCIONES.map((s) => (s.id === 'cuenta' ? { ...s, label: 'Cuenta' } : s))}
        activo={active}
        onIr={ir}
        tema="claro"
        acento={{ degrade: 'fuego', icono: colors.white }}
      />
    </SafeAreaView>
  );
}

function Marca() {
  return (
    <View style={styles.brand}>
      <Degrade nombre="fuego" diagonal style={[styles.brandMark, { boxShadow: SOMBRAS.fuego }]}>
        <View style={{ zIndex: 1 }}>
          <IconoGrua size={20} color={colors.white} strokeWidth={2.2} />
        </View>
      </Degrade>
      <Text style={styles.brandWord}>flety</Text>
      <Text style={styles.brandBadge}>Grúas · Empresas</Text>
    </View>
  );
}

const ESTADO_EMPRESA: Record<Empresa['estado'], string> = {
  pendiente: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  suspendida: 'Suspendida',
};

function EmpresaCard({ empresa, light }: { empresa: Empresa | null; light?: boolean }) {
  if (!empresa) return null;
  return (
    <View style={[styles.empresa, light && styles.empresaLight]}>
      <Text style={[styles.empresaNombre, light && { color: colors.ink }]} numberOfLines={1}>
        {empresa.nombre}
      </Text>
      <Text style={[styles.empresaEstado, empresa.estado !== 'aprobada' && { color: '#FFB48A' }]}>
        Empresa de grúas · {ESTADO_EMPRESA[empresa.estado]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: PANEL_GRUAS_BG },
  screenNarrow: { flex: 1, backgroundColor: colors.ink },
  sidebarWrap: { width: 248, backgroundColor: colors.ink },
  sidebar: { flexGrow: 1, paddingVertical: 24, paddingHorizontal: 16, gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, flexWrap: 'wrap' },
  brandMark: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brandWord: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.white },
  brandBadge: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFB48A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,26,0.14)',
    overflow: 'hidden',
  },
  nav: { gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: 12 },
  navItemActive: { backgroundColor: '#232A34' },
  navItemCurrent: { backgroundColor: 'rgba(255,107,26,0.22)' },
  navText: { fontFamily: fonts.medium, fontSize: 15, color: '#C5CBD3' },
  navTextActive: { fontFamily: fonts.semibold, color: colors.white },
  sidebarFooter: { marginTop: 'auto', gap: 4 },
  empresa: { gap: 2, padding: 12, borderRadius: 14, backgroundColor: '#1B2028', marginBottom: 8 },
  empresaLight: { backgroundColor: colors.white, boxShadow: '0px 6px 18px -12px rgba(18,22,28,0.3)' },
  empresaNombre: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  empresaEstado: { fontFamily: fonts.medium, fontSize: 12, color: '#A9B0BA' },
  main: { flex: 1, backgroundColor: PANEL_GRUAS_BG },
  mainContent: { padding: 32, gap: 24, maxWidth: 1280, width: '100%' },
  mainContentNarrow: { padding: 16, gap: 18, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  aviso: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  demo: { gap: 2, padding: 12, borderRadius: 14, backgroundColor: '#EEF1FF' },
  demoTitulo: { fontFamily: fonts.bold, fontSize: 13, color: '#2F3FA0' },
  demoTexto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: '#3D4A9C' },
});
