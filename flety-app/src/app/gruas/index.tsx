import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Clock, MapPinOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import { MENDOZA, type MapMarker } from '@/components/map/types';
import { MobileMapLayout } from '@/components/MobileMapLayout';
import { AddressField } from '@/components/pedido/AddressField';
import { Segmented } from '@/components/pedido/Choice';
import { PhotoPicker } from '@/components/pedido/PhotoPicker';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useVerificarTelefono } from '@/components/telefono/VerificarTelefono';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useIsWide } from '@/hooks/use-is-wide';
import { useRuta } from '@/hooks/use-ruta';
import { useAuth } from '@/lib/auth';
import { useFlotaAlrededor, useFlotaAmbiente } from '@/lib/flota-ambiente';
import type { FotoLocal } from '@/lib/pedido-draft';
import { formatARS } from '@/lib/pricing';
import type { GeoPoint } from '@/lib/types';
import { cotizar, solicitar, subirFotosGrua } from '@/modulos/gruas/api';
import { gruasDeEjemplo } from '@/modulos/gruas/demo';
import { ESTADOS_ACTIVOS } from '@/modulos/gruas/estados';
import { useCatalogoGruas, useMisSolicitudesGrua } from '@/modulos/gruas/hooks';
import type { ResultadoCotizar } from '@/modulos/gruas/tipos';
import { GruaOption } from '@/modulos/gruas/GruaOption';
import { OpcionesConMas } from '@/modulos/gruas/OpcionesConMas';
import { Desglose, G } from '@/modulos/gruas/ui';
import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors, fonts, radius } from '@/theme';

// Pedir una grúa o auxilio: dónde está el vehículo, a dónde va (si hace falta
// trasladarlo), qué vehículo es, qué le pasa y fotos (obligatorias). Muestra
// el precio de la grúa más cercana o deja elegir grúa/empresa, como Mudanzas.
type Modo = 'cercana' | 'elegir';

