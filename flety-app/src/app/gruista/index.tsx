import { useFocusEffect } from 'expo-router';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  KeyRound,
  Navigation,
  Tag,
  Truck,
  UserRound,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { AppMap } from '@/components/map/AppMap';
import type { LatLng, MapMarker } from '@/components/map/types';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { useCompartirUbicacion } from '@/hooks/use-compartir-ubicacion';
import { useRuta } from '@/hooks/use-ruta';
import { urlNavegacion } from '@/lib/chofer';
import { confirmar } from '@/lib/confirm';
import { formatARS } from '@/lib/pricing';
import {
  actualizarUbicacion,
  alta,
  avanzar,
  canjearInvitacion,
  cancelar,
  nombreDe,
  responderOferta,
  setDisponible,
  solicitud as cargarSolicitud,
  tarifasDe,
  type MiGruista,
} from '@/modulos/gruas/api';
import { ESTADO_GRUA, PASOS_GRUISTA, TIPO_DOCUMENTO } from '@/modulos/gruas/estados';
import { useCatalogoGruas, useMiGruista, useOfertasGruista, useServiciosGruista } from '@/modulos/gruas/hooks';
import { irGruista, type DestinoGruista } from '@/modulos/gruas/nav';
import { Campo, estilosGruista as eg, Tarjeta, Titulo } from '@/modulos/gruas/pantalla';
import type { Catalogo, Documento, Oferta, Solicitud, TipoDocumento } from '@/modulos/gruas/tipos';
import { ChatGrua, Chips, CuentaEspera, Desglose, G } from '@/modulos/gruas/ui';
import { IngresoPin } from '@/components/pin/PinViaje';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;

// Inicio de la app del gruista: alta, verificación y, ya aprobado, el panel
// para ponerse disponible, recibir pedidos y hacer el servicio paso a paso.
export default function InicioGruista() {
  const { gruista, cargando, error, recargar } = useMiGruista();
  useFocusEffect(recargar);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={G.acento} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centro}>
        <Text style={eg.error}>{error}</Text>
        <Button title="Reintentar" variant="grua" onPress={recargar} />
      </View>
    );
  }
  if (!gruista) {
    return (
      <PantallaTab titulo="Sumate con tu grúa" subtitulo="Recibí pedidos de auxilio cerca tuyo." tema="oscuro">
        <Alta onListo={recargar} />
      </PantallaTab>
    );
  }
  if (gruista.prestador.estado !== 'aprobado') {
    return (
      <PantallaTab titulo="Tu alta" subtitulo="Completá estos pasos para empezar a recibir pedidos." tema="oscuro">
        <Verificacion g={gruista} />
      </PantallaTab>
    );
  }
  return <Panel g={gruista} recargar={recargar} />;
}

// ── Alta ─────────────────────────────────────────────────────────────────
type ModoAlta = 'independiente' | 'empresa' | 'codigo';

const MODOS: { id: ModoAlta; titulo: string; texto: string; Icon: typeof Truck }[] = [
  { id: 'independiente', titulo: 'Gruista independiente', texto: 'Tenés tu grúa y ponés tus precios.', Icon: Truck },
  {
    id: 'empresa',
    titulo: 'Empresa de auxilio',
    texto: 'Gestionás varias grúas, tus gruistas y las tarifas.',
    Icon: Building2,
  },
  { id: 'codigo', titulo: 'Tengo un código', texto: 'Tu empresa te invitó a sumarte a su flota.', Icon: KeyRound },
];

