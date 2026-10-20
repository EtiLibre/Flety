import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Megaphone, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { anuncioPara, registrarEventoAnuncio, type Anuncio, type Audiencia } from '@/lib/marketing';
import { colors, fonts } from '@/theme';

const visto = (id: string) => `flety:anuncio:${id}`;

function yaVisto(id: string) {
  try {
    return !!globalThis.localStorage?.getItem(visto(id));
  } catch {
    return false;
  }
}

function marcarVisto(id: string) {
  try {
    globalThis.localStorage?.setItem(visto(id), String(Date.now()));
  } catch {
    // sin almacenamiento: puede volver a aparecer, no pasa nada
  }
}

// Pop-up del anuncio vigente para esta audiencia (lo carga marketing desde el
// panel). Se muestra una sola vez por anuncio en cada dispositivo.
export function AnuncioPopup({ audiencia, demora = 1500 }: { audiencia: Audiencia; demora?: number }) {
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      anuncioPara(audiencia).then((a) => {
        if (cancelled || !a || yaVisto(a.id)) return;
        marcarVisto(a.id);
        registrarEventoAnuncio(a.id, 'vista');
        setAnuncio(a);
      });
    }, demora);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audiencia, demora]);

  if (!anuncio) return null;
  return <AnuncioModal anuncio={anuncio} onClose={() => setAnuncio(null)} />;
}

export function AnuncioModal({
  anuncio,
  onClose,
  preview,
}: {
  anuncio: Anuncio;
  onClose: () => void;
  preview?: boolean;
}) {
  function cerrar() {
    if (!preview) registrarEventoAnuncio(anuncio.id, 'cierre');
    onClose();
  }
  function abrir() {
    if (!anuncio.cta_url) return cerrar();
    if (!preview) registrarEventoAnuncio(anuncio.id, 'click');
    onClose();
    if (anuncio.cta_url.startsWith('/')) router.push(anuncio.cta_url as never);
    else Linking.openURL(anuncio.cta_url);
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={cerrar}>
      <Pressable style={styles.backdrop} onPress={cerrar} accessibilityLabel="Cerrar anuncio">
        <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal>
          {anuncio.imagen_url ? (
            <View style={styles.imagen}>
              <Image source={{ uri: anuncio.imagen_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ) : (
            <View style={[styles.imagen, styles.imagenVacia]}>
              <Megaphone size={52} color={colors.ink} strokeWidth={1.6} />
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={cerrar} style={styles.close}>
            <X size={18} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.body}>
            <Text style={styles.titulo} accessibilityRole="header">
              {anuncio.titulo}
            </Text>
            {anuncio.texto ? <Text style={styles.texto}>{anuncio.texto}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={abrir}
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
              <Text style={styles.ctaText}>{anuncio.cta_texto || 'Entendido'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,22,28,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35)',
  },
  imagen: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#F5F5F2' },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 22, gap: 10 },
  titulo: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4, color: colors.ink },
  texto: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  cta: {
    marginTop: 6,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
});
