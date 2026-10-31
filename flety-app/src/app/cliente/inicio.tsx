import * as Location from 'expo-location';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, ChevronRight, MapPin, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnuncioPopup } from '@/components/AnuncioPopup';
import { grupoDe } from '@/components/historial/FleteCard';
import { AvisoPendiente } from '@/components/pedido/AvisoPendiente';
import { VehiculoIlustracion } from '@/components/VehiculoIlustracion';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { ESTADO_GRUA, ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useMisSolicitudesGrua } from '@/modulos/gruas/hooks';
import { G } from '@/modulos/gruas/ui';
import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/empresa';
import { localidadDeCoordenadas } from '@/lib/geocoding';
import { ESTADO_LABELS } from '@/lib/state-machine';
import { GruaIlustracion } from '@/plataforma/GruaIlustracion';
import { MARCA } from '@/plataforma/marca';
import { SERVICIOS, type Servicio } from '@/plataforma/servicios';
import { colors, fonts } from '@/theme';

// Inicio de la plataforma: el cliente elige qué necesita resolver. Cada
// servicio lleva a su propia experiencia (Mudanzas, Grúas).
export default function InicioPlataforma() {
  const isWide = useIsWide();
  return (
    <>
      {isWide ? (
        <ClienteShell active="inicio" panel={<Contenido ancho />} />
      ) : (
        <SafeAreaView style={styles.screen} edges={['top']}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.content}>
            <Contenido />
          </ScrollView>
        </SafeAreaView>
      )}
      <AnuncioPopup audiencia="cliente" />
    </>
  );
}

// Localidad solo si el permiso de ubicación ya estaba dado: el inicio no pide
// permisos (se piden adentro de cada servicio, cuando hacen falta).
function useLocalidad() {
  const [localidad, setLocalidad] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getLastKnownPositionAsync();
        if (!pos) return;
        const l = await localidadDeCoordenadas(pos.coords.latitude, pos.coords.longitude);
        if (!cancelled && l) setLocalidad(l);
      } catch {
        // Sin ubicación: no se muestra.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return localidad;
}

