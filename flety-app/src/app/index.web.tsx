import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, MapPin, Package, Route, ShieldCheck, Star, Tag, Truck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button } from '@/components/Button';
import { AnuncioPopup } from '@/components/AnuncioPopup';
import { DotCanvas } from '@/components/DotCanvas';
import { PublicOnly } from '@/components/Guards';
import { FleterosSection } from '@/components/landing/FleterosSection';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { HeroMap } from '@/components/landing/HeroMap';
import { Reveal } from '@/components/landing/Reveal';
import { ScrollFab } from '@/components/landing/ScrollFab';
import { usePedidoDraft } from '@/lib/pedido-draft';
import type { TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

// Landing pública (solo web). En iOS/Android, "/" es la bienvenida (index.tsx).
export default function Landing() {
  return (
    <PublicOnly dark>
      <LandingPage />
    </PublicOnly>
  );
}

type SectionKey = 'como' | 'servicios' | 'empresas' | 'fleteros';

const NAV_LINKS: { id: SectionKey; label: string }[] = [
  { id: 'como', label: 'Cómo funciona' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'empresas', label: 'Para empresas' },
  { id: 'fleteros', label: 'Sumate como fletero' },
];

const PASOS = [
  {
    titulo: 'Contanos qué movés',
    texto: 'Dirección de retiro y entrega, qué vas a llevar y cuándo. Si querés, sumá fotos de la carga.',
  },
  { titulo: 'Elegí el vehículo', texto: 'Utilitario, camioneta o camión. Ves el precio estimado antes de confirmar.' },
  {
    titulo: 'Seguilo en vivo',
    texto: 'Mirá al chofer en el mapa desde que sale a buscar tu carga hasta que la entrega.',
  },
];

const SERVICIOS: { tipo: TipoServicio; titulo: string; texto: string; Icon: typeof Truck; accent: boolean }[] = [
  {
    tipo: 'flete',
    titulo: 'Flete',
    texto: 'Para pocas cosas: un electrodoméstico, algunos muebles o una compra grande.',
    Icon: Truck,
    accent: true,
  },
  {
    tipo: 'mudanza',
    titulo: 'Mudanza',
    texto: 'Tu casa o departamento, con ayudantes para cargar y descargar.',
    Icon: Package,
    accent: false,
  },
  {
    tipo: 'larga_distancia',
    titulo: 'Larga distancia',
    texto: 'Traslados entre ciudades con empresas que hacen ese recorrido.',
    Icon: Route,
    accent: false,
  },
];

const MOTIVOS = [
  {
    titulo: 'Solo empresas verificadas',
    texto: 'Revisamos CUIT, documentación y seguro de carga antes de que una empresa pueda recibir pedidos.',
    Icon: ShieldCheck,
    bg: colors.successBg,
    fg: colors.success,
  },
  {
    titulo: 'Precio antes de confirmar',
    texto: 'Ves un precio estimado según distancia y ayudantes antes de pedir.',
    Icon: Tag,
    bg: '#FFF3D6',
    fg: '#7A4F00',
  },
  {
    titulo: 'Seguimiento en tiempo real',
    texto: 'La ubicación del chofer y el estado de tu pedido se actualizan al instante.',
    Icon: MapPin,
    bg: '#E8EEFF',
    fg: '#2F45B5',
  },
  {
    titulo: 'Calificaciones mutuas',
    texto: 'Después de cada viaje, cliente y empresa se califican. La reputación cuenta.',
    Icon: Star,
    bg: colors.surface,
    fg: colors.ink,
  },
];

const BENEFICIOS_EMPRESA = [
  'Pedidos de tu zona en una cola en tiempo real',
  'Asigná choferes de tu flota en un clic',
  'Fotos de la carga antes de aceptar',
];

function LandingPage() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isMid = width >= 640;
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<SectionKey, number>>>({});
  const { update } = usePedidoDraft();
  const [scroll, setScroll] = useState({ scrolled: false, abajo: false });

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const next = { scrolled: y > 24, abajo: y > 320 };
    if (next.scrolled !== scroll.scrolled || next.abajo !== scroll.abajo) setScroll(next);
  }

  // Para pedir hay que tener cuenta: se registra (o entra) y sigue en su inicio.
  // El tipo elegido queda preseleccionado en el formulario.
  function pedir(tipo?: TipoServicio) {
    if (tipo) update({ tipo });
    router.push('/registro');
  }

  function remember(key: SectionKey, e: LayoutChangeEvent) {
    offsets.current[key] = e.nativeEvent.layout.y;
  }
  // La barra flotante tapa ~90 px: se compensa al saltar a una sección.
  const goTo = (key: SectionKey | 'top') =>
    scrollRef.current?.scrollTo({
      y: key === 'top' ? 0 : Math.max(0, (offsets.current[key] ?? 0) - 90),
      animated: true,
    });

  const h1Size = isWide ? 68 : isMid ? 52 : 40;
  const h2Size = isWide ? 44 : 32;
  const sectionPad = isWide ? 88 : 56;

  return (
    <View style={styles.page}>
      <StatusBar style={scroll.scrolled ? 'dark' : 'light'} />
      <ScrollView ref={scrollRef} style={styles.page} onScroll={onScroll} scrollEventThrottle={32}>
        {/* Hero */}
        <View style={[styles.dark, styles.heroBand]}>
          <DotCanvas id="hero-dots" color="#232A34" gap={26} />
          <View style={styles.glow} pointerEvents="none" />
          <View
            style={[
              styles.container,
              styles.hero,
              {
                flexDirection: isWide ? 'row' : 'column',
                paddingBottom: isWide ? 88 : 48,
                paddingTop: isWide ? 128 : 104,
              },
            ]}>
            <View style={[styles.heroCopy, isWide && { flex: 1.05 }]}>
              <Reveal>
                <View style={styles.badge}>
                  <View style={styles.heroLiveDot} />
                  <Text style={styles.badgeText}>Fleteros disponibles ahora en Mendoza</Text>
                </View>
              </Reveal>
              <Reveal delay={80}>
                <Text style={[styles.h1, { fontSize: h1Size, lineHeight: h1Size * 1.02 }]} accessibilityRole="header">
                  Mové lo que necesites, <Text style={{ color: colors.accent }}>cuando lo necesites.</Text>
                </Text>
              </Reveal>
              <Reveal delay={160}>
                <Text style={styles.heroText}>
                  Elegí al fletero que quieras o dejá que te lo asignemos. Empresas verificadas, precio antes de
                  confirmar y tu carga en el mapa hasta que llega.
                </Text>
              </Reveal>
              <Reveal delay={240}>
                <View style={styles.pasosHero}>
                  {['Creá tu cuenta', 'Cargá retiro y entrega', 'Elegí tu fletero'].map((paso, i) => (
                    <View key={paso} style={styles.pasoHero}>
                      <Text style={styles.pasoHeroNum}>{i + 1}</Text>
                      <Text style={styles.pasoHeroText}>{paso}</Text>
                    </View>
                  ))}
                </View>
              </Reveal>
              <Reveal delay={300}>
                <View style={styles.heroButtons}>
                  <Button title="Crear cuenta y pedir un flete" onPress={() => pedir()} style={styles.heroButton} />
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push('/login')}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.ghostButton,
                      hovered && { backgroundColor: 'rgba(255,255,255,0.06)' },
                    ]}>
                    <Text style={styles.ghostButtonText}>Ya tengo cuenta</Text>
                  </Pressable>
                </View>
              </Reveal>
              <Reveal delay={320}>
                <View style={styles.trustRow}>
                  {['Empresas verificadas', 'Precio antes de confirmar', 'Seguimiento en vivo'].map((t) => (
                    <View key={t} style={styles.trust}>
                      <Check size={16} color={colors.accent} strokeWidth={2.6} />
                      <Text style={styles.trustText}>{t}</Text>
                    </View>
                  ))}
                  <Pressable accessibilityRole="link" onPress={() => goTo('empresas')}>
                    <Text style={styles.trustLink}>Soy empresa de mudanzas →</Text>
                  </Pressable>
                </View>
              </Reveal>
            </View>
            <Reveal delay={200} style={isWide ? { flex: 1 } : { width: '100%' }}>
              <HeroMap height={isWide ? 540 : 400} />
            </Reveal>
          </View>
        </View>

        {/* Cómo funciona */}
        <View
          onLayout={(e) => remember('como', e)}
          style={[styles.container, { paddingVertical: sectionPad, gap: 40 }]}>
          <Reveal>
            <SectionTitle eyebrow="Cómo funciona" title="Tres pasos y tu carga está en camino" size={h2Size} />
          </Reveal>
          <View style={styles.grid}>
            {PASOS.map((paso, index) => (
              <Reveal key={paso.titulo} delay={index * 110} style={styles.cardSlot}>
                <View style={[styles.card, styles.cardGray]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{paso.titulo}</Text>
                  <Text style={styles.cardText}>{paso.texto}</Text>
                </View>
              </Reveal>
            ))}
          </View>
        </View>

        {/* Servicios */}
        <View onLayout={(e) => remember('servicios', e)} style={styles.grayBand}>
          <View style={[styles.container, { paddingVertical: sectionPad, gap: 40 }]}>
            <Reveal>
              <SectionTitle eyebrow="Servicios" title="Desde una heladera hasta toda tu casa" size={h2Size} />
            </Reveal>
            <View style={styles.grid}>
              {SERVICIOS.map(({ tipo, titulo, texto, Icon, accent }, index) => (
                <Reveal key={titulo} delay={index * 110} style={styles.cardSlot}>
                  <View style={[styles.card, styles.cardWhite]}>
                    <View style={[styles.iconTile, { backgroundColor: accent ? colors.accent : colors.surface }]}>
                      <Icon size={28} color={colors.ink} strokeWidth={1.9} />
                    </View>
                    <Text style={[styles.cardTitle, { fontSize: 22 }]}>{titulo}</Text>
                    <Text style={styles.cardText}>{texto}</Text>
                    <Pressable accessibilityRole="link" onPress={() => pedir(tipo)} style={styles.cardLinkWrap}>
                      <Text style={styles.cardLink}>Pedir {titulo.toLowerCase()}</Text>
                    </Pressable>
                  </View>
                </Reveal>
              ))}
            </View>
          </View>
        </View>

        {/* Por qué Flety */}
        <View
          style={[
            styles.container,
            { paddingVertical: sectionPad, gap: 40, flexDirection: isWide ? 'row' : 'column' },
          ]}>
          <Reveal style={[{ gap: 12 }, isWide && { flex: 1 }]}>
            <SectionTitle eyebrow="Por qué Flety" title="Una red curada, no una vidriera abierta" size={h2Size} />
            <Text style={styles.lead}>Ninguna empresa opera en Flety sin pasar antes por una aprobación manual.</Text>
          </Reveal>
          <View style={[styles.grid, isWide && { flex: 2 }]}>
            {MOTIVOS.map(({ titulo, texto, Icon, bg, fg }, index) => (
              <Reveal key={titulo} delay={index * 90} style={styles.motivo}>
                <View style={[styles.motivoIcon, { backgroundColor: bg }]}>
                  <Icon size={22} color={fg} strokeWidth={2} />
                </View>
                <Text style={[styles.cardTitle, { fontSize: 18 }]}>{titulo}</Text>
                <Text style={[styles.cardText, { fontSize: 15 }]}>{texto}</Text>
              </Reveal>
            ))}
          </View>
        </View>

        {/* Para empresas */}
        <View onLayout={(e) => remember('empresas', e)} style={[styles.container, { paddingBottom: sectionPad }]}>
          <Reveal>
            <View style={[styles.empresas, { flexDirection: isWide ? 'row' : 'column', padding: isWide ? 56 : 28 }]}>
              <View style={[{ gap: 20 }, isWide && { flex: 1 }]}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>Para empresas</Text>
                <Text style={[styles.h2, { fontSize: isWide ? 40 : 30, color: colors.white }]}>
                  ¿Tenés una empresa de fletes o mudanzas?
                </Text>
                <Text style={[styles.lead, { color: colors.mutedOnInk }]}>
                  Sumate a la red y recibí pedidos de tu zona sin salir a buscarlos.
                </Text>
                <View style={{ gap: 12 }}>
                  {BENEFICIOS_EMPRESA.map((b) => (
                    <View key={b} style={styles.beneficio}>
                      <Check size={20} color={colors.accent} strokeWidth={2.4} />
                      <Text style={styles.beneficioText}>{b}</Text>
                    </View>
                  ))}
                </View>
                <Button
                  title="Registrar mi empresa"
                  onPress={() => router.push({ pathname: '/registro', params: { next: '/registrar-empresa' } })}
                  style={styles.empresasButton}
                />
              </View>
              <View style={[styles.queueCard, isWide && { flex: 1 }]}>
                <View style={styles.queueHeader}>
                  <Text style={styles.queueTitle}>Cola de pedidos</Text>
                  <View style={styles.liveChip}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>En vivo</Text>
                  </View>
                </View>
                {[
                  ['Mudanza · Mediano', 'Ahora · 1 ayudante'],
                  ['Flete · Chico', 'Programado · sin ayudantes'],
                  ['Larga distancia · Grande', 'Programado · 2 ayudantes'],
                ].map(([titulo, detalle]) => (
                  <View key={titulo} style={styles.queueRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.queueRowTitle}>{titulo}</Text>
                      <Text style={styles.queueRowDetail}>{detalle}</Text>
                    </View>
                    <Text style={styles.queueAccept}>Aceptar</Text>
                  </View>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* Sumate como fletero */}
        <View onLayout={(e) => remember('fleteros', e)}>
          <FleterosSection
            isWide={isWide}
            onEmpresas={() => router.push({ pathname: '/registro', params: { next: '/registrar-empresa' } })}
          />
        </View>

        {/* CTA */}
        <View style={{ backgroundColor: colors.accent }}>
          <View style={[styles.container, styles.cta]}>
            <Text style={[styles.h2, { fontSize: isWide ? 48 : 32 }]}>¿Qué movemos hoy?</Text>
            <Button title="Pedir un flete" variant="dark" onPress={() => pedir()} style={styles.ctaButton} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.dark}>
          <View style={[styles.container, styles.footer]}>
            <View style={[styles.footerTop, { flexDirection: isMid ? 'row' : 'column' }]}>
              <View style={{ gap: 12, maxWidth: 360, flexShrink: 1 }}>
                <Text style={styles.footerBrand}>flety</Text>
                <Text style={styles.footerText}>Fletes y mudanzas con empresas verificadas. Mendoza, Argentina.</Text>
              </View>
              <View style={styles.footerCols}>
                <View style={{ gap: 10 }}>
                  <Text style={styles.footerHead}>Plataforma</Text>
                  <Link href="/registro" style={styles.footerLink}>
                    Pedir un flete
                  </Link>
                  <Link href={{ pathname: '/registro', params: { next: '/unirse' } }} style={styles.footerLink}>
                    Sumate como fletero
                  </Link>
                  <Link href="/login" style={styles.footerLink}>
                    Iniciar sesión
                  </Link>
                </View>
                <View style={{ gap: 10 }}>
                  <Text style={styles.footerHead}>Legal</Text>
                  <Text style={styles.footerText}>Términos y condiciones</Text>
                  <Text style={styles.footerText}>Privacidad</Text>
                </View>
              </View>
            </View>
            <Text style={styles.copyright}>© {new Date().getFullYear()} Flety</Text>
          </View>
        </View>
      </ScrollView>
      <FloatingNav
        links={NAV_LINKS}
        onGo={(id) => goTo(id as SectionKey | 'top')}
        scrolled={scroll.scrolled}
        isWide={isWide}
      />
      <ScrollFab visible={scroll.abajo} onPress={() => goTo('top')} />
      <AnuncioPopup audiencia="visitante" demora={3000} />
    </View>
  );
}

