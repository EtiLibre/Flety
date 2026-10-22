import { MessageCircle, Send, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { enviarMensaje, mensajesDelPedido, ROL_LABEL, type Mensaje } from '@/lib/mensajes';
import { canal } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

type Tono = 'light' | 'dark';

const PALETA: Record<
  Tono,
  { bg: string; card: string; text: string; muted: string; line: string; mio: string; mioText: string; otro: string }
> = {
  light: {
    bg: '#F5F5F2',
    card: colors.white,
    text: colors.ink,
    muted: colors.muted,
    line: '#E8E8E3',
    mio: colors.ink,
    mioText: colors.white,
    otro: colors.white,
  },
  dark: {
    bg: colors.dark.bg,
    card: colors.dark.surface,
    text: colors.dark.text,
    muted: colors.dark.muted,
    line: colors.dark.line,
    mio: colors.accent,
    mioText: colors.ink,
    otro: colors.dark.chip,
  },
};

// Botón "Chat" + ventana del chat del pedido, en vivo (Supabase Realtime).
export function ChatPedido({
  orderId,
  titulo,
  abierto,
  tono = 'light',
}: {
  orderId: string;
  // A quién le escribís: "Martín", "el cliente"...
  titulo: string;
  // Se puede escribir (pedido asignado o en curso). Si no, se ve el historial.
  abierto: boolean;
  tono?: Tono;
}) {
  const [visible, setVisible] = useState(false);
  const p = PALETA[tono];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.boton,
          { backgroundColor: p.card, borderColor: p.line },
          pressed && { opacity: 0.8 },
        ]}>
        <MessageCircle size={18} color={p.text} strokeWidth={2.2} />
        <Text style={[styles.botonText, { color: p.text }]}>Chatear con {titulo}</Text>
      </Pressable>
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        {visible ? (
          <Ventana orderId={orderId} titulo={titulo} abierto={abierto} tono={tono} onClose={() => setVisible(false)} />
        ) : null}
      </Modal>
    </>
  );
}

function Ventana({
  orderId,
  titulo,
  abierto,
  tono,
  onClose,
}: {
  orderId: string;
  titulo: string;
  abierto: boolean;
  tono: Tono;
  onClose: () => void;
}) {
  const p = PALETA[tono];
  const { session } = useAuth();
  const yo = session?.user.id;
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    mensajesDelPedido(orderId).then((lista) => !cancelled && setMensajes(lista));
    const agregar = (m: Mensaje) =>
      setMensajes((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
    const channel = supabase
      .channel(canal(`chat-${orderId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `order_id=eq.${orderId}` },
        (payload) => agregar(payload.new as Mensaje)
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function enviar() {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    setError(null);
    try {
      const m = await enviarMensaje(orderId, t);
      setMensajes((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
    } catch (e) {
      setTexto(t);
      setError(e instanceof Error ? e.message : 'No se pudo enviar.');
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: p.card, borderBottomColor: p.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: p.text }]}>Chat con {titulo}</Text>
            <Text style={[styles.headerSub, { color: p.muted }]}>Solo lo ven las partes de este pedido</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar chat" onPress={onClose} style={styles.close}>
            <X size={22} color={p.text} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.lista}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {mensajes && !mensajes.length ? (
            <Text style={[styles.vacio, { color: p.muted }]}>
              Todavía no hay mensajes. Coordiná acá detalles del retiro, la entrega o la carga.
            </Text>
          ) : null}
          {(mensajes ?? []).map((m) => {
            const mio = m.autor_id === yo;
            return (
              <View key={m.id} style={[styles.burbujaWrap, mio ? styles.derecha : styles.izquierda]}>
                {!mio ? <Text style={[styles.autor, { color: p.muted }]}>{ROL_LABEL[m.autor_rol] ?? ''}</Text> : null}
                <View
                  style={[
                    styles.burbuja,
                    { backgroundColor: mio ? p.mio : p.otro, borderColor: p.line },
                    !mio && styles.burbujaOtro,
                  ]}>
                  <Text style={[styles.texto, { color: mio ? p.mioText : p.text }]}>{m.texto}</Text>
                  <Text style={[styles.hora, { color: mio ? p.mioText : p.muted }]}>
                    {hora.format(new Date(m.created_at))}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {abierto ? (
          <View style={[styles.inputRow, { backgroundColor: p.card, borderTopColor: p.line }]}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribí un mensaje…"
              placeholderTextColor={p.muted}
              accessibilityLabel="Mensaje"
              multiline
              maxLength={1000}
              onSubmitEditing={enviar}
              blurOnSubmit={false}
              style={[styles.input, { color: p.text, backgroundColor: p.bg }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              disabled={!texto.trim()}
              onPress={enviar}
              style={[styles.send, !texto.trim() && { opacity: 0.4 }]}>
              <Send size={20} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.cerrado, { color: p.muted, borderTopColor: p.line }]}>
            El chat se cerró porque el pedido terminó.
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  botonText: { fontFamily: fonts.bold, fontSize: 15 },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 18 },
  headerSub: { fontFamily: fonts.regular, fontSize: 12 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16, gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' },
  vacio: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 24 },
  burbujaWrap: { maxWidth: '82%', gap: 2 },
  derecha: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  izquierda: { alignSelf: 'flex-start' },
  autor: { fontFamily: fonts.semibold, fontSize: 11, paddingHorizontal: 4 },
  burbuja: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, gap: 2 },
  burbujaOtro: { borderWidth: 1 },
  texto: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  hora: { fontFamily: fonts.regular, fontSize: 10, opacity: 0.7, alignSelf: 'flex-end' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, paddingHorizontal: 16, paddingBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrado: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', padding: 14, borderTopWidth: 1 },
});