function Contenido({ ancho }: { ancho?: boolean }) {
  const { nombre } = useAuth();
  const localidad = useLocalidad();
  const { pedidos } = useMisPedidos();
  const enCurso = pedidos.find((p) => grupoDe(p) === 'en_curso');
  const { solicitudes } = useMisSolicitudesGrua();
  const gruaEnCurso = solicitudes.find((s) => ESTADOS_ACTIVOS.includes(s.estado));
  const primerNombre = nombre?.split(' ')[0];

  return (
    <View style={{ gap: 18 }}>
      {ancho ? null : (
        <View style={styles.header}>
          <View style={styles.marca}>
            <View style={styles.marcaIcono}>
              <Truck size={18} color={colors.ink} strokeWidth={2.2} />
            </View>
            <Text style={styles.marcaTexto}>{MARCA.nombre.toLowerCase()}</Text>
          </View>
          <View style={styles.headerDerecha}>
            {localidad ? (
              <View style={styles.ubicacion}>
                <MapPin size={13} color={colors.muted} strokeWidth={2.2} />
                <Text style={styles.ubicacionTexto} numberOfLines={1}>
                  {localidad}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mi cuenta"
              onPress={() => router.navigate('/cliente/cuenta')}
              style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales(nombre || 'Yo')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ gap: 2 }}>
        {primerNombre ? <Text style={styles.saludo}>Hola, {primerNombre}</Text> : null}
        <Text style={[styles.titulo, ancho && styles.tituloAncho]} accessibilityRole="header">
          ¿Qué necesitás resolver hoy?
        </Text>
      </View>

      {enCurso ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/cliente/pedidos/${enCurso.id}`)}
          style={({ pressed }) => [styles.enCurso, pressed && { opacity: 0.85 }]}>
          <View style={styles.enCursoPunto} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.enCursoTitulo}>Tu flete en curso</Text>
            <Text style={styles.enCursoTexto} numberOfLines={1}>
              {ESTADO_LABELS[enCurso.estado]}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.white} />
        </Pressable>
      ) : null}
      {gruaEnCurso ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/gruas/[id]', params: { id: gruaEnCurso.id } })}
          style={({ pressed }) => [styles.enCurso, { backgroundColor: G.tinta }, pressed && { opacity: 0.85 }]}>
          <View style={[styles.enCursoPunto, { backgroundColor: G.acento }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.enCursoTitulo}>Tu grúa en curso</Text>
            <Text style={styles.enCursoTexto} numberOfLines={1}>
              {ESTADO_GRUA[gruaEnCurso.estado].titulo}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.white} />
        </Pressable>
      ) : null}
      <AvisoPendiente />

      <View style={[styles.servicios, ancho && styles.serviciosAncho]}>
        {SERVICIOS.map((s, i) => (
          <TarjetaServicio key={s.id} servicio={s} indice={i} ancho={!!ancho} />
        ))}
      </View>
    </View>
  );
}

function TarjetaServicio({ servicio: s, indice, ancho }: { servicio: Servicio; indice: number; ancho: boolean }) {
  const activo = s.estado === 'activo';
  const [aviso, setAviso] = useState(false);
  // Entrada suave, una tarjeta después de la otra.
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 420, delay: 80 + indice * 110, useNativeDriver: true }).start();
  }, [entrada, indice]);

  function abrir() {
    if (activo && s.ruta) router.push(s.ruta);
    else setAviso((a) => !a);
  }

  return (
    <Animated.View
      style={[
        ancho && { flex: 1 },
        {
          opacity: entrada,
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${s.titulo}. ${s.descripcion} ${activo ? s.cta : 'Muy pronto'}`}
        onPress={abrir}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.tarjeta,
          { backgroundColor: s.color.suave },
          ancho && { flex: 1 },
          hovered && activo && styles.tarjetaHover,
          pressed && { transform: [{ scale: 0.985 }] },
        ]}>
        {ancho ? (
          <>
            <View style={styles.tarjetaArriba}>
              <View style={[styles.tarjetaIcono, { backgroundColor: s.color.acento }]}>
                <s.Icon size={20} color={s.id === 'gruas' ? colors.white : colors.ink} strokeWidth={2.2} />
              </View>
              <Sello s={s} />
            </View>
            <View style={styles.ilustracion}>
              <Ilustracion s={s} ancho={250} />
            </View>
            <Text style={[styles.tarjetaTitulo, { color: s.color.texto }]}>{s.titulo}</Text>
            <Text style={[styles.tarjetaTexto, { color: s.color.textoSuave }]}>{s.descripcion}</Text>
          </>
        ) : (
          // Celular: compacta (texto a la izquierda, ilustración a la derecha)
          // para que los dos servicios entren en pantalla sin desplazar.
          <View style={styles.compacta}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Sello s={s} />
              <Text style={[styles.tarjetaTitulo, styles.tituloCompacto, { color: s.color.texto }]}>{s.titulo}</Text>
              <Text
                style={[styles.tarjetaTexto, styles.textoCompacto, { color: s.color.textoSuave }]}
                numberOfLines={3}>
                {s.descripcion}
              </Text>
            </View>
            <View style={styles.ilustracionCompacta}>
              <Ilustracion s={s} ancho={132} />
            </View>
          </View>
        )}

        <View style={[styles.cta, { backgroundColor: activo ? s.color.tinta : 'rgba(0,0,0,0.06)' } as ViewStyle]}>
          <Text style={[styles.ctaTexto, !activo && { color: s.color.textoSuave }]}>
            {activo ? s.cta : 'Muy pronto'}
          </Text>
          {activo ? <ArrowRight size={18} color={colors.white} strokeWidth={2.4} /> : null}
        </View>
        {aviso && !activo ? (
          <Text style={[styles.aviso, { color: s.color.textoSuave }]}>
            Estamos sumando grúas y gruistas en Mendoza. Muy pronto vas a poder pedir una desde acá.
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Sello({ s }: { s: Servicio }) {
  return <Text style={[styles.sello, { color: s.color.textoSuave, borderColor: s.color.textoSuave }]}>{s.sello}</Text>;
}

function Ilustracion({ s, ancho }: { s: Servicio; ancho: number }) {
  return s.id === 'gruas' ? (
    <GruaIlustracion ancho={ancho} acento={s.color.acento} />
  ) : (
    <VehiculoIlustracion tipo="camioneta" color="amarillo" ancho={ancho} />
  );
}

const styles = StyleSheet.create({
  compacta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ilustracionCompacta: { width: 132, alignItems: 'center' },
  tituloCompacto: { fontSize: 22, marginTop: 4 },
  textoCompacto: { fontSize: 13, lineHeight: 18 },
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marcaIcono: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaTexto: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.ink },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  ubicacion: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  ubicacionTexto: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, flexShrink: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  saludo: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  titulo: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: colors.ink },
  tituloAncho: { fontSize: 34, lineHeight: 38 },
  enCurso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.ink,
  },
  enCursoPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  enCursoTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  enCursoTexto: { fontFamily: fonts.regular, fontSize: 13, color: colors.mutedOnInk },
  servicios: { gap: 14 },
  serviciosAncho: { flexDirection: 'row', alignItems: 'stretch' },
  tarjeta: { gap: 6, padding: 18, borderRadius: 26 },
  tarjetaHover: { transform: [{ translateY: -2 }] },
  tarjetaArriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tarjetaIcono: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sello: {
    alignSelf: 'flex-start',
    fontFamily: fonts.semibold,
    fontSize: 11,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ilustracion: { alignItems: 'center', paddingVertical: 4 },
  tarjetaTitulo: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4 },
  tarjetaTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  cta: {
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  aviso: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 },
});