function Alta({ onListo }: { onListo: () => void }) {
  const { catalogo } = useCatalogoGruas();
  const [modo, setModo] = useState<ModoAlta | null>(null);
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [cuit, setCuit] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zonas = (catalogo?.zonas ?? []).filter((z) => z.activa);
  const zonaElegida = zona ?? zonas[0]?.id ?? null;
  const telOk = telefono.replace(/\D/g, '').length >= 8;
  const listo =
    !!modo &&
    telOk &&
    (modo === 'codigo' ? codigo.trim().length >= 4 : !!zonaElegida) &&
    (modo !== 'empresa' || empresa.trim().length >= 2);

  async function enviar() {
    if (!modo || !listo) return;
    setEnviando(true);
    setError(null);
    try {
      if (modo === 'codigo') await canjearInvitacion(codigo.trim().toUpperCase(), telefono.trim());
      else
        await alta({
          tipo: modo,
          empresaNombre: empresa.trim(),
          cuit: cuit.trim(),
          zonaId: zonaElegida,
          telefono: telefono.trim(),
        });
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar el alta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 10 }} role="radiogroup">
        {MODOS.map((m) => {
          const on = modo === m.id;
          return (
            <Pressable
              key={m.id}
              role="radio"
              aria-checked={on}
              onPress={() => setModo(m.id)}
              style={[styles.modo, on && { borderColor: G.acento, backgroundColor: '#2A1A10' }]}>
              <View style={[styles.modoIcono, on && { backgroundColor: G.acento }]}>
                <m.Icon size={20} color={on ? colors.white : d.text} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={eg.fuerte}>{m.titulo}</Text>
                <Text style={eg.muted}>{m.texto}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {modo ? (
        <Tarjeta>
          {modo === 'empresa' ? (
            <View style={eg.fila}>
              <Campo label="Nombre de la empresa" value={empresa} onChangeText={setEmpresa} maxLength={80} />
              <Campo
                label="CUIT (opcional)"
                value={cuit}
                onChangeText={setCuit}
                keyboardType="number-pad"
                maxLength={13}
              />
            </View>
          ) : null}
          {modo === 'codigo' ? (
            <Campo
              label="Código de invitación"
              value={codigo}
              onChangeText={(v) => setCodigo(v.toUpperCase())}
              autoCapitalize="characters"
              placeholder="G123456"
              maxLength={12}
            />
          ) : null}
          <Campo
            label="Tu teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            placeholder="261 555 1234"
            maxLength={20}
            error={telefono && !telOk ? 'Revisá el número.' : null}
          />
          {modo !== 'codigo' ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Zona donde trabajás</Text>
              {zonas.length ? (
                <Chips
                  oscuro
                  opciones={zonas.map((z) => ({ id: z.id, nombre: `${z.ciudad}, ${z.provincia}` }))}
                  valor={zonaElegida}
                  onCambio={setZona}
                />
              ) : (
                <ActivityIndicator color={G.acento} style={{ alignSelf: 'flex-start' }} />
              )}
              <Text style={eg.muted}>Por ahora funcionamos en Gran Mendoza. Pronto sumamos más ciudades.</Text>
            </View>
          ) : null}
          {error ? <Text style={eg.error}>{error}</Text> : null}
          <Button
            title={modo === 'codigo' ? 'Unirme a la empresa' : 'Darme de alta'}
            variant="grua"
            loading={enviando}
            disabled={!listo}
            onPress={enviar}
          />
        </Tarjeta>
      ) : null}
    </View>
  );
}

// ── Verificación (alta pendiente) ────────────────────────────────────────
function useTieneTarifas(g: MiGruista) {
  const gestiona = !g.prestador.empresa_id || g.esDueno;
  const dueno = { empresa_id: g.empresa?.id ?? null, prestador_id: g.empresa ? null : g.prestador.id };
  const clave = `${dueno.empresa_id}:${dueno.prestador_id}`;
  const [res, setRes] = useState<{ clave: string; tiene: boolean } | null>(null);
  useEffect(() => {
    if (!gestiona) return;
    let cancelled = false;
    const [empresa_id, prestador_id] = clave.split(':').map((x) => (x === 'null' ? null : x));
    tarifasDe({ empresa_id, prestador_id })
      .then((t) => !cancelled && setRes({ clave, tiene: t.tarifas.length > 0 }))
      .catch(() => !cancelled && setRes({ clave, tiene: false }));
    return () => {
      cancelled = true;
    };
  }, [clave, gestiona]);
  return { gestiona, tiene: res?.clave === clave ? res.tiene : null };
}

function docsObligatoriosOk(docs: Documento[]) {
  return (Object.keys(TIPO_DOCUMENTO) as TipoDocumento[])
    .filter((t) => TIPO_DOCUMENTO[t].obligatorio)
    .every((t) => docs.some((x) => x.tipo === t && x.estado !== 'rechazado'));
}

function Verificacion({ g }: { g: MiGruista }) {
  const p = g.prestador;
  const { gestiona, tiene } = useTieneTarifas(g);
  const pasos: { titulo: string; detalle: string; ok: boolean | null; destino: DestinoGruista; Icon: typeof Truck }[] =
    [
      {
        titulo: 'Tu grúa',
        detalle: g.unidad
          ? `${g.unidad.patente} · ${[g.unidad.marca, g.unidad.modelo].filter(Boolean).join(' ')}`
          : 'Patente, modalidad y qué vehículos podés llevar',
        ok: !!g.unidad,
        destino: 'unidad',
        Icon: Truck,
      },
      {
        titulo: 'Documentos',
        detalle: 'Licencia profesional y seguro de la grúa',
        ok: docsObligatoriosOk(g.documentos),
        destino: 'documentos',
        Icon: FileText,
      },
    ];
  if (gestiona) {
    pasos.push({
      titulo: g.esDueno ? 'Tarifas de la empresa' : 'Tus tarifas',
      detalle: 'Salida, precio por km y adicionales',
      ok: tiene,
      destino: 'tarifas',
      Icon: Tag,
    });
  }
  pasos.push({
    titulo: 'Foto de perfil',
    detalle: 'La ve el cliente cuando le asignan tu grúa',
    ok: !!p.foto,
    destino: 'cuenta',
    Icon: UserRound,
  });

  const estado =
    p.estado === 'pendiente'
      ? {
          titulo: 'Estamos revisando tu alta',
          texto: 'Completá lo que falta. Te avisamos acá cuando esté aprobada.',
          color: G.acento,
        }
      : p.estado === 'rechazado'
        ? {
            titulo: 'No pudimos aprobar tu alta',
            texto: p.motivo ?? 'Revisá tus datos y documentos, o escribinos desde Ayuda.',
            color: '#FF8A80',
          }
        : {
            titulo: 'Tu cuenta está suspendida',
            texto: p.motivo ?? 'Escribinos desde Ayuda para revisarlo.',
            color: '#FF8A80',
          };

  return (
    <View style={{ gap: 14 }}>
      <Tarjeta style={{ borderColor: estado.color }}>
        <Text style={[eg.fuerte, { color: estado.color }]}>{estado.titulo}</Text>
        <Text style={eg.muted}>{estado.texto}</Text>
        {g.empresa ? (
          <Text style={eg.muted}>
            {g.esDueno ? 'Tu empresa' : 'Empresa'}: {g.empresa.nombre}
            {g.empresa.estado !== 'aprobada' ? ' (en revisión)' : ''}
          </Text>
        ) : null}
      </Tarjeta>

      <View style={{ gap: 10 }}>
        {pasos.map((x) => (
          <Fila key={x.titulo} {...x} onPress={() => irGruista(x.destino)} />
        ))}
        {g.esDueno ? (
          <Fila
            titulo="Tu flota"
            detalle="Invitá a tus gruistas con un código"
            ok={null}
            Icon={Users}
            onPress={() => irGruista('flota')}
          />
        ) : null}
      </View>
    </View>
  );
}

function Fila({
  titulo,
  detalle,
  ok,
  Icon,
  onPress,
}: {
  titulo: string;
  detalle: string;
  ok: boolean | null;
  Icon: typeof Truck;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed && { opacity: 0.8 }]}>
      <View style={styles.filaIcono}>
        <Icon size={18} color={d.text} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={eg.fuerte}>{titulo}</Text>
        <Text style={eg.muted} numberOfLines={2}>
          {detalle}
        </Text>
      </View>
      {ok === true ? (
        <CheckCircle2 size={20} color="#4ADE80" />
      ) : ok === false ? (
        <Circle size={20} color={d.muted} />
      ) : null}
      <ChevronRight size={18} color={d.muted} />
    </Pressable>
  );
}

