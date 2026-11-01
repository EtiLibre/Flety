import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { fotosDeSolicitud } from './api';

// Fotos que subió el cliente del vehículo o del lugar (migración 0029). Las ven
// el cliente, la grúa a la que se le ofreció o que tomó el servicio y el admin.
export function FotosSolicitud({ solicitudId, oscuro }: { solicitudId: string; oscuro?: boolean }) {
  const [res, setRes] = useState<{ id: string; fotos: { path: string; url: string }[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fotosDeSolicitud(solicitudId)
      .then((fotos) => !cancelled && setRes({ id: solicitudId, fotos }))
      .catch(() => !cancelled && setRes({ id: solicitudId, fotos: [] }));
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  const fotos = res?.id === solicitudId ? res.fotos : [];
  if (!fotos.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.titulo, oscuro && { color: colors.dark.muted }]}>Fotos del vehículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {fotos.map((f, i) => (
          <Pressable
            key={f.path}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Ver foto ${i + 1} del vehículo`}
            onPress={() => Linking.openURL(f.url)}>
            <Image source={{ uri: f.url }} style={styles.foto} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  foto: { width: 84, height: 84, borderRadius: 14, backgroundColor: '#2A313B' },
});
