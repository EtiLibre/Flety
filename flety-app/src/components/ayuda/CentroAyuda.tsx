import { Bot, ChevronDown, ChevronUp, LifeBuoy, MessageSquareText, Send, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import {
  enviarConsulta,
  misConsultas,
  PREGUNTAS,
  responder,
  SUGERENCIAS,
  type Accion,
  type Consulta,
  type ContextoAyuda,
  type Destino,
  type Pregunta,
  type RolAyuda,
} from '@/lib/ayuda';
import { useAuth } from '@/lib/auth';
import { colors, fonts, radius } from '@/theme';
import { paleta, type Paleta, type Tema } from '@/theme/tema';

type Mensaje =
  | { id: number; de: 'yo'; texto: string }
  | { id: number; de: 'bot'; texto: string; acciones: Accion[]; relacionadas?: Pregunta[]; pregunta?: string };

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Ayuda (cliente, chofer y empresa): asistente que responde al instante con la
// base de preguntas frecuentes, las preguntas por tema y las consultas a soporte.
export function CentroAyuda({
  tema,
  rol,
  contexto,
  onNavegar,
}: {
  tema: Tema;
  rol: RolAyuda;
  contexto?: ContextoAyuda;
  onNavegar: (destino: Destino) => void;
}) {
  const p = paleta(tema);
  const { nombre } = useAuth();
  const [soporte, setSoporte] = useState<{ abierto: boolean; texto: string }>({ abierto: false, texto: '' });
  const [versionConsultas, setVersionConsultas] = useState(0);

  const navegar = (destino: Destino, pregunta?: string) => {
    if (destino === 'soporte') setSoporte({ abierto: true, texto: pregunta ?? '' });
    else onNavegar(destino);
  };

  return (
    <View style={{ gap: 14 }}>
      <Asistente p={p} rol={rol} contexto={contexto} nombre={nombre?.split(' ')[0] ?? null} onAccion={navegar} />
      <Frecuentes p={p} rol={rol} onAccion={navegar} />
      <MisConsultas p={p} version={versionConsultas} onNueva={() => setSoporte({ abierto: true, texto: '' })} />
      <FormSoporte
        p={p}
        abierto={soporte.abierto}
        textoInicial={soporte.texto}
        onClose={() => setSoporte({ abierto: false, texto: '' })}
        onEnviada={() => setVersionConsultas((v) => v + 1)}
      />
    </View>
  );
}

// ── Asistente ────────────────────────────────────────────────────────────
function Asistente({
  p,
  rol,
  contexto,
  nombre,
  onAccion,
}: {
  p: Paleta;
  rol: RolAyuda;
  contexto?: ContextoAyuda;
  nombre: string | null;
  onAccion: (destino: Destino, pregunta?: string) => void;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => [
    {
      id: 0,
      de: 'bot',
      texto: `¡Hola${nombre ? `, ${nombre}` : ''}! Soy el asistente de Flety. Escribime tu duda o elegí una de abajo.`,
      acciones: [],
    },
  ]);
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function preguntar(q: string) {
    const limpio = q.trim();
    if (!limpio || escribiendo) return;
    setTexto('');
    setMensajes((m) => [...m, { id: m.length, de: 'yo', texto: limpio }]);
    setEscribiendo(true);
    // Una pausa corta para que se lea como una conversación.
    timer.current = setTimeout(() => {
      const r = responder(limpio, rol, contexto);
      setMensajes((m) => [
        ...m,
        {
          id: m.length,
          de: 'bot',
          texto: r.texto,
          acciones: r.acciones,
          relacionadas: r.relacionadas,
          pregunta: r.sinRespuesta ? limpio : undefined,
        },
      ]);
      setEscribiendo(false);
    }, 450);
  }

  const soloSaludo = mensajes.length === 1;

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <View style={s.botHead}>
        <View style={s.botAvatar}>
          <Bot size={20} color={colors.ink} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.titulo, { color: p.text }]}>Asistente de Flety</Text>
          <View style={s.enLinea}>
            <View style={s.punto} />
            <Text style={[s.muted, { color: p.muted }]}>Responde al instante, las 24 h</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        style={s.chat}
        contentContainerStyle={s.chatContent}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        accessibilityLiveRegion="polite">
        {mensajes.map((m) =>
          m.de === 'yo' ? (
            <View key={m.id} style={[s.burbuja, s.yo]}>
              <Text style={s.yoText}>{m.texto}</Text>
            </View>
          ) : (
            <View key={m.id} style={{ gap: 8, alignItems: 'flex-start' }}>
              <View style={[s.burbuja, s.bot, { backgroundColor: p.chip }]}>
                <Text style={[s.botText, { color: p.text }]}>{m.texto}</Text>
              </View>
              {m.acciones.length ? (
                <View style={s.chips}>
                  {m.acciones.map((a) => (
                    <Pressable
                      key={a.destino}
                      accessibilityRole="button"
                      onPress={() => onAccion(a.destino, m.pregunta)}
                      style={({ pressed }) => [s.accion, pressed && { opacity: 0.85 }]}>
                      <Text style={s.accionText}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {m.relacionadas?.length ? (
                <View style={s.chips}>
                  {m.relacionadas.map((r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      onPress={() => preguntar(r.pregunta)}
                      style={[s.chip, { borderColor: p.cardBorder }]}>
                      <Text style={[s.chipText, { color: p.text }]}>{r.pregunta}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )
        )}
        {escribiendo ? (
          <View style={[s.burbuja, s.bot, { backgroundColor: p.chip }]}>
            <Text style={[s.botText, { color: p.muted }]}>Escribiendo…</Text>
          </View>
        ) : null}
      </ScrollView>

      {soloSaludo ? (
        <View style={s.chips}>
          {SUGERENCIAS[rol].map((q) => (
            <Pressable
              key={q}
              accessibilityRole="button"
              onPress={() => preguntar(q)}
              style={[s.chip, { borderColor: p.cardBorder }]}>
              <Text style={[s.chipText, { color: p.text }]}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[s.inputRow, { backgroundColor: p.input, borderColor: p.inputBorder }]}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí tu pregunta…"
          placeholderTextColor={p.muted}
          accessibilityLabel="Tu pregunta"
          onSubmitEditing={() => preguntar(texto)}
          returnKeyType="send"
          style={[s.input, { color: p.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar pregunta"
          disabled={!texto.trim() || escribiendo}
          onPress={() => preguntar(texto)}
          style={[s.enviar, (!texto.trim() || escribiendo) && { opacity: 0.4 }]}>
          <Send size={17} color={colors.ink} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Preguntas frecuentes por tema ────────────────────────────────────────
function Frecuentes({ p, rol, onAccion }: { p: Paleta; rol: RolAyuda; onAccion: (d: Destino) => void }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const preguntas = PREGUNTAS[rol];
  const categorias = [...new Set(preguntas.map((q) => q.categoria))];

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <Text style={[s.titulo, { color: p.text }]}>Preguntas frecuentes</Text>
      {categorias.map((cat) => (
        <View key={cat} style={{ gap: 2 }}>
          <Text style={[s.categoria, { color: p.muted }]}>{cat}</Text>
          {preguntas
            .filter((q) => q.categoria === cat)
            .map((q) => {
              const on = abierta === q.id;
              return (
                <View key={q.id} style={[s.faq, { borderBottomColor: p.line }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: on }}
                    onPress={() => setAbierta(on ? null : q.id)}
                    style={s.faqHead}>
                    <Text style={[s.faqPregunta, { color: p.text }]}>{q.pregunta}</Text>
                    {on ? <ChevronUp size={18} color={p.muted} /> : <ChevronDown size={18} color={p.muted} />}
                  </Pressable>
                  {on ? (
                    <View style={{ gap: 10, paddingBottom: 12 }}>
                      <Text style={[s.faqRespuesta, { color: p.muted }]}>{q.respuesta}</Text>
                      {q.acciones?.length ? (
                        <View style={s.chips}>
                          {q.acciones.map((a) => (
                            <Pressable
                              key={a.destino}
                              accessibilityRole="button"
                              onPress={() => onAccion(a.destino)}
                              style={s.accion}>
                              <Text style={s.accionText}>{a.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
        </View>
      ))}
    </View>
  );
}

// ── Consultas a soporte ──────────────────────────────────────────────────
const ESTADO: Record<Consulta['estado'], { label: string; bg: string; fg: string }> = {
  abierta: { label: 'Esperando respuesta', bg: '#FEF3C7', fg: '#92400E' },
  respondida: { label: 'Respondida', bg: '#DCFCE7', fg: '#166534' },
  cerrada: { label: 'Cerrada', bg: '#E5E7EB', fg: '#374151' },
};

function MisConsultas({ p, version, onNueva }: { p: Paleta; version: number; onNueva: () => void }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [res, setRes] = useState<{ clave: string; consultas: Consulta[]; error: string | null } | null>(null);
  const clave = `${userId}:${version}`;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    misConsultas(userId)
      .then((consultas) => !cancelled && setRes({ clave, consultas, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, consultas: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [userId, clave]);

  const actual = res?.clave === clave ? res : null;

  return (
    <View style={[s.card, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
      <View style={s.botHead}>
        <View style={[s.iconoSoporte, { backgroundColor: p.chip }]}>
          <LifeBuoy size={19} color={p.text} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.titulo, { color: p.text }]}>¿No encontraste lo que buscabas?</Text>
          <Text style={[s.muted, { color: p.muted }]}>Escribile al equipo de Flety y te respondemos acá.</Text>
        </View>
      </View>
      <Button
        title="Escribir a soporte"
        variant="dark"
        onPress={onNueva}
        icon={<MessageSquareText size={18} color={colors.white} />}
      />
      {userId && !actual ? <ActivityIndicator color={p.muted} /> : null}
      {actual?.consultas.length ? (
        <View style={{ gap: 10 }}>
          <Text style={[s.categoria, { color: p.muted }]}>Mis consultas</Text>
          {actual.consultas.map((c) => (
            <View key={c.id} style={[s.consulta, { borderColor: p.cardBorder }]}>
              <View style={s.consultaHead}>
                <Text style={[s.faqPregunta, { color: p.text, flex: 1 }]} numberOfLines={1}>
                  {c.asunto}
                </Text>
                <Text style={[s.badge, { backgroundColor: ESTADO[c.estado].bg, color: ESTADO[c.estado].fg }]}>
                  {ESTADO[c.estado].label}
                </Text>
              </View>
              <Text style={[s.muted, { color: p.muted }]} numberOfLines={3}>
                {c.mensaje}
              </Text>
              {c.respuesta ? (
                <View style={[s.respuesta, { backgroundColor: p.chip }]}>
                  <Text style={[s.respuestaTitulo, { color: p.text }]}>Respuesta de Flety</Text>
                  <Text style={[s.botText, { color: p.text }]}>{c.respuesta}</Text>
                </View>
              ) : null}
              <Text style={[s.fecha, { color: p.muted }]}>{fecha.format(new Date(c.created_at))}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FormSoporte({
  p,
  abierto,
  textoInicial,
  onClose,
  onEnviada,
}: {
  p: Paleta;
  abierto: boolean;
  textoInicial: string;
  onClose: () => void;
  onEnviada: () => void;
}) {
  return (
    <Modal visible={abierto} transparent animationType="fade" onRequestClose={onClose}>
      {abierto ? (
        <FormSoporteContenido p={p} textoInicial={textoInicial} onClose={onClose} onEnviada={onEnviada} />
      ) : null}
    </Modal>
  );
}

function FormSoporteContenido({
  p,
  textoInicial,
  onClose,
  onEnviada,
}: {
  p: Paleta;
  textoInicial: string;
  onClose: () => void;
  onEnviada: () => void;
}) {
  const { session, role } = useAuth();
  const [asunto, setAsunto] = useState(textoInicial.slice(0, 80));
  const [mensaje, setMensaje] = useState(textoInicial);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const valido = asunto.trim().length >= 3 && mensaje.trim().length >= 5;

  async function enviar() {
    if (!session) {
      setEstado({ ok: false, texto: 'En la vista de ejemplo no se envían consultas.' });
      return;
    }
    setEnviando(true);
    setEstado(null);
    try {
      await enviarConsulta(session.user.id, role, asunto, mensaje);
      setEstado({ ok: true, texto: '¡Listo! Te respondemos acá, en “Mis consultas”.' });
      onEnviada();
      setTimeout(onClose, 1400);
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos enviar tu consulta.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
      <Pressable style={[s.sheet, { backgroundColor: p.card }]} onPress={() => {}} accessibilityViewIsModal>
        <View style={s.sheetHead}>
          <Text style={[s.titulo, { color: p.text, fontSize: 18 }]}>Escribir a soporte</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8}>
            <X size={22} color={p.text} />
          </Pressable>
        </View>
        <Text style={[s.muted, { color: p.muted }]}>
          Contanos qué pasó con el mayor detalle posible (si es por un flete, decinos la fecha y la dirección).
        </Text>
        <Text style={[s.label, { color: p.muted }]}>Asunto</Text>
        <TextInput
          value={asunto}
          onChangeText={setAsunto}
          maxLength={120}
          placeholder="Ej.: No puedo cancelar mi flete"
          placeholderTextColor={p.muted}
          accessibilityLabel="Asunto"
          style={[s.campo, { backgroundColor: p.input, borderColor: p.inputBorder, color: p.text }]}
        />
        <Text style={[s.label, { color: p.muted }]}>Mensaje</Text>
        <TextInput
          value={mensaje}
          onChangeText={setMensaje}
          maxLength={2000}
          multiline
          placeholder="Contanos tu problema…"
          placeholderTextColor={p.muted}
          accessibilityLabel="Mensaje"
          style={[s.campo, s.area, { backgroundColor: p.input, borderColor: p.inputBorder, color: p.text }]}
        />
        {estado ? <Text style={[s.muted, { color: estado.ok ? p.ok : p.error }]}>{estado.texto}</Text> : null}
        <Button title="Enviar consulta" disabled={!valido} loading={enviando} onPress={enviar} />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 22, borderWidth: 1 },
  titulo: { fontFamily: fonts.bold, fontSize: 16 },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  botHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enLinea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  chat: { maxHeight: 380 },
  chatContent: { gap: 10, paddingVertical: 4 },
  burbuja: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  yo: { alignSelf: 'flex-end', backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  yoText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.white },
  bot: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  botText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },
  accion: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.accent },
  accionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    height: 52,
  },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.medium, fontSize: 15 },
  enviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoria: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 6 },
  faq: { borderBottomWidth: 1 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  faqPregunta: { flex: 1, fontFamily: fonts.semibold, fontSize: 14 },
  faqRespuesta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  iconoSoporte: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  consulta: { gap: 6, padding: 12, borderRadius: radius.md, borderWidth: 1 },
  consultaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  respuesta: { gap: 4, padding: 10, borderRadius: radius.md },
  respuestaTitulo: { fontFamily: fonts.bold, fontSize: 12 },
  fecha: { fontFamily: fonts.regular, fontSize: 11 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,22,28,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    gap: 10,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
  campo: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  area: { minHeight: 120, textAlignVertical: 'top' },
});
