import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, MapPin, ShieldCheck, Star, Tag } from 'lucide-react-native';
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

import { AnuncioPopup } from '@/components/AnuncioPopup';
import { DotCanvas } from '@/components/DotCanvas';
import { PublicOnly } from '@/components/Guards';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { Reveal } from '@/components/landing/Reveal';
import { ScrollFab } from '@/components/landing/ScrollFab';
import { usePedidoDraft } from '@/lib/pedido-draft';
import type { TipoServicio } from '@/lib/types';
import {
  CamionetaIlustracion,
  Degrade,
  FONDO_LIENZO,
  GruaPlanchaIlustracion,
  Resplandor,
  SOMBRAS,
  Vidrio,
  type NombreDegrade,
} from '@/plataforma/estilo';
import { colors, fonts } from '@/theme';

// Fotos generadas con IA para Flety (Mendoza).
const FOTO_PORTADA = require('../../assets/images/landing/portada.jpg');
const FOTO_GRUA = require('../../assets/images/landing/grua-ruta.jpg');
const FOTO_EMPRESAS = require('../../assets/images/landing/empresas.jpg');
const FOTO_GRUISTA = require('../../assets/images/landing/gruista.jpg');

// Landing pública (solo web). En iOS/Android, "/" es la bienvenida (index.tsx).
export default function Landing() {
  return (
    <PublicOnly dark>
      <LandingPage />
    </PublicOnly>
  );
}

type SectionKey = 'servicios' | 'como' | 'gruas' | 'sumate';

const NAV_LINKS: { id: SectionKey; label: string }[] = [
  { id: 'servicios', label: 'Mudanzas y fletes' },
  { id: 'gruas', label: 'Grúas y auxilio' },
  { id: 'como', label: 'Cómo funciona' },
  { id: 'sumate', label: 'Sumate' },
];

const CONFIANZA = [
  { titulo: 'Precio antes de confirmar', texto: 'Sin sorpresas al final', Icon: Tag, degrade: 'sol' as const },
  { titulo: 'Seguimiento en vivo', texto: 'En el mapa, con chat', Icon: MapPin, degrade: 'fuego' as const },
  {
    titulo: 'Prestadores verificados',
    texto: 'Documentos y seguro al día',
    Icon: ShieldCheck,
    colores: ['#6EE7A0', '#16A34A'] as const,
  },
];

const PASOS: { titulo: string; texto: string; degrade: NombreDegrade; claro: boolean }[] = [
  {
    titulo: 'Contanos qué y a dónde',
    texto: 'Retiro, entrega y tamaño de la carga. O dónde estás y qué le pasó a tu vehículo.',
    degrade: 'sol',
    claro: false,
  },
  {
    titulo: 'Mirá el precio y confirmá',
    texto: 'Tarifa clara antes de pedir. Sin efectivo ni vueltas.',
    degrade: 'fuego',
    claro: true,
  },
  {
    titulo: 'Seguilo en vivo',
    texto: 'En el mapa y con chat, hasta que llega. Después calificás.',
    degrade: 'grafito',
    claro: true,
  },
];