// ── Panel (gruista aprobado) ─────────────────────────────────────────────
function docsVencidos(docs: Documento[]) {
  const hoy = new Date().toISOString().slice(0, 10);
  return docs.filter((x) => TIPO_DOCUMENTO[x.tipo].obligatorio && x.vence && x.vence < hoy);
}

function gananciaDeHoy(servicios: Solicitud[]) {
  const hoy = new Date().toDateString();
  const deHoy = servicios.filter(
    (s) => s.estado === 'finalizada' && s.finalizada_at && new Date(s.finalizada_at).toDateString() === hoy
  );
  return { cantidad: deHoy.length, total: deHoy.reduce((t, s) => t + (s.precio_prestador ?? 0), 0) };
}

function Panel({ g, recargar }: { g: MiGruista; recargar: () => void }) {
  const p = g.prestador;
  const { catalogo } = useCatalogoGruas();
  const { activo: servicio, servicios, recargar: recargarServicios } = useServiciosGruista(p.id);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disponible = p.disponible;

  const enviar = useCallback((pos: LatLng) => {
    actualizarUbicacion(pos.lat, pos.lng);
  }, []);
  const { estado: gps, posicion } = useCompartirUbicacion(p.id, disponible || !!servicio, enviar);
  const { ofertas, recargar: recargarOfertas } = useOfertasGruista(p.id, disponible && !servicio);
  const vencidos = docsVencidos(g.documentos);
  const hoy = gananciaDeHoy(servicios);

  async function cambiarDisponible(v: boolean) {
    setCambiando(true);
    setError(null);
    try {
      await setDisponible(p.id, v);
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cambiar tu disponibilidad.');
    } finally {
      setCambiando(false);
    }
  }

  return (
    <PantallaTab
      titulo={servicio ? 'Servicio en curso' : 'Grúas'}
      subtitulo={g.empresa ? g.empresa.nombre : 'Gruista independiente'}
      tema="oscuro">
      {servicio ? (
        <ServicioActual s={servicio} posicion={posicion} catalogo={catalogo} onCambio={recargarServicios} />
      ) : (
        <>
          <Tarjeta style={disponible ? { borderColor: G.acento } : undefined}>
            <View style={styles.dispFila}>
              <View style={[styles.dispPunto, { backgroundColor: disponible ? '#4ADE80' : d.muted }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.dispTitulo}>{disponible ? 'Disponible' : 'No disponible'}</Text>
                <Text style={eg.muted}>
                  {disponible ? 'Te llegan pedidos de grúa cerca tuyo.' : 'Activá para empezar a recibir pedidos.'}
                </Text>
              </View>
              {cambiando ? (
                <ActivityIndicator color={G.acento} />
              ) : (
                <Switch
                  accessibilityLabel="Disponible"
                  value={disponible}
                  onValueChange={cambiarDisponible}
                  trackColor={{ true: G.acento, false: d.line }}
                  thumbColor={colors.white}
                />
              )}
            </View>
            {disponible && gps === 'denegado' ? (
              <Text style={eg.error}>Sin permiso de ubicación no te podemos ofrecer pedidos. Activalo y volvé.</Text>
            ) : null}
            {disponible && gps === 'activo' ? <Esperando /> : null}
            {error ? <Text style={eg.error}>{error}</Text> : null}
          </Tarjeta>

          {vencidos.length ? (
            <Pressable accessibilityRole="button" onPress={() => irGruista('documentos')} style={styles.alerta}>
              <Text style={styles.alertaTexto}>
                Venció: {vencidos.map((x) => TIPO_DOCUMENTO[x.tipo].titulo).join(', ')}. Cargá la renovación para seguir
                recibiendo pedidos.
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.resumen}>
            <View style={styles.dato}>
              <Text style={styles.datoValor}>{hoy.cantidad}</Text>
              <Text style={eg.muted}>servicios hoy</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.dato}>
              <Text style={styles.datoValor}>{formatARS(hoy.total)}</Text>
              <Text style={eg.muted}>ganado hoy</Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Fila
              titulo="Mi grúa"
              detalle={
                g.unidad
                  ? `${g.unidad.patente} · ${nombreDe(catalogo?.modalidades ?? [], g.unidad.modalidad)}`
                  : 'Cargala para recibir pedidos'
              }
              ok={!!g.unidad}
              Icon={Truck}
              onPress={() => irGruista('unidad')}
            />
            {!g.prestador.empresa_id || g.esDueno ? (
              <Fila
                titulo={g.esDueno ? 'Tarifas de la empresa' : 'Mis tarifas'}
                detalle="Lo que cobrás por salida, km y adicionales"
                ok={null}
                Icon={Tag}
                onPress={() => irGruista('tarifas')}
              />
            ) : null}
            {g.esDueno ? (
              <Fila
                titulo="Mi flota"
                detalle="Tus gruistas y códigos de invitación"
                ok={null}
                Icon={Users}
                onPress={() => irGruista('flota')}
              />
            ) : null}
          </View>
        </>
      )}

      {ofertas[0] && !servicio ? (
        <OfertaEntrante
          key={ofertas[0].id}
          o={ofertas[0]}
          catalogo={catalogo}
          onRespondida={() => {
            recargarOfertas();
            recargarServicios();
          }}
        />
      ) : null}
    </PantallaTab>
  );
}

function Esperando() {
  return (
    <View style={styles.esperando}>
      <ActivityIndicator color={G.acento} size="small" />
      <Text style={eg.muted}>Esperando pedidos…</Text>
    </View>
  );
}

// ── Pedido entrante ──────────────────────────────────────────────────────
function pitido() {
  if (Platform.OS !== 'web') return;
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Sin audio: alcanza con el aviso visual.
  }
}