function SectionTitle({ eyebrow, title, size }: { eyebrow: string; title: string; size: number }) {
  return (
    <View style={{ gap: 12, maxWidth: 640 }}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.h2, { fontSize: size, lineHeight: size * 1.08 }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  container: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24 },
  dark: { backgroundColor: colors.ink },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    gap: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4, color: colors.white },
  navLinks: { flexDirection: 'row', gap: 28 },
  navLink: { fontFamily: fonts.medium, fontSize: 15, color: '#C5CBD3' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  loginLink: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  headerButton: { height: 44, borderRadius: 12, paddingHorizontal: 18 },
  hero: { gap: 48, paddingTop: 32, alignItems: 'center', zIndex: 1 },
  heroCopy: { gap: 24, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#1E242C',
    borderWidth: 1,
    borderColor: '#2A313B',
  },
  heroLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.18)',
  },
  heroBand: { overflow: 'hidden' },
  glow: {
    position: 'absolute',
    top: -160,
    right: -120,
    width: 620,
    height: 620,
    borderRadius: 310,
    backgroundColor: 'rgba(255, 194, 51, 0.16)',
    filter: 'blur(90px)',
  } as object,
  heroButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroButton: { paddingHorizontal: 28 },
  pasosHero: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pasoHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#2A313B',
  },
  pasoHeroNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.accent,
  },
  pasoHeroText: { fontFamily: fonts.semibold, fontSize: 14, color: '#E4E8ED' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontFamily: fonts.medium, fontSize: 14, color: '#C5CBD3' },
  trustLink: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white, textDecorationLine: 'underline' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13, color: '#D5DBE3' },
  h1: { fontFamily: fonts.display, letterSpacing: -1.5, color: colors.white },
  heroText: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 27, color: colors.mutedOnInk, maxWidth: 520 },
  ghostButton: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#3A424D',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  ghostButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  eyebrow: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7A4F00',
  },
  h2: { fontFamily: fonts.display, letterSpacing: -0.8, color: colors.ink },
  lead: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  cardSlot: { flexGrow: 1, flexBasis: 260 },
  card: { flex: 1, gap: 14, padding: 28, borderRadius: 24 },
  cardGray: { backgroundColor: '#F4F5F7' },
  cardWhite: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E3E6EA' },
  stepNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontFamily: fonts.display, fontSize: 20, color: colors.accent },
  cardTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  cardText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted },
  cardLinkWrap: { marginTop: 'auto', alignSelf: 'flex-start' },
  cardLink: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  iconTile: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grayBand: { backgroundColor: '#F4F5F7' },
  motivo: { flexGrow: 1, flexBasis: 240, gap: 10 },
  motivoIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empresas: { gap: 40, borderRadius: 32, backgroundColor: colors.ink, alignItems: 'center' },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  beneficioText: { fontFamily: fonts.regular, fontSize: 16, color: '#E4E8ED' },
  empresasButton: { alignSelf: 'flex-start', paddingHorizontal: 28 },
  queueCard: { width: '100%', gap: 12, padding: 20, borderRadius: 24, backgroundColor: colors.white },
  queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.successBg,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22A06B' },
  liveText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  queueRowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  queueRowDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  queueAccept: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    paddingVertical: 64,
  },
  ctaButton: { paddingHorizontal: 28 },
  footer: { paddingTop: 56, paddingBottom: 32, gap: 40 },
  footerTop: { justifyContent: 'space-between', gap: 32 },
  footerBrand: { fontFamily: fonts.display, fontSize: 24, color: colors.white },
  footerText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mutedOnInk },
  // Las columnas bajan de línea si no entran (antes "Legal" quedaba cortada en el celular).
  footerCols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 40, rowGap: 24, flexShrink: 1 },
  footerHead: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  footerLink: { fontFamily: fonts.regular, fontSize: 15, color: colors.mutedOnInk },
  copyright: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.faintOnInk,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#232A34',
  },
});