const AUXILIOS = ['Traslado con grúa', 'Batería', 'Rueda pinchada', 'Moto y bici'];

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
  const registrarEmpresa = () => router.push({ pathname: '/registro', params: { next: '/registrar-empresa' } });

  function remember(key: SectionKey, e: LayoutChangeEvent) {
    offsets.current[key] = e.nativeEvent.layout.y;
  }
  // La barra flotante tapa ~90 px: se compensa al saltar a una sección.
  const goTo = (key: SectionKey | 'top') =>
    scrollRef.current?.scrollTo({
      y: key === 'top' ? 0 : Math.max(0, (offsets.current[key] ?? 0) - 90),
      animated: true,
    });

  const h1Size = isWide ? 76 : isMid ? 56 : 42;
  const h2Size = isWide ? 44 : 32;
  const sectionPad = isWide ? 88 : 56;

  return (
    <View style={styles.page}>
      <StatusBar style={scroll.scrolled ? 'dark' : 'light'} />
      <ScrollView ref={scrollRef} style={styles.page} onScroll={onScroll} scrollEventThrottle={32}>
        {/* Portada con foto */}
        <View style={[styles.hero, { minHeight: isWide ? 780 : 720 }]}>
          <Image
            source={FOTO_PORTADA}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: '72%', top: '55%' }}
            accessibilityLabel="Camión de mudanza con fleteros bajando cajas en una calle arbolada de Mendoza"
          />
          <LinearGradient
            colors={
              isWide
                ? ['rgba(11,14,18,0.94)', 'rgba(11,14,18,0.74)', 'rgba(11,14,18,0.18)', 'rgba(11,14,18,0.05)']
                : ['rgba(11,14,18,0.86)', 'rgba(11,14,18,0.7)', 'rgba(11,14,18,0.55)', 'rgba(11,14,18,0.5)']
            }
            locations={[0, 0.4, 0.72, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(11,14,18,0)', 'rgba(11,14,18,0.88)']}
            style={styles.heroFade}
            pointerEvents="none"
          />
          <View style={[styles.container, styles.heroInner, { paddingTop: isWide ? 150 : 120 }]}>
            <View style={{ maxWidth: 620, gap: 22 }}>
              <Reveal>
                <Vidrio oscuro style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Nuevo: grúas y auxilio en Gran Mendoza</Text>
                </Vidrio>
              </Reveal>
              <Reveal delay={80}>
                <Text style={[styles.h1, { fontSize: h1Size, lineHeight: h1Size * 1.02 }]} accessibilityRole="header">
                  Mudanzas, fletes y grúas. <Text style={styles.h1Acento}>En una app.</Text>
                </Text>
              </Reveal>
              <Reveal delay={160}>
                <Text style={styles.heroText}>
                  Mudanzas, fletes y viajes de larga distancia. Grúa o auxilio si te quedás sin batería o pinchás una
                  rueda, en auto, moto o bici. Precio antes de confirmar y todo en vivo.
                </Text>
              </Reveal>
              <Reveal delay={240}>
                <View style={styles.heroBotones}>
                  <BotonDegrade titulo="Pedir mudanza o flete" degrade="sol" onPress={() => pedir()} />
                  <BotonDegrade titulo="Pedir grúa o auxilio" degrade="fuego" onPress={() => pedir()} />
                </View>
              </Reveal>
              <Reveal delay={300}>
                <Pressable accessibilityRole="link" onPress={() => router.push('/login')}>
                  <Text style={styles.yaTengo}>Ya tengo cuenta · Iniciar sesión</Text>
                </Pressable>
              </Reveal>
            </View>
            <Reveal delay={340}>
              <View style={[styles.confianza, isWide && { flexDirection: 'row' }]}>
                {CONFIANZA.map(({ titulo, texto, Icon, ...c }) => (
                  <Vidrio key={titulo} oscuro style={[styles.confianzaItem, isWide && { flex: 1 }]}>
                    <Degrade
                      nombre={'degrade' in c ? c.degrade : undefined}
                      colores={'colores' in c ? c.colores : undefined}
                      diagonal
                      style={styles.confianzaIcono}>
                      <Icon size={19} color={'degrade' in c && c.degrade === 'sol' ? colors.ink : colors.white} />
                    </Degrade>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.confianzaTitulo}>{titulo}</Text>
                      <Text style={styles.confianzaTexto}>{texto}</Text>
                    </View>
                  </Vidrio>
                ))}
              </View>
            </Reveal>
          </View>
        </View>

        {/* Servicios */}
        <View onLayout={(e) => remember('servicios', e)} style={styles.lienzo}>
          <DotCanvas id="servicios-dots" color="#DCE0E5" gap={22} />
          <View style={[styles.container, { paddingVertical: sectionPad, gap: 34 }]}>
            <Reveal>
              <View style={[styles.cabecera, isWide && styles.cabeceraAncha]}>
                <SectionTitle eyebrow="Servicios" title="¿Qué necesitás mover?" size={h2Size} color="#993C1D" />
                <Text style={[styles.lead, { maxWidth: 420 }]}>
                  Dos servicios, una sola cuenta. Elegís, ves el precio y listo.
                </Text>
              </View>
            </Reveal>
            <View style={[styles.grid, isWide && { flexDirection: 'row' }]}>
              <Reveal style={isWide ? { flex: 1 } : undefined}>
                <TarjetaServicio
                  grua={false}
                  titulo="Mudanzas y fletes"
                  texto="Mudanzas completas, fletes chicos y viajes de larga distancia. Utilitario, camioneta o camión, con ayudantes."
                  chips={['Mudanza', 'Flete', 'Larga distancia', 'Con ayudantes']}
                  cta="Pedir mudanza o flete"
                  onPress={() => pedir('mudanza')}
                />
              </Reveal>
              <Reveal delay={120} style={isWide ? { flex: 1 } : undefined}>
                <TarjetaServicio
                  grua
                  titulo="Grúas y auxilio"
                  texto="Traslado con grúa de plancha o auxilio en el lugar: batería descargada o rueda pinchada. Te mandamos al prestador más cercano."
                  chips={['Grúa', 'Batería', 'Rueda pinchada', 'Auto · moto · bici']}
                  cta="Pedir grúa o auxilio"
                  onPress={() => pedir()}
                />
              </Reveal>
            </View>
          </View>
        </View>

        {/* Cómo funciona */}
        <View onLayout={(e) => remember('como', e)} style={{ backgroundColor: FONDO_LIENZO }}>
          <View
            style={[
              styles.container,
              { paddingBottom: sectionPad, gap: 40, flexDirection: isWide ? 'row' : 'column', alignItems: 'center' },
            ]}>
            <View style={[{ gap: 20 }, isWide && { flex: 1 }]}>
              <Reveal>
                <SectionTitle
                  eyebrow="Cómo funciona"
                  title="Tres pasos y ya está en camino"
                  size={h2Size}
                  color="#7A5A00"
                />
              </Reveal>
              {PASOS.map((p, i) => (
                <Reveal key={p.titulo} delay={i * 100}>
                  <View style={styles.paso}>
                    <Degrade nombre={p.degrade} diagonal style={styles.pasoNumero}>
                      <Text style={[styles.pasoNumeroTexto, p.claro && { color: colors.white }]}>{i + 1}</Text>
                    </Degrade>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.pasoTitulo}>{p.titulo}</Text>
                      <Text style={styles.pasoTexto}>{p.texto}</Text>
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
            <Reveal delay={150} style={isWide ? { flex: 1, alignItems: 'center' } : { alignItems: 'center' }}>
              <CelularMuestra />
            </Reveal>
          </View>
        </View>

        {/* Grúas y auxilio */}
        <View onLayout={(e) => remember('gruas', e)} style={styles.banda}>
          <Image
            source={FOTO_GRUA}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: '60%', top: '50%' }}
            accessibilityLabel="Grúa de plancha naranja llevando un auto por una ruta al anochecer"
          />
          <LinearGradient
            colors={['rgba(30,10,3,0.95)', 'rgba(110,35,8,0.8)', 'rgba(240,82,15,0.18)', 'rgba(0,0,0,0)']}
            locations={[0, 0.42, 0.78, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.container, { paddingVertical: isWide ? 110 : 72 }]}>
            <Reveal>
              <View style={{ maxWidth: 560, gap: 18 }}>
                <Vidrio oscuro style={styles.badge}>
                  <Text style={styles.badgeText}>Grúas y auxilio · nuevo en Mendoza</Text>
                </Vidrio>
                <Text style={[styles.h2Claro, { fontSize: isWide ? 48 : 34, lineHeight: (isWide ? 48 : 34) * 1.04 }]}>
                  Grúa o auxilio, sin llamadas ni vueltas
                </Text>
                <Text style={styles.bandaTexto}>
                  ¿Te quedaste sin batería, pinchaste una rueda o necesitás un traslado? Marcás dónde estás, ves el
                  precio y te mandamos al prestador más cercano. Lo seguís en el mapa hasta que llega.
                </Text>
                <View style={styles.chipsFila}>
                  {AUXILIOS.map((a) => (
                    <Vidrio key={a} oscuro style={styles.chipVidrio}>
                      <Text style={styles.chipVidrioTexto}>{a}</Text>
                    </Vidrio>
                  ))}
                </View>
                <View style={styles.heroBotones}>
                  <BotonDegrade titulo="Pedir auxilio" degrade="fuego" onPress={() => pedir()} />
                  <Pressable accessibilityRole="link" onPress={() => router.push('/registro')}>
                    <Vidrio oscuro style={styles.botonVidrio}>
                      <Text style={styles.botonVidrioTexto}>Soy prestador</Text>
                    </Vidrio>
                  </Pressable>
                </View>
              </View>
            </Reveal>
          </View>
        </View>

        {/* Para prestadores */}
        <View onLayout={(e) => remember('sumate', e)} style={styles.lienzo}>
          <DotCanvas id="sumate-dots" color="#DCE0E5" gap={22} />
          <View style={[styles.container, { paddingVertical: sectionPad, gap: 30 }]}>
            <Reveal>
              <SectionTitle eyebrow="Para prestadores" title="Trabajá con Flety" size={h2Size} color="#993C1D" />
            </Reveal>
            <View style={[styles.grid, isWide && { flexDirection: 'row' }]}>
              <Reveal style={isWide ? { flex: 1 } : undefined}>
                <TarjetaFoto
                  foto={FOTO_EMPRESAS}
                  alt="Camión de mudanza con la rampa bajada y fleteros cargando muebles en una calle de Mendoza"
                  posicion="88%"
                  panelArriba
                  etiqueta="Empresas de mudanzas y fletes"
                  colorEtiqueta="#FFD452"
                  titulo="Sumá tu empresa: mudanzas, fletes y larga distancia en un solo panel"
                  cta="Registrar mi empresa"
                  degrade="sol"
                  onPress={registrarEmpresa}
                  extra={
                    <Link href={{ pathname: '/registro', params: { next: '/unirse' } }} style={styles.linkChico}>
                      Soy chofer y tengo un código →
                    </Link>
                  }
                />
              </Reveal>
              <Reveal delay={120} style={isWide ? { flex: 1 } : undefined}>
                <TarjetaFoto
                  foto={FOTO_GRUISTA}
                  alt="Gruista con chaleco naranja junto a su grúa, de noche"
                  etiqueta="Gruistas y auxilio mecánico"
                  colorEtiqueta="#FFB48A"
                  titulo="Atendé servicios de grúa, batería y gomería cerca tuyo"
                  cta="Sumarme como prestador"
                  degrade="fuego"
                  onPress={() => router.push('/registro')}
                />
              </Reveal>
            </View>
          </View>
        </View>

        {/* Cierre */}
        <View style={{ backgroundColor: FONDO_LIENZO, paddingHorizontal: 16, paddingBottom: sectionPad }}>
          <Reveal>
            <Degrade nombre="grafito" diagonal style={[styles.cierre, { padding: isWide ? 56 : 28 }]}>
              <Resplandor color="#FF6B1A" tamano={320} />
              <Resplandor
                color="#FFC233"
                tamano={300}
                style={{ right: undefined, top: undefined, left: -90, bottom: -110 }}
              />
              <View style={{ maxWidth: 560, gap: 10, flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
                <Text style={[styles.h2Claro, { fontSize: isWide ? 40 : 30 }]}>¿Listo para mover algo?</Text>
                <Text style={styles.cierreTexto}>Creá tu cuenta gratis y pedí tu primer servicio en minutos.</Text>
              </View>
              <BotonDegrade titulo="Crear mi cuenta" degrade="sol" onPress={() => pedir()} />
            </Degrade>
          </Reveal>
        </View>

        {/* Footer */}
        <View style={styles.dark}>
          <View style={[styles.container, styles.footer]}>
            <View style={[styles.footerTop, { flexDirection: isMid ? 'row' : 'column' }]}>
              <View style={{ gap: 12, maxWidth: 360, flexShrink: 1 }}>
                <Text style={styles.footerBrand}>flety</Text>
                <Text style={styles.footerText}>
                  Mudanzas, fletes, grúas y auxilio con prestadores verificados. Mendoza, Argentina.
                </Text>
              </View>
              <View style={styles.footerCols}>
                <View style={{ gap: 10 }}>
                  <Text style={styles.footerHead}>Plataforma</Text>
                  <Link href="/registro" style={styles.footerLink}>
                    Pedir un servicio
                  </Link>
                  <Link href={{ pathname: '/registro', params: { next: '/unirse' } }} style={styles.footerLink}>
                    Sumate como chofer
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

function BotonDegrade({ titulo, degrade, onPress }: { titulo: string; degrade: 'sol' | 'fuego'; onPress: () => void }) {
  const claro = degrade === 'fuego';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
        { borderRadius: 18 },
        hovered && { transform: [{ translateY: -2 }] },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}>
      <Degrade
        nombre={degrade}
        style={[
          styles.boton,
          {
            boxShadow: `${claro ? SOMBRAS.fuego : SOMBRAS.sol}, inset 0px 1px 0px rgba(255,255,255,${claro ? 0.35 : 0.65})`,
          },
        ]}>
        <Text style={[styles.botonTexto, claro && { color: colors.white }]}>{titulo}</Text>
        <ArrowRight size={18} color={claro ? colors.white : colors.ink} strokeWidth={2.4} />
      </Degrade>
    </Pressable>
  );
}

function TarjetaServicio({
  grua,
  titulo,
  texto,
  chips,
  cta,
  onPress,
}: {
  grua: boolean;
  titulo: string;
  texto: string;
  chips: string[];
  cta: string;
  onPress: () => void;
}) {
  const tinta = grua ? '#4A1B0C' : '#3D2C00';
  const suave = grua ? '#993C1D' : '#7A5A00';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [{ flex: 1 }, hovered && { transform: [{ translateY: -3 }] }]}>
      <Degrade
        nombre={grua ? 'fuegoSuave' : 'solSuave'}
        diagonal
        style={[
          styles.servicio,
          { boxShadow: `${grua ? SOMBRAS.fuegoTarjeta : SOMBRAS.solTarjeta}, inset 0px 1px 0px rgba(255,255,255,0.8)` },
        ]}>
        <Resplandor color={grua ? '#FF6B1A' : '#FFC233'} tamano={260} />
        <View style={{ alignSelf: 'flex-end' }}>
          {grua ? <GruaPlanchaIlustracion ancho={210} /> : <CamionetaIlustracion ancho={210} />}
        </View>
        <Text style={[styles.servicioTitulo, { color: tinta }]}>{titulo}</Text>
        <Text style={[styles.servicioTexto, { color: suave }]}>{texto}</Text>
        <View style={styles.chipsFila}>
          {chips.map((c) => (
            <Text key={c} style={styles.chipClaro}>
              {c}
            </Text>
          ))}
        </View>
        <Degrade
          nombre={grua ? 'fuego' : 'grafito'}
          style={[styles.servicioCta, { boxShadow: grua ? SOMBRAS.fuego : SOMBRAS.grafito }]}>
          <Text style={styles.servicioCtaTexto}>{cta}</Text>
          <ArrowRight size={17} color={colors.white} strokeWidth={2.4} />
        </Degrade>
      </Degrade>
    </Pressable>
  );
}