function OfertaEntrante({
  o,
  catalogo,
  onRespondida,
}: {
  o: Oferta;
  catalogo: Catalogo | null;
  onRespondida: () => void;
}) {
  const [s, setS] = useState<Solicitud | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [accion, setAccion] = useState<'acepta' | 'rechaza' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const venceRef = useRef(new Date(o.vence_at).getTime());

  useEffect(() => {
    let cancelled = false;
    cargarSolicitud(o.solicitud_id).then((x) => !cancelled && setS(x));
    Vibration.vibrate([0, 400, 200, 400]);
    pitido();
    return () => {
      cancelled = true;
    };
  }, [o.solicitud_id]);

  useEffect(() => {
    const tick = () => setRestante(Math.max(0, Math.round((venceRef.current - Date.now()) / 1000)));
    const t = setInterval(tick, 500);
    const primero = setTimeout(tick, 0);
    return () => {
      clearInterval(t);
      clearTimeout(primero);
    };
  }, []);

  useEffect(() => {
    if (restante === 0 && !accion) onRespondida();
  }, [restante, accion, onRespondida]);

  async function responder(acepta: boolean) {
    setAccion(acepta ? 'acepta' : 'rechaza');
    setError(null);
    try {
      await responderOferta(o.id, acepta);
      onRespondida();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos responder.');
      setAccion(null);
    }
  }

  const situaciones = (s?.situaciones ?? []).map((x) => nombreDe(catalogo?.situaciones ?? [], x));
  const vehiculo = s
    ? [nombreDe(catalogo?.tipos ?? [], s.tipo_vehiculo), s.vehiculo.marca, s.vehiculo.modelo]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Modal transparent animationType="slide" visible onRequestClose={() => responder(false)}>
      <View style={styles.ofertaFondo}>
        <View style={styles.oferta} role="alertdialog" aria-label="Nuevo pedido de grúa">
          <View style={styles.ofertaTop}>
            <Text style={styles.ofertaEtiqueta}>Nuevo pedido</Text>
            {restante != null ? (
              <View style={styles.contador}>
                <Text style={styles.contadorNum}>{restante}</Text>
                <Text style={styles.contadorTxt}>seg</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.ofertaPrecio}>{formatARS(o.precio_prestador)}</Text>
          <Text style={eg.muted}>
            Tu ganancia · a {o.distancia_km.toFixed(1)} km (~{o.eta_min} min) · traslado {o.cotizacion.km} km
          </Text>
          {s ? (
            <View style={{ gap: 8 }}>
              <Linea label="Vehículo" valor={vehiculo} />
              <Linea label="Retiro" valor={s.origen.direccion ?? 'Ver en el mapa'} />
              <Linea label="Destino" valor={s.destino?.direccion ?? '—'} />
              <Linea label="Motivo" valor={nombreDe(catalogo?.motivos ?? [], s.motivo)} />
              {situaciones.length ? <Linea label="Situación" valor={situaciones.join(', ')} /> : null}
              {s.nota ? <Linea label="Nota" valor={s.nota} /> : null}
            </View>
          ) : (
            <ActivityIndicator color={G.acento} style={{ alignSelf: 'flex-start' }} />
          )}
          {error ? <Text style={eg.error}>{error}</Text> : null}
          <Button
            title="Aceptar pedido"
            variant="grua"
            loading={accion === 'acepta'}
            disabled={!!accion}
            onPress={() => responder(true)}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!!accion}
            onPress={() => responder(false)}
            style={styles.rechazar}>
            <Text style={styles.rechazarTexto}>{accion === 'rechaza' ? 'Rechazando…' : 'Rechazar'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Linea({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.lineaLabel}>{label}</Text>
      <Text style={styles.lineaValor}>{valor || '—'}</Text>
    </View>
  );
}

// ── Servicio en curso ────────────────────────────────────────────────────
function ServicioActual({
  s,
  posicion,
  catalogo,
  onCambio,
}: {
  s: Solicitud;
  posicion: LatLng | null;
  catalogo: Catalogo | null;
  onCambio: () => void;
}) {
  const paso = PASOS_GRUISTA[s.estado];
  const objetivo = paso?.destino === 'destino' && s.destino ? s.destino : s.origen;
  const haciaOrigen = paso?.destino === 'origen';
  const { ruta } = useRuta(haciaOrigen && posicion ? [posicion, s.origen] : [s.origen, s.destino]);
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pidiendoPin, setPidiendoPin] = useState(false);

  async function ejecutar(nombre: string, fn: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar la acción.');
    } finally {
      setAccion(null);
    }
  }

  async function onCancelar() {
    const ok = await confirmar('¿No podés hacer el servicio? Lo liberamos y buscamos otra grúa para el cliente.');
    if (ok) ejecutar('cancelar', () => cancelar(s.id, 'El gruista no puede realizar el servicio'));
  }

  const markers: MapMarker[] = [{ id: 'origen', kind: 'origen', position: s.origen, label: 'Vehículo' }];
  if (s.destino) markers.push({ id: 'destino', kind: 'destino', position: s.destino, label: 'Destino' });
  if (posicion) markers.push({ id: 'yo', kind: 'grua', position: posicion, label: 'Vos' });
  const situaciones = s.situaciones.map((x) => nombreDe(catalogo?.situaciones ?? [], x));

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.mapa}>
        <AppMap
          center={posicion ?? s.origen}
          markers={markers}
          line={ruta?.coords}
          fitToMarkers
          tone="dark"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {s.estado === 'en_origen' && s.en_origen_at ? <CuentaEspera desde={s.en_origen_at} oscuro /> : null}
      <IngresoPin
        visible={pidiendoPin}
        grua
        titulo="PIN para empezar el traslado"
        onCancelar={() => setPidiendoPin(false)}
        onConfirmar={async (pin) => {
          await avanzar(s.id, 'trasladando', pin);
          setPidiendoPin(false);
          onCambio();
        }}
      />
      <Tarjeta>
        <Text style={[styles.dispTitulo, { color: G.acento }]}>{ESTADO_GRUA[s.estado].titulo}</Text>
        <Linea
          label="Vehículo"
          valor={[
            nombreDe(catalogo?.tipos ?? [], s.tipo_vehiculo),
            s.vehiculo.marca,
            s.vehiculo.modelo,
            s.vehiculo.color,
            s.vehiculo.patente,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <Linea label="Retiro" valor={s.origen.direccion ?? '—'} />
        <Linea label="Destino" valor={s.destino?.direccion ?? '—'} />
        {situaciones.length ? <Linea label="Situación" valor={situaciones.join(', ')} /> : null}
        {s.nota ? <Linea label="Nota" valor={s.nota} /> : null}
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(urlNavegacion(objetivo))}
          style={styles.navegar}>
          <Navigation size={18} color={G.acento} strokeWidth={2.4} />
          <Text style={styles.navegarTexto}>
            Cómo llegar {haciaOrigen ? 'al vehículo' : 'al destino'} (Google Maps)
          </Text>
        </Pressable>
      </Tarjeta>

      {error ? <Text style={eg.error}>{error}</Text> : null}
      {paso ? (
        <Button
          title={paso.boton}
          variant="grua"
          loading={accion === 'avanzar'}
          disabled={!!accion}
          onPress={() =>
            paso.hacia === 'trasladando' ? setPidiendoPin(true) : ejecutar('avanzar', () => avanzar(s.id, paso.hacia))
          }
          style={{ height: 60 }}
        />
      ) : null}

      <ChatGrua solicitudId={s.id} abierto oscuro />

      {s.cotizacion ? (
        <Tarjeta>
          <Titulo>Lo que cobrás</Titulo>
          <Desglose c={s.cotizacion} oscuro paraGruista />
        </Tarjeta>
      ) : null}

      {s.estado === 'asignada' || s.estado === 'en_camino' ? (
        <Button
          title="No puedo hacer este servicio"
          variant="danger"
          loading={accion === 'cancelar'}
          onPress={onCancelar}
        />
      ) : null}
      <View style={styles.verificado}>
        <BadgeCheck size={16} color={d.muted} />
        <Text style={eg.muted}>El cliente te ve en el mapa mientras dure el servicio.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: d.bg },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  modo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: d.line,
    backgroundColor: d.surface,
  },
  modoIcono: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: d.chip,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.surface,
  },
  filaIcono: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: d.chip,
  },
  dispFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dispPunto: { width: 12, height: 12, borderRadius: 6 },
  dispTitulo: { fontFamily: fonts.display, fontSize: 22, color: d.text },
  esperando: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alerta: { padding: 14, borderRadius: radius.lg, backgroundColor: '#3A1D1D', borderWidth: 1, borderColor: '#7F2A2A' },
  alertaTexto: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: '#FFB4AB' },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.surface,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  datoValor: { fontFamily: fonts.display, fontSize: 20, color: d.text },
  sep: { width: 1, height: 30, backgroundColor: d.line },
  ofertaFondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  oferta: {
    gap: 12,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: d.surface,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  ofertaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ofertaEtiqueta: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: G.acento,
  },
  ofertaPrecio: { fontFamily: fonts.display, fontSize: 38, letterSpacing: -1, color: d.text },
  contador: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: G.acento,
  },
  contadorNum: { fontFamily: fonts.display, fontSize: 18, color: colors.white },
  contadorTxt: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  rechazar: { alignItems: 'center', paddingVertical: 12 },
  rechazarTexto: { fontFamily: fonts.semibold, fontSize: 15, color: d.muted },
  linea: { flexDirection: 'row', gap: 12 },
  lineaLabel: { width: 82, fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  lineaValor: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: d.text },
  mapa: { height: 240, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: d.surface },
  navegar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  navegarTexto: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: G.acento },
  verificado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
