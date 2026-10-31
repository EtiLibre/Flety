import { Image } from 'expo-image';
import { Send, ShieldCheck, Star } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/empresa';
import { formatARS } from '@/lib/pricing';
import { canal } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { servicio } from '@/plataforma/servicios';
import { colors, fonts, radius } from '@/theme';

import { calificar, enviarMensaje, mensajes, miCalificacion, urlFoto, type MensajeGrua } from './api';
import { ESTADO_GRUA, PASOS_CLIENTE } from './estados';
import type { Cotizacion, EstadoSolicitud, GruaAsignada } from './tipos';

// Colores de Grúas (salen del registro de servicios de la plataforma).
export const G = servicio('gruas').color;

// ── Chips (una o varias opciones) ───────────────────────────────────────
export function Chips<T extends string>({
  opciones,
  valor,
  onCambio,
  multiple,
  oscuro,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T[] | T | null;
  onCambio: (v: T) => void;
  multiple?: boolean;
  oscuro?: boolean;
}) {
  const sel = (id: T) => (Array.isArray(valor) ? valor.includes(id) : valor === id);
  return (
    <View style={s.chips} role={multiple ? 'group' : 'radiogroup'}>
      {opciones.map((o) => {
        const on = sel(o.id);
        return (
          <Pressable
            key={o.id}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={on}
            onPress={() => onCambio(o.id)}
            style={[s.chip, oscuro ? s.chipOscuro : null, on && { backgroundColor: G.acento, borderColor: G.acento }]}>
            <Text
              style={[
                s.chipTexto,
                oscuro && { color: colors.dark.text },
                on && { color: colors.white, fontFamily: fonts.bold },
              ]}>
              {o.nombre}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Desglose del precio ─────────────────────────────────────────────────
export function Desglose({ c, oscuro, paraGruista }: { c: Cotizacion; oscuro?: boolean; paraGruista?: boolean }) {
  const filas: [string, number][] = [
    [`Base`, c.base],
    [
      `${c.km_cobrados} km × ${formatARS(c.por_km)}${c.km_incluidos ? ` (${c.km_incluidos} km incluidos)` : ''}`,
      c.por_km * c.km_cobrados,
    ],
  ];
  if (c.subtotal > c.base + c.por_km * c.km_cobrados)
    filas.push(['Ajuste a tarifa mínima', c.subtotal - c.base - c.por_km * c.km_cobrados]);
  if (c.nocturno) filas.push(['Recargo nocturno', c.nocturno]);
  if (c.fin_de_semana) filas.push(['Recargo fin de semana', c.fin_de_semana]);
  if (c.zona) filas.push(['Recargo de zona', c.zona]);
  if (c.adicionales) filas.push(['Adicionales', c.adicionales]);
  if (!paraGruista) filas.push(['Cargo de servicio de la plataforma', c.comision]);
  const texto = oscuro ? colors.dark.text : colors.ink;
  const muted = oscuro ? colors.dark.muted : colors.muted;
  return (
    <View style={{ gap: 6 }}>
      {filas.map(([l, v]) => (
        <View key={l} style={s.fila}>
          <Text style={[s.filaLabel, { color: muted }]}>{l}</Text>
          <Text style={[s.filaValor, { color: texto }]}>{formatARS(Math.round(v))}</Text>
        </View>
      ))}
      <View style={[s.fila, s.filaTotal, { borderTopColor: oscuro ? colors.dark.line : colors.lineSoft }]}>
        <Text style={[s.totalLabel, { color: texto }]}>{paraGruista ? 'Tu ganancia' : 'Total'}</Text>
        <Text style={[s.totalValor, { color: texto }]}>{formatARS(paraGruista ? c.tarifa_prestador : c.total)}</Text>
      </View>
    </View>
  );
}

// ── Línea de tiempo del cliente ─────────────────────────────────────────
export function LineaTiempo({ estado }: { estado: EstadoSolicitud }) {
  const idx = PASOS_CLIENTE.findIndex((p) => p.estados.includes(estado));
  return (
    <View style={s.linea} accessibilityLabel={`Estado: ${ESTADO_GRUA[estado].titulo}`}>
      {PASOS_CLIENTE.map((p, i) => (
        <View key={p.label} style={s.paso}>
          <View style={[s.pasoBarra, i <= idx && { backgroundColor: G.acento }]} />
          <Text style={[s.pasoTexto, i === idx && { color: colors.ink, fontFamily: fonts.bold }]} numberOfLines={2}>
            {p.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Gruista asignado (lo ve el cliente) ─────────────────────────────────
export function TarjetaGruista({ g, eta }: { g: GruaAsignada; eta?: number | null }) {
  const foto = urlFoto(g.foto);
  return (
    <View style={s.tarjeta}>
      <View style={s.tarjetaTop}>
        <View style={s.avatar}>
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Text style={s.avatarTexto}>{iniciales(g.nombre)}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={s.nombre}>{g.nombre}</Text>
          <Text style={s.muted} numberOfLines={1}>
            {g.empresa ? `${g.empresa} · ` : ''}
            {g.calificaciones ? `★ ${Number(g.estrellas).toFixed(1)} (${g.calificaciones})` : 'Nuevo en la plataforma'}
          </Text>
        </View>
        {eta != null ? (
          <View style={s.eta}>
            <Text style={s.etaNum}>{eta}</Text>
            <Text style={s.etaTxt}>min</Text>
          </View>
        ) : null}
      </View>
      <View style={s.unidad}>
        <ShieldCheck size={16} color={G.textoSuave} strokeWidth={2.2} />
        <Text style={s.unidadTexto} numberOfLines={1}>
          {[g.unidad.marca, g.unidad.modelo].filter(Boolean).join(' ') || 'Grúa'}
          {g.unidad.modalidad ? ` · ${g.unidad.modalidad}` : ''}
        </Text>
        {g.unidad.patente ? <Text style={s.patente}>{g.unidad.patente}</Text> : null}
      </View>
    </View>
  );
}

// ── Chat del servicio ───────────────────────────────────────────────────
export function ChatGrua({
  solicitudId,
  abierto,
  oscuro,
}: {
  solicitudId: string;
  abierto: boolean;
  oscuro?: boolean;
}) {
  const { session } = useAuth();
  const yo = session?.user.id ?? null;
  const [lista, setLista] = useState<MensajeGrua[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [desplegado, setDesplegado] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!desplegado) return;
    let cancelled = false;
    const cargar = () => mensajes(solicitudId).then((m) => !cancelled && setLista(m));
    cargar();
    const ch = supabase
      .channel(canal(`grua-chat-${solicitudId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'gruas', table: 'mensajes', filter: `solicitud_id=eq.${solicitudId}` },
        cargar
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [solicitudId, desplegado]);

  async function enviar() {
    if (!yo || !texto.trim()) return;
    setEnviando(true);
    try {
      await enviarMensaje(solicitudId, yo, texto);
      setTexto('');
      setLista(await mensajes(solicitudId));
    } catch {
      // El mensaje queda escrito para reintentar.
    } finally {
      setEnviando(false);
    }
  }

  const fg = oscuro ? colors.dark.text : colors.ink;
  if (!desplegado) {
    return (
      <Button
        title={abierto ? 'Abrir chat' : 'Ver chat'}
        variant="outline"
        onPress={() => setDesplegado(true)}
        style={oscuro ? { borderColor: colors.dark.line } : undefined}
      />
    );
  }
  return (
    <View style={[s.chat, oscuro && { backgroundColor: colors.dark.chip, borderColor: colors.dark.line }]}>
      <ScrollView ref={scroll} style={{ maxHeight: 240 }} onContentSizeChange={() => scroll.current?.scrollToEnd()}>
        {lista.length ? (
          lista.map((m) => (
            <View
              key={m.id}
              style={[
                s.burbuja,
                m.autor_id === yo ? s.mia : [s.suya, oscuro && { backgroundColor: colors.dark.surface }],
              ]}>
              <Text style={[s.burbujaTexto, { color: m.autor_id === yo ? colors.white : fg }]}>{m.texto}</Text>
            </View>
          ))
        ) : (
          <Text style={[s.muted, oscuro && { color: colors.dark.muted }]}>Todavía no hay mensajes.</Text>
        )}
      </ScrollView>
      {abierto ? (
        <View style={s.chatInput}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribí un mensaje"
            placeholderTextColor={oscuro ? colors.dark.muted : colors.muted}
            accessibilityLabel="Mensaje"
            onSubmitEditing={enviar}
            style={[s.chatCampo, { color: fg }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            onPress={enviar}
            disabled={enviando}
            style={s.chatEnviar}>
            {enviando ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Send size={16} color={colors.white} />
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ── Calificar al gruista ────────────────────────────────────────────────
export function CalificarGrua({ solicitudId, nombre }: { solicitudId: string; nombre: string }) {
  const [hecha, setHecha] = useState<{ id: string; c: { estrellas: number; comentario: string | null } | null } | null>(
    null
  );
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    miCalificacion(solicitudId).then((c) => !cancelled && setHecha({ id: solicitudId, c }));
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  if (!hecha || hecha.id !== solicitudId) return null;
  if (hecha.c) {
    return (
      <View style={s.tarjeta}>
        <Text style={s.nombre}>¡Gracias por calificar!</Text>
        <Estrellas valor={hecha.c.estrellas} />
      </View>
    );
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await calificar(solicitudId, estrellas, comentario);
      setHecha({ id: solicitudId, c: { estrellas, comentario } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu calificación.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={s.tarjeta}>
      <Text style={s.nombre}>¿Cómo te fue con {nombre}?</Text>
      <Estrellas valor={estrellas} onCambio={setEstrellas} />
      {estrellas ? (
        <TextInput
          value={comentario}
          onChangeText={setComentario}
          placeholder="Contanos algo más (opcional)"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          accessibilityLabel="Comentario"
          style={s.comentario}
        />
      ) : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button title="Enviar calificación" variant="dark" disabled={!estrellas} loading={enviando} onPress={enviar} />
    </View>
  );
}

function Estrellas({ valor, onCambio }: { valor: number; onCambio?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} role={onCambio ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = (
          <Star
            size={32}
            color={n <= valor ? '#E8A400' : '#C9CED5'}
            fill={n <= valor ? colors.accent : 'transparent'}
            strokeWidth={1.8}
          />
        );
        return onCambio ? (
          <Pressable
            key={n}
            role="radio"
            aria-checked={n === valor}
            accessibilityLabel={`${n} estrellas`}
            onPress={() => onCambio(n)}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const tono =
    estado === 'finalizada'
      ? { bg: '#DCFCE7', fg: '#166534' }
      : estado === 'sin_grua' || estado.startsWith('cancelada')
        ? { bg: '#F3F4F6', fg: '#4B5563' }
        : { bg: G.suave, fg: G.texto };
  return <Text style={[s.badge, { backgroundColor: tono.bg, color: tono.fg }]}>{ESTADO_GRUA[estado].corto}</Text>;
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipOscuro: { backgroundColor: colors.dark.chip, borderColor: colors.dark.line },
  chipTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  filaLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  filaValor: { fontFamily: fonts.semibold, fontSize: 13 },
  filaTotal: { borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  totalLabel: { fontFamily: fonts.bold, fontSize: 15 },
  totalValor: { fontFamily: fonts.display, fontSize: 18 },
  linea: { flexDirection: 'row', gap: 4 },
  paso: { flex: 1, gap: 6 },
  pasoBarra: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  pasoTexto: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  tarjeta: {
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  tarjetaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: G.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  nombre: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  eta: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: G.suave },
  etaNum: { fontFamily: fonts.display, fontSize: 20, color: G.texto },
  etaTxt: { fontFamily: fonts.semibold, fontSize: 11, color: G.textoSuave },
  unidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  unidadTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  patente: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  chat: {
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  burbuja: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginVertical: 3 },
  mia: { alignSelf: 'flex-end', backgroundColor: G.acento },
  suya: { alignSelf: 'flex-start', backgroundColor: colors.white },
  burbujaTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  chatInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatCampo: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  chatEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: G.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comentario: {
    minHeight: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