function TarjetaFoto({
  foto,
  alt,
  etiqueta,
  colorEtiqueta,
  titulo,
  cta,
  degrade,
  onPress,
  extra,
  posicion = '50%',
  panelArriba = false,
}: {
  foto: number;
  alt: string;
  posicion?: string;
  // Panel de texto arriba, para fotos con el motivo en la parte de abajo.
  panelArriba?: boolean;
  etiqueta: string;
  colorEtiqueta: string;
  titulo: string;
  cta: string;
  degrade: 'sol' | 'fuego';
  onPress: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <View style={[styles.tarjetaFoto, panelArriba && { justifyContent: 'flex-start' }]}>
      <Image
        source={foto}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: posicion, top: '28%' }}
        accessibilityLabel={alt}
      />
      <LinearGradient
        colors={panelArriba ? ['rgba(18,22,28,0.92)', 'rgba(18,22,28,0)'] : ['rgba(18,22,28,0)', 'rgba(18,22,28,0.92)']}
        locations={panelArriba ? [0, 0.65] : [0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Vidrio oscuro style={styles.tarjetaFotoPanel}>
        <Text style={[styles.tarjetaFotoEtiqueta, { color: colorEtiqueta }]}>{etiqueta}</Text>
        <Text style={styles.tarjetaFotoTitulo}>{titulo}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          <BotonDegrade titulo={cta} degrade={degrade} onPress={onPress} />
          {extra}
        </View>
      </Vidrio>
    </View>
  );
}