export default function PedirGrua() {
  const isWide = useIsWide();
  const { session, role } = useAuth();
  const ubicacion = useCurrentLocation();
  const { catalogo, error: errorCatalogo } = useCatalogoGruas();
  const { solicitudes } = useMisSolicitudesGrua();
  const activa = solicitudes.find((s) => ESTADOS_ACTIVOS.includes(s.estado));

  const [origen, setOrigen] = useState<GeoPoint | null>(null);
  const [destino, setDestino] = useState<GeoPoint | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [situaciones, setSituaciones] = useState<string[]>([]);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [patente, setPatente] = useState('');
  const [nota, setNota] = useState('');
  // "Otro": el cliente escribe cuál es (va en la nota para la grúa).
  const [tipoOtro, setTipoOtro] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [situacionOtra, setSituacionOtra] = useState('');
  const [modo, setModo] = useState<Modo>('cercana');
  const [elegido, setElegido] = useState<string | null>(null);
  const [verDesglose, setVerDesglose] = useState(false);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batería, rueda, combustible…: se resuelve en el lugar y el destino es opcional.
  const enLugar = !!catalogo?.motivos.find((m) => m.id === motivo)?.en_el_lugar;
  const { ruta } = useRuta([origen, destino]);
  const listos = !!origen && !!tipo && (!!destino || enLugar);
  const claveCotizacion = listos
    ? `${origen.lat},${origen.lng}|${destino ? `${destino.lat},${destino.lng}` : '-'}|${tipo}|${situaciones.join(',')}|${ruta?.distanciaKm ?? ''}`
    : null;
  const [cot, setCot] = useState<{ clave: string; res: ResultadoCotizar | null; error: string | null } | null>(null);
  const [refresco, setRefresco] = useState(0);

  useEffect(() => {
    if (!claveCotizacion || !origen || !tipo) return;
    let cancelled = false;
    const t = setTimeout(() => {
      cotizar({ origen, destino, distanciaKm: destino ? (ruta?.distanciaKm ?? null) : 0, tipo, situaciones })
        .then((res) => !cancelled && setCot({ clave: claveCotizacion, res, error: null }))
        .catch((e: Error) => !cancelled && setCot({ clave: claveCotizacion, res: null, error: e.message }));
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Las grúas se mueven: se vuelve a cotizar cada 30 s (refresco).
  }, [claveCotizacion, refresco, origen, destino, tipo, situaciones, ruta?.distanciaKm]);

  useEffect(() => {
    if (!claveCotizacion) return;
    const t = setInterval(() => setRefresco((r) => r + 1), 30_000);
    return () => clearInterval(t);
  }, [claveCotizacion]);

  const res = cot?.clave === claveCotizacion ? cot.res : null;
  const cotizando = !!claveCotizacion && cot?.clave !== claveCotizacion;
  const reales = res && res.cobertura ? res.opciones : [];
  // El superadmin ve grúas de ejemplo si todavía no hay reales (no se pueden pedir).
  const demo =
    !reales.length && role === 'superadmin' && res?.cobertura && origen ? gruasDeEjemplo(origen, res.km) : [];
  const opciones = reales.length ? reales : demo;
  const recomendada = reales[0] ?? null;
  const elegida = modo === 'elegir' ? (opciones.find((o) => o.prestador_id === elegido) ?? null) : null;
  const aPedir = modo === 'elegir' ? elegida : recomendada;

  const faltan = [
    !origen && 'dónde está el vehículo',
    !destino && !enLugar && 'a dónde lo llevamos',
    !tipo && 'el tipo de vehículo',
    tipo === 'otro' && !tipoOtro.trim() && 'qué vehículo es',
    !motivo && 'qué le pasa',
    motivo === 'otro' && !motivoOtro.trim() && 'contanos qué le pasa',
    situaciones.includes(OTRA) && !situacionOtra.trim() && 'cuál es la situación',
    !fotos.length && 'una foto del vehículo',
    listos && modo === 'elegir' && !elegida && 'qué grúa querés',
  ].filter(Boolean) as string[];
  const valido = !faltan.length && !!aPedir && !aPedir.demo;

  const verificacion = useVerificarTelefono();

  async function pedir() {
    if (!valido || !origen || !tipo || !motivo || !aPedir || !session) return;
    setEnviando(true);
    setError(null);
    try {
      const paths = await subirFotosGrua(session.user.id, fotos);
      const id = await solicitar({
        origen,
        destino,
        distanciaKm: destino ? (ruta?.distanciaKm ?? null) : 0,
        tipo,
        vehiculo: { marca: marca.trim(), modelo: modelo.trim(), patente: patente.trim().toUpperCase() },
        motivo,
        situaciones: situaciones.filter((x) => x !== OTRA),
        nota: [
          tipo === 'otro' && `Vehículo: ${tipoOtro.trim()}`,
          motivo === 'otro' && `Problema: ${motivoOtro.trim()}`,
          situaciones.includes(OTRA) && `Situación: ${situacionOtra.trim()}`,
          nota.trim(),
        ]
          .filter(Boolean)
          .join('. ')
          .slice(0, 500),
        precioMax: aPedir.total,
        fotos: paths,
        prestador: modo === 'elegir' ? aPedir.prestador_id : null,
      });
      router.replace({ pathname: '/gruas/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos pedir la grúa.');
    } finally {
      setEnviando(false);
    }
  }

  function tocarPedir() {
    setIntento(true);
    if (valido) verificacion.antesDe(pedir);
  }

  // Mapa: grúas dando vueltas (ilustrativo). Con opciones, cada una cerca de
  // su ubicación aproximada; mientras tanto, grúas de ambiente.
  const centro = origen ?? ubicacion.position ?? MENDOZA;
  const ambiente = useFlotaAmbiente(centro, !opciones.length, 'gruas');
  const alrededor = useFlotaAlrededor(
    opciones.map((o) => ({
      id: `g-${o.prestador_id}`,
      kind: 'flotaGrua' as const,
      position: { lat: o.lat, lng: o.lng },
      label: o.nombre,
    })),
    opciones.length > 0
  );
  const markers: MapMarker[] = [...ambiente, ...alrededor];
  if (!origen && ubicacion.status === 'located') markers.push({ id: 'yo', kind: 'user', position: ubicacion.position });
  if (origen) markers.push({ id: 'origen', kind: 'origen', position: origen, label: 'Vehículo' });
  if (destino) markers.push({ id: 'destino', kind: 'destino', position: destino, label: 'Destino' });

  const mapa = (
    <AppMap
      center={centro}
      markers={markers}
      line={ruta?.coords}
      fitToMarkers={markers.filter((m) => !m.id.startsWith('amb-')).length > 1}
      style={StyleSheet.absoluteFill}
    />
  );

  const contenido = (
    <View style={{ gap: 18 }}>
      {verificacion.modal}
      <View style={styles.cabecera}>
        <Degrade nombre="fuego" diagonal style={[styles.icono, { boxShadow: SOMBRAS.fuego }]}>
          <View style={{ zIndex: 1 }}>
            <IconoGrua size={22} color={colors.white} strokeWidth={2.2} />
          </View>
        </Degrade>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} accessibilityRole="header">
            Grúa o auxilio
          </Text>
          <Text style={styles.sub}>Elegí la grúa o pedí la más cercana. Ves el precio antes de confirmar.</Text>
        </View>
      </View>

      {activa ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/gruas/[id]', params: { id: activa.id } })}
          style={styles.activa}>
          <Text style={styles.activaTexto}>Tenés una grúa en curso · Ver</Text>
        </Pressable>
      ) : null}
      {errorCatalogo ? <Text style={styles.error}>{errorCatalogo}</Text> : null}

      <AddressField
        label="¿Dónde está el vehículo?"
        placeholder="Buscá la dirección o usá tu ubicación"
        value={origen}
        onChange={setOrigen}
        allowCurrentLocation
        tipo="origen"
      />
      <AddressField
        label={enLugar ? '¿A dónde lo llevamos? (opcional)' : '¿A dónde lo llevamos?'}
        placeholder="Taller, casa, concesionaria…"
        value={destino}
        onChange={setDestino}
      />

      <Seccion titulo="¿Qué le pasa?" falta={intento && !motivo}>
        {catalogo ? (
          <OpcionesConMas
            opciones={catalogo.motivos.filter((t) => t.activo !== false)}
            comunes={MOTIVOS_COMUNES}
            valor={motivo}
            onCambio={(v) => setMotivo(v)}
            otro={{ id: 'otro', texto: motivoOtro, onTexto: setMotivoOtro, placeholder: 'Contanos qué le pasa' }}
            falta={intento}
          />
        ) : (
          <ActivityIndicator color={G.acento} />
        )}
        {enLugar ? (
          <Text style={styles.ayuda}>
            Se resuelve en el lugar: si no hace falta trasladarlo, dejá el destino vacío.
          </Text>
        ) : null}
      </Seccion>

      <Seccion titulo="Tipo de vehículo" falta={intento && !tipo}>
        {catalogo ? (
          <OpcionesConMas
            opciones={catalogo.tipos.filter((t) => t.activo !== false)}
            comunes={TIPOS_COMUNES}
            valor={tipo}
            onCambio={(v) => setTipo(v)}
            otro={{ id: 'otro', texto: tipoOtro, onTexto: setTipoOtro, placeholder: '¿Qué vehículo es?' }}
            falta={intento}
          />
        ) : null}
      </Seccion>

      {catalogo?.situaciones.length ? (
        <Seccion titulo="¿Alguna de estas situaciones? (opcional)">
          <OpcionesConMas
            multiple
            opciones={[...catalogo.situaciones.filter((t) => t.activo !== false), { id: OTRA, nombre: 'Otra' }]}
            comunes={SITUACIONES_COMUNES}
            valor={situaciones}
            onCambio={(v) => setSituaciones((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))}
            otro={{
              id: OTRA,
              texto: situacionOtra,
              onTexto: setSituacionOtra,
              placeholder: 'Contanos la situación (ej.: está en un 2° piso de cochera)',
            }}
            falta={intento}
          />
        </Seccion>
      ) : null}

      <PhotoPicker
        fotos={fotos}
        onChange={setFotos}
        titulo="Fotos del vehículo"
        ayuda="Obligatorio: al menos una foto del vehículo o del lugar. La grúa la ve antes de aceptar."
        max={6}
        camara
        error={intento && !fotos.length ? 'Subí al menos una foto para pedir la grúa.' : null}
      />

      <Seccion titulo="Tu vehículo (opcional)">
        <View style={styles.filaCampos}>
          <Campo valor={marca} onCambio={setMarca} placeholder="Marca" />
          <Campo valor={modelo} onCambio={setModelo} placeholder="Modelo" />
        </View>
        <View style={styles.filaCampos}>
          <Campo valor={patente} onCambio={(v) => setPatente(v.toUpperCase())} placeholder="Patente" />
          <View style={{ flex: 1 }} />
        </View>
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Algo más que deba saber la grúa (piso, cochera, referencias…)"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          accessibilityLabel="Información adicional"
          style={[styles.campo, styles.nota]}
        />
      </Seccion>

      <View style={styles.precio}>
        {!listos ? (
          <Text style={styles.sub}>
            Completá dónde está, {enLugar ? '' : 'a dónde va '}y el tipo de vehículo para ver las grúas y el precio.
          </Text>
        ) : cotizando && !res ? (
          <View style={styles.filaCentro}>
            <ActivityIndicator color={G.acento} />
            <Text style={styles.sub}>Buscando grúas cerca…</Text>
          </View>
        ) : cot?.error ? (
          <Text style={styles.error}>{cot.error}</Text>
        ) : res && !res.cobertura ? (
          <View style={styles.filaCentro}>
            <MapPinOff size={20} color={G.textoSuave} />
            <Text style={[styles.sub, { flex: 1 }]}>
              Todavía no llegamos a esa zona.{' '}
              {catalogo
                ? `Hoy funciona en: ${catalogo.zonas
                    .filter((z) => z.activa)
                    .map((z) => z.ciudad)
                    .join(', ')}.`
                : ''}
            </Text>
          </View>
        ) : !opciones.length ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.sub}>Ahora no hay grúas disponibles cerca. Probá de nuevo en unos minutos.</Text>
            <Button title="Volver a buscar" variant="outline" onPress={() => setRefresco((r) => r + 1)} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Segmented
              options={[
                { value: 'cercana', label: 'La más cercana' },
                { value: 'elegir', label: `Elegir grúa · ${opciones.length}` },
              ]}
              value={modo}
              onChange={setModo}
            />
            {modo === 'cercana' ? (
              recomendada ? (
                <View style={{ gap: 10 }}>
                  <View style={styles.recomendada}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recoLabel}>Grúa más cercana</Text>
                      <Text style={styles.recoPrecio}>{formatARS(recomendada.total)}</Text>
                    </View>
                    <View style={styles.eta}>
                      <Clock size={14} color={G.texto} />
                      <Text style={styles.etaTexto}>~{recomendada.eta_min} min</Text>
                    </View>
                  </View>
                  <Text style={styles.sub}>
                    {reales.length === 1 ? '1 grúa disponible cerca' : `${reales.length} grúas disponibles cerca`}
                    {res && res.cobertura && res.km ? ` · ${res.km} km de traslado` : ''}. Si la más cercana no acepta,
                    se la ofrecemos a la siguiente sin cobrarte más.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: verDesglose }}
                    onPress={() => setVerDesglose((v) => !v)}
                    style={styles.desgloseBtn}>
                    <Text style={styles.desgloseTexto}>Ver detalle del precio</Text>
                    {verDesglose ? (
                      <ChevronUp size={16} color={colors.ink} />
                    ) : (
                      <ChevronDown size={16} color={colors.ink} />
                    )}
                  </Pressable>
                  {verDesglose ? <Desglose c={recomendada.cotizacion} /> : null}
                </View>
              ) : (
                <Text style={styles.sub}>Ahora no hay grúas reales disponibles cerca.</Text>
              )
            ) : (
              <View style={{ gap: 10 }} accessibilityRole="radiogroup">
                {demo.length ? (
                  <View style={styles.demo}>
                    <Text style={styles.demoTitulo}>Vista de ejemplo (solo la ves vos)</Text>
                    <Text style={styles.demoTexto}>
                      Todavía no hay grúas reales disponibles cerca. Así se va a ver para el cliente; a estas no se les
                      puede pedir.
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.sub}>
                  Disponibles ahora, con el precio de cada una. La que elijas tiene unos segundos para aceptar; si no,
                  se la ofrecemos a la más cercana.
                </Text>
                {opciones.map((o) => (
                  <GruaOption
                    key={o.prestador_id}
                    o={o}
                    catalogo={catalogo}
                    seleccionada={elegido === o.prestador_id}
                    onPress={() => setElegido(o.prestador_id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {intento && faltan.length ? <Text style={styles.error}>Falta: {faltan.join(', ')}.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={enviando || !!activa}
        onPress={tocarPedir}
        style={({ pressed }) => [
          (!valido || !!activa) && { opacity: 0.55 },
          pressed && valido && { transform: [{ scale: 0.99 }] },
        ]}>
        <Degrade nombre="fuego" style={[styles.boton, { boxShadow: SOMBRAS.fuego }]}>
          {enviando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.botonTexto}>
              {aPedir?.demo
                ? 'Grúa de ejemplo: no se puede pedir'
                : aPedir
                  ? `${modo === 'elegir' ? `Pedirle a ${aPedir.nombre}` : 'Pedir la más cercana'} · ${formatARS(aPedir.total)}`
                  : 'Pedir grúa'}
            </Text>
          )}
        </Degrade>
      </Pressable>
    </View>
  );

  if (isWide) return <ClienteShell active="inicio" panel={contenido} map={mapa} />;
  return (
    <MobileMapLayout map={mapa} mapHeight={260}>
      {contenido}
    </MobileMapLayout>
  );
}

// Opciones más comunes a la vista; el resto con "Ver más". "Otro" abre un campo
// para escribir cuál es.
const TIPOS_COMUNES = ['auto', 'camioneta', 'moto', 'utilitario'];
const MOTIVOS_COMUNES = ['no_arranca', 'bateria', 'pinchadura', 'choque', 'sin_combustible'];
const SITUACIONES_COMUNES = ['sin_llaves', 'ruedas_trabadas', 'volcado', 'subsuelo'];
const OTRA = 'otra';

function Seccion({ titulo, falta, children }: { titulo: string; falta?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.seccion, falta && { color: colors.danger }]}>
        {titulo}
        {falta ? ' · elegí una opción' : ''}
      </Text>
      {children}
    </View>
  );
}

function Campo({
  valor,
  onCambio,
  placeholder,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={onCambio}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      accessibilityLabel={placeholder}
      maxLength={40}
      style={[styles.campo, { flex: 1 }]}
    />
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ayuda: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: G.texto },
  demo: { gap: 2, padding: 12, borderRadius: radius.lg, backgroundColor: '#EEF1FF' },
  demoTitulo: { fontFamily: fonts.bold, fontSize: 13, color: '#2F3FA0' },
  demoTexto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: '#3D4A9C' },
  titulo: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  activa: { padding: 12, borderRadius: radius.md, backgroundColor: G.suave },
  activaTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto },
  seccion: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  filaCampos: { flexDirection: 'row', gap: 8 },
  campo: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  nota: { height: 72, paddingTop: 12, textAlignVertical: 'top' },
  precio: { gap: 8, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line },
  filaCentro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recomendada: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recoLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  recoPrecio: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: G.suave,
  },
  etaTexto: { fontFamily: fonts.bold, fontSize: 14, color: G.texto },
  desgloseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  desgloseTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  boton: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
