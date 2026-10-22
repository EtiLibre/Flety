import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_FOTOS, type FotoLocal } from '@/lib/pedido-draft';
import { colors, fonts, radius } from '@/theme';

export function PhotoPicker({ fotos, onChange }: { fotos: FotoLocal[]; onChange: (fotos: FotoLocal[]) => void }) {
  const restantes = MAX_FOTOS - fotos.length;

  async function agregar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: restantes,
      quality: 0.6,
    });
    if (result.canceled) return;
    const nuevas: FotoLocal[] = result.assets.slice(0, restantes).map((asset, i) => ({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? `foto-${Date.now()}-${i}.jpg`,
      file: asset.file,
    }));
    onChange([...fotos, ...nuevas]);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Fotos de la carga</Text>
        <Text style={styles.count}>
          {fotos.length}/{MAX_FOTOS}
        </Text>
      </View>
      <Text style={styles.hint}>Opcional. La empresa y el chofer las ven para cotizar y preparar el viaje.</Text>
      <View style={styles.grid}>
        {fotos.map((foto, index) => (
          <View key={foto.uri} style={styles.thumb}>
            <Image
              source={{ uri: foto.uri }}
              style={styles.image}
              accessibilityLabel={`Foto ${index + 1} de la carga`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar foto ${index + 1}`}
              onPress={() => onChange(fotos.filter((f) => f.uri !== foto.uri))}
              hitSlop={8}
              style={styles.remove}>
              <X size={14} color={colors.white} strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {restantes > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos de la carga"
            onPress={agregar}
            style={styles.add}>
            <Camera size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  thumb: { width: 72, height: 72, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(18, 22, 28, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B9C0C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
