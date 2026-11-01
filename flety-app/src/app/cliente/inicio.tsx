import * as Location from 'expo-location';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, ChevronRight, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnuncioPopup } from '@/components/AnuncioPopup';
import { DotCanvas } from '@/components/DotCanvas';
import { grupoDe } from '@/components/historial/FleteCard';
import { MapaCercanos } from '@/components/map/MapaCercanos';
import { AvisoPendiente } from '@/components/pedido/AvisoPendiente';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/empresa';
import { localidadDeCoordenadas } from '@/lib/geocoding';
import { formatARS } from '@/lib/pricing';
import { ESTADO_LABELS } from '@/lib/state-machine';
import { ESTADO_GRUA, ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useMisSolicitudesGrua } from '@/modulos/gruas/hooks';
import {
  CamionetaIlustracion,
  Degrade,
  FONDO_LIENZO,
  GruaPlanchaIlustracion,
  IconoCamioneta,
  Resplandor,
  SOMBRAS,
  type NombreDegrade,
} from '@/plataforma/estilo';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { MARCA } from '@/plataforma/marca';
import { SERVICIOS, type Servicio } from '@/plataforma/servicios';
import { colors, fonts } from '@/theme';

const fechaCorta = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

// Inicio de la plataforma: el cliente elige qué necesita resolver. Cada
// servicio lleva a su propia experiencia (Mudanzas, Grúas y auxilio).
export default function InicioPlataforma() {
  const isWide = useIsWide();
  return (
    <>
      {isWide ? (
        <ClienteShell active="inicio" panel={<Contenido ancho />} map={<MapaCercanos grande />} />
      ) : (
        <SafeAreaView style={styles.screen} edges={['top']}>
          <StatusBar style="dark" />
          <DotCanvas id="inicio-dots" color="#DCE0E5" gap={20} />
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

type Reciente = {
  id: string;
  servicio: 'mudanzas' | 'gruas';
  titulo: string;
  detalle: string;
  precio: number | null;
  fecha: string;
  abrir: () => void;
};

function Contenido({ ancho }: { ancho?: boolean }) {
  const { nombre } = useAuth();
  const localidad = useLocalidad();
  const { pedidos } = useMisPedidos();
  const enCurso = pedidos.find((p) => grupoDe(p) === 'en_curso');
  const { solicitudes } = useMisSolicitudesGrua();
  const gruaEnCurso = solicitudes.find((s) => ESTADOS_ACTIVOS.includes(s.estado));
  const primerNombre = nombre?.split(' ')[0];

  // Los dos últimos servicios terminados (de cualquier negocio).
  const recientes: Reciente[] = [
    ...pedidos
      .filter((p) => grupoDe(p) === 'terminados')
      .map((p) => ({
        id: `m-${p.id}`,
        servicio: 'mudanzas' as const,
        titulo: `${p.tipo === 'mudanza' ? 'Mudanza' : p.tipo === 'larga_distancia' ? 'Larga distancia' : 'Flete'} · ${
          p.origen?.direccion?.split(',')[0] ?? 'Retiro'
        }`,
        detalle: ESTADO_LABELS[p.estado],
        precio: p.precio_estimado,
        fecha: p.created_at,
        abrir: () => router.push(`/cliente/pedidos/${p.id}`),
      })),
    ...solicitudes
      .filter((s) => s.estado === 'finalizada')
      .map((s) => ({
        id: `g-${s.id}`,
        servicio: 'gruas' as const,
        titulo: `Grúa · ${s.origen.direccion?.split(',')[0] ?? 'Retiro'}`,
        detalle: ESTADO_GRUA[s.estado].corto,
        precio: s.precio_total,
        fecha: s.created_at,
        abrir: () => router.push({ pathname: '/gruas/[id]', params: { id: s.id } }),
      })),
  ]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 2);

  return (
    <View style={{ gap: 18 }}>
      {ancho ? null : (
        <View style={styles.header}>
          <View style={styles.marca}>
            <Degrade nombre="sol" diagonal style={styles.marcaIcono}>
              <IconoCamioneta size={19} color={colors.ink} strokeWidth={2.2} />
            </Degrade>
            <Text style={styles.marcaTexto}>{MARCA.nombre.toLowerCase()}</Text>
          </View>
          <View style={styles.headerDerecha}>
            {localidad ? (
              <View style={styles.ubicacion}>
                <MapPin size={13} color="#FF9F1C" strokeWidth={2.4} />
                <Text style={styles.ubicacionTexto} numberOfLines={1}>
                  {localidad}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mi cuenta"
              onPress={() => router.navigate('/cliente/cuenta')}>
              <Degrade nombre="grafito" style={styles.avatar}>
                <Text style={styles.avatarTexto}>{iniciales(nombre || 'Yo')}</Text>
              </Degrade>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ gap: 2 }}>
        {primerNombre ? <Text style={styles.saludo}>Hola, {primerNombre}</Text> : null}
        <Text style={[styles.titulo, ancho && styles.tituloAncho]} accessibilityRole="header">
          ¿Qué necesitás <Text style={styles.tituloAcento}>resolver hoy?</Text>
        </Text>
      </View>

      {ancho ? null : <MapaCercanos />}

      {enCurso ? (
        <BannerEnCurso
          degrade="grafito"
          punto="#4ADE80"
          titulo="Tu flete en curso"
          detalle={ESTADO_LABELS[enCurso.estado]}
          onPress={() => router.push(`/cliente/pedidos/${enCurso.id}`)}
        />
      ) : null}
      {gruaEnCurso ? (
        <BannerEnCurso
          degrade="brasa"
          punto="#FF7A2E"
          titulo="Tu grúa en curso"
          detalle={ESTADO_GRUA[gruaEnCurso.estado].titulo}
          onPress={() => router.push({ pathname: '/gruas/[id]', params: { id: gruaEnCurso.id } })}
        />
      ) : null}
      <AvisoPendiente />

      <View style={[styles.servicios, ancho && styles.serviciosAncho]}>
        {SERVICIOS.map((s, i) => (
          <TarjetaServicio key={s.id} servicio={s} indice={i} ancho={!!ancho} />
        ))}
      </View>

      {recientes.length ? (
        <View style={{ gap: 10 }}>
          <View style={styles.recientesHead}>
            <Text style={styles.recientesTitulo}>Recientes</Text>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/cliente/pedidos')} hitSlop={8}>
              <Text style={styles.verTodo}>Ver todo</Text>
            </Pressable>
          </View>
          {recientes.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={r.abrir}
              style={({ pressed }) => [styles.reciente, pressed && { opacity: 0.85 }]}>
              <Degrade nombre={r.servicio === 'gruas' ? 'fuego' : 'sol'} diagonal style={styles.recienteIcono}>
                {r.servicio === 'gruas' ? (
                  <IconoGrua size={20} color={colors.white} strokeWidth={2.1} />
                ) : (
                  <IconoCamioneta size={20} color={colors.ink} strokeWidth={2.1} />
                )}
              </Degrade>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.recienteTitulo} numberOfLines={1}>
                  {r.titulo}
                </Text>
                <Text style={styles.recienteDetalle} numberOfLines={1}>
                  {r.detalle} · {fechaCorta.format(new Date(r.fecha))}
                </Text>
              </View>
              {r.precio != null ? <Text style={styles.recientePrecio}>{formatARS(r.precio)}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BannerEnCurso({
  degrade,
  punto,
  titulo,
  detalle,
  onPress,
}: {
  degrade: NombreDegrade;
  punto: string;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.88 }}>
      <Degrade
        nombre={degrade}
        diagonal
        style={[styles.enCurso, { boxShadow: degrade === 'brasa' ? SOMBRAS.fuegoTarjeta : SOMBRAS.grafito }]}>
        <View style={[styles.enCursoPunto, { backgroundColor: punto, boxShadow: `0px 0px 0px 5px ${punto}40` }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.enCursoTitulo}>{titulo}</Text>
          <Text style={styles.enCursoTexto} numberOfLines={1}>
            {detalle}
          </Text>
        </View>
        <View style={styles.enCursoFlecha}>
          <ChevronRight size={18} color={colors.white} />
        </View>
      </Degrade>
    </Pressable>
  );
}

function TarjetaServicio({ servicio: s, indice, ancho }: { servicio: Servicio; indice: number; ancho: boolean }) {
  const activo = s.estado === 'activo';
  const esGrua = s.id === 'gruas';
  // Entrada suave, una tarjeta después de la otra.
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 420, delay: 80 + indice * 110, useNativeDriver: true }).start();
  }, [entrada, indice]);

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
        accessibilityLabel={`${s.titulo}. ${s.descripcion} ${s.cta}`}
        disabled={!activo}
        onPress={() => s.ruta && router.push(s.ruta)}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          ancho && { flex: 1 },
          hovered && styles.tarjetaHover,
          pressed && { transform: [{ scale: 0.985 }] },
        ]}>
        <Degrade
          nombre={esGrua ? 'fuegoSuave' : 'solSuave'}
          diagonal
          style={[
            styles.tarjeta,
            ancho && { flex: 1 },
            {
              boxShadow: `${esGrua ? SOMBRAS.fuegoTarjeta : SOMBRAS.solTarjeta}, inset 0px 1px 0px rgba(255,255,255,0.8)`,
            },
          ]}>
          <Resplandor color={esGrua ? '#FF6B1A' : '#FFC233'} />
          <View style={styles.tarjetaArriba}>
            <Degrade
              nombre={esGrua ? 'fuego' : 'sol'}
              diagonal
              style={[styles.tarjetaIcono, { boxShadow: esGrua ? SOMBRAS.fuego : SOMBRAS.sol }]}>
              <s.Icon size={23} color={esGrua ? colors.white : colors.ink} strokeWidth={2.2} />
            </Degrade>
            <Text style={[styles.sello, { color: s.color.textoSuave }]}>{s.sello}</Text>
          </View>
          <View style={[styles.cuerpo, ancho && styles.cuerpoAncho]}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.tarjetaTitulo, { color: s.color.texto }]}>{s.titulo}</Text>
              <Text style={[styles.tarjetaTexto, { color: s.color.textoSuave }]}>{s.descripcion}</Text>
            </View>
            {esGrua ? (
              <GruaPlanchaIlustracion ancho={ancho ? 200 : 124} />
            ) : (
              <CamionetaIlustracion ancho={ancho ? 200 : 124} />
            )}
          </View>
          <Degrade
            nombre={esGrua ? 'fuego' : 'grafito'}
            style={[styles.cta, { boxShadow: esGrua ? SOMBRAS.fuego : SOMBRAS.grafito }]}>
            <Text style={styles.ctaTexto}>{activo ? s.cta : 'Muy pronto'}</Text>
            {activo ? <ArrowRight size={18} color={colors.white} strokeWidth={2.4} /> : null}
          </Degrade>
        </Degrade>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: FONDO_LIENZO },
  content: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  marcaIcono: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SOMBRAS.sol,
  },
  marcaTexto: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.4, color: colors.ink },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  ubicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.white,
    boxShadow: '0px 4px 12px -4px rgba(18,22,28,0.18)',
  },
  ubicacionTexto: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, flexShrink: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SOMBRAS.grafito,
  },
  avatarTexto: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.white },
  saludo: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  titulo: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.7, color: colors.ink },
  tituloAncho: { fontSize: 36, lineHeight: 40 },
  tituloAcento: { color: '#F0700F' },
  enCurso: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingLeft: 16, borderRadius: 20 },
  enCursoPunto: { width: 12, height: 12, borderRadius: 6 },
  enCursoTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  enCursoTexto: { fontFamily: fonts.regular, fontSize: 13, color: '#FFD9C2' },
  enCursoFlecha: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicios: { gap: 16 },
  serviciosAncho: { flexDirection: 'row', alignItems: 'stretch' },
  tarjeta: { gap: 12, padding: 18, borderRadius: 26, overflow: 'hidden' },
  tarjetaHover: { transform: [{ translateY: -3 }] },
  tarjetaArriba: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tarjetaIcono: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sello: {
    fontFamily: fonts.extrabold,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  cuerpo: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  cuerpoAncho: { flexDirection: 'column-reverse', alignItems: 'stretch', gap: 12 },
  tarjetaTitulo: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.4 },
  tarjetaTexto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  cta: {
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaTexto: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
  recientesHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  recientesTitulo: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  verTodo: { fontFamily: fonts.bold, fontSize: 13, color: '#993C1D' },
  reciente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    boxShadow: '0px 10px 24px -14px rgba(18,22,28,0.3)',
  },
  recienteIcono: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recienteTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  recienteDetalle: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  recientePrecio: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
