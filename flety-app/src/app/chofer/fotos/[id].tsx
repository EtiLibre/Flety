import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePedidoEnVivo } from '@/hooks/use-pedido-en-vivo';
import { plural } from '@/lib/format';
import { TAMANO_LABEL, TIPO_LABEL } from '@/lib/types';
import { colors, fonts } from '@/theme';

const d = colors.dark;

// Fotos de la carga en grande (canvas "Chofer · fotos").
export default function FotosChofer() {
  const { id, i } = useLocalSearchParams<{ id: string; i?: string }>();
  const { pedido, fotos, notFound } = usePedidoEnVivo(id);
  const [index, setIndex] = useState(Number(i) || 0);
  const actual = fotos[Math.min(index, fotos.length - 1)];

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/chofer/panel'));

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar fotos" onPress={cerrar} style={styles.close}>
          <X size={22} color={d.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerText}>
          {fotos.length ? `Foto ${index + 1} de ${fotos.length}` : 'Fotos de la carga'}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.viewer}>
        {actual ? (
          <Image source={{ uri: actual }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
        ) : notFound ? (
          <Text style={styles.muted}>No encontramos este pedido.</Text>
        ) : pedido && !fotos.length ? (
          <Text style={styles.muted}>El cliente no subió fotos.</Text>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>

      {fotos.length > 1 ? (
        <>
          <View style={styles.dots} aria-hidden>
            {fotos.map((url, n) => (
              <View key={url} style={[styles.dot, n === index && styles.dotOn]} />
            ))}
          </View>
          <ScrollView horizontal contentContainerStyle={styles.thumbs} showsHorizontalScrollIndicator={false}>
            {fotos.map((url, n) => (
              <Pressable
                key={url}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${n + 1}`}
                aria-pressed={n === index}
                onPress={() => setIndex(n)}
                style={[styles.thumb, n === index && styles.thumbOn]}>
                <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {pedido ? (
        <View style={styles.info}>
          <Text style={styles.infoTitle}>
            {[
              TIPO_LABEL[pedido.tipo],
              pedido.tamano ? TAMANO_LABEL[pedido.tamano].titulo : null,
              pedido.ayudantes ? plural(pedido.ayudantes, 'ayudante', 'ayudantes') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.muted}>
            Fotos subidas por el cliente al crear el pedido. Usalas para saber qué vas a cargar.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0E12', paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  close: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { fontFamily: fonts.bold, fontSize: 15, color: d.text },
  viewer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A424D' },
  dotOn: { width: 20, backgroundColor: colors.accent },
  thumbs: { gap: 10 },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333B46',
    backgroundColor: d.chip,
  },
  thumbOn: { borderWidth: 2, borderColor: colors.accent },
  info: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: d.surface },
  infoTitle: { fontFamily: fonts.bold, fontSize: 15, color: d.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: d.muted },
});