// Celular de muestra con el seguimiento en vivo (dibujado, no es una captura).
function CelularMuestra() {
  return (
    <View style={styles.celularZona}>
      <View style={styles.celular}>
        <View style={[styles.calle, { top: '30%', height: 10, left: 0, right: 0 }]} />
        <View style={[styles.calle, { top: 0, bottom: 0, left: '40%', width: 10 }]} />
        <View style={[styles.calle, { top: '62%', height: 6, left: 0, right: 0 }]} />
        <Degrade nombre="fuego" diagonal style={styles.marcadorGrua} />
        <View style={styles.marcadorOrigen} />
        <Vidrio style={styles.celularPanel}>
          <Text style={styles.celularVivo}>EN VIVO</Text>
          <Text style={styles.celularTitulo}>La grúa va en camino</Text>
          <View style={styles.celularBarra}>
            <Degrade nombre="fuego" style={{ width: '55%', height: '100%', borderRadius: 3 }} />
          </View>
          <Degrade nombre="grafito" style={styles.celularBoton}>
            <Text style={styles.celularBotonTexto}>Chat con el gruista</Text>
          </Degrade>
        </Vidrio>
      </View>
      <Vidrio style={[styles.flotante, { left: 0, top: 70 }]}>
        <Text style={styles.flotanteChico}>Precio final</Text>
        <Text style={styles.flotanteGrande}>Antes de pedir</Text>
      </Vidrio>
      <Vidrio style={[styles.flotante, styles.flotanteFila, { right: 0, bottom: 100 }]}>
        <Star size={15} color="#F59E0B" fill="#F59E0B" />
        <Text style={styles.flotanteTexto}>Calificá tu servicio</Text>
      </Vidrio>
    </View>
  );
}

function SectionTitle({
  eyebrow,
  title,
  size,
  color,
}: {
  eyebrow: string;
  title: string;
  size: number;
  color: string;
}) {
  return (
    <View style={{ gap: 6, maxWidth: 640 }}>
      <Text style={[styles.eyebrow, { color }]}>{eyebrow}</Text>
      <Text style={[styles.h2, { fontSize: size, lineHeight: size * 1.06 }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: FONDO_LIENZO },
  container: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20 },
  hero: { backgroundColor: '#0B0E12', overflow: 'hidden' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 },
  heroInner: { gap: 56, paddingBottom: 40 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B1A',
    boxShadow: '0px 0px 0px 4px rgba(255,107,26,0.3)',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFE4D3' },
  h1: { fontFamily: fonts.display, letterSpacing: -2, color: colors.white },
  h1Acento: { color: '#FFB21E' },
  heroText: { fontFamily: fonts.regular, fontSize: 19, lineHeight: 29, color: '#D4D9DF' },
  heroBotones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  yaTengo: { fontFamily: fonts.bold, fontSize: 15, color: '#FFD452' },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 18,
  },
  botonTexto: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  confianza: { gap: 12 },
  confianzaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20 },
  confianzaIcono: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  confianzaTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  confianzaTexto: { fontFamily: fonts.regular, fontSize: 13, color: '#C5CBD3' },
  lienzo: { backgroundColor: FONDO_LIENZO, overflow: 'hidden' },
  cabecera: { gap: 12 },
  cabeceraAncha: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 14 },
  h2: { fontFamily: fonts.display, letterSpacing: -1, color: colors.ink },
  h2Claro: { fontFamily: fonts.display, letterSpacing: -1, color: colors.white },
  lead: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted },
  grid: { gap: 18 },
  servicio: { flex: 1, gap: 14, padding: 28, borderRadius: 30, overflow: 'hidden' },
  servicioTitulo: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 },
  servicioTexto: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipClaro: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.ink,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
  },
  servicioCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 15,
  },
  servicioCtaTexto: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  pasoNumero: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 10px 18px -8px rgba(18,22,28,0.5)',
  },
  pasoNumeroTexto: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  pasoTitulo: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  pasoTexto: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  celularZona: { width: 340, maxWidth: '100%', height: 480, alignItems: 'center' },
  celular: {
    width: 270,
    height: 470,
    borderRadius: 42,
    borderWidth: 9,
    borderColor: colors.ink,
    backgroundColor: '#ECEFF2',
    overflow: 'hidden',
    boxShadow: '0px 40px 80px -30px rgba(18,22,28,0.6)',
  },
  calle: { position: 'absolute', backgroundColor: colors.white },
  marcadorGrua: {
    position: 'absolute',
    left: '58%',
    top: '18%',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.white,
    boxShadow: '0px 0px 0px 10px rgba(255,107,26,0.2)',
  },
  marcadorOrigen: {
    position: 'absolute',
    left: '30%',
    top: '46%',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.ink,
  },
  celularPanel: { position: 'absolute', left: 8, right: 8, bottom: 8, padding: 14, borderRadius: 26, gap: 8 },
  celularVivo: { fontFamily: fonts.extrabold, fontSize: 11, color: '#993C1D' },
  celularTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  celularBarra: { height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  celularBoton: { paddingVertical: 10, borderRadius: 13, alignItems: 'center' },
  celularBotonTexto: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.white },
  flotante: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    boxShadow: '0px 18px 34px -16px rgba(18,22,28,0.45)',
  },
  flotanteFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flotanteChico: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  flotanteGrande: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  flotanteTexto: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink },
  banda: { backgroundColor: '#1E0A03', overflow: 'hidden' },
  bandaTexto: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 27, color: '#FFE4D3' },
  chipVidrio: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  chipVidrioTexto: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.white },
  botonVidrio: { height: 56, paddingHorizontal: 22, borderRadius: 18, justifyContent: 'center' },
  botonVidrioTexto: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
  tarjetaFoto: {
    flex: 1,
    minHeight: 460,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.ink,
    boxShadow: '0px 30px 60px -30px rgba(18,22,28,0.8)',
  },
  tarjetaFotoPanel: { margin: 16, padding: 22, borderRadius: 24, gap: 10 },
  tarjetaFotoEtiqueta: { fontFamily: fonts.extrabold, fontSize: 14 },
  tarjetaFotoTitulo: { fontFamily: fonts.display, fontSize: 26, lineHeight: 29, color: colors.white },
  linkChico: { fontFamily: fonts.bold, fontSize: 14, color: '#FFE08A' },
  cierre: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    borderRadius: 34,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    boxShadow: '0px 36px 70px -34px rgba(15,19,24,0.9)',
  },
  cierreTexto: { fontFamily: fonts.regular, fontSize: 17, color: '#C5CBD3' },
  dark: { backgroundColor: '#0F1318' },
  footer: { paddingVertical: 48, gap: 32 },
  footerTop: { justifyContent: 'space-between', gap: 32 },
  footerBrand: { fontFamily: fonts.display, fontSize: 28, color: colors.white },
  footerText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#8B95A1' },
  footerCols: { flexDirection: 'row', gap: 48, flexWrap: 'wrap' },
  footerHead: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  footerLink: { fontFamily: fonts.regular, fontSize: 14, color: '#C5CBD3' },
  copyright: { fontFamily: fonts.regular, fontSize: 13, color: '#6B7480' },
});
