import { Phone, Share2 } from 'lucide-react-native';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Durante el viaje: compartir los datos con alguien de confianza y llamar al
// 911 (como en DiDi/Uber).
export function AccionesSeguridad({ texto }: { texto: string }) {
  async function compartir() {
    try {
      if (Platform.OS === 'web') {
        const nav = globalThis.navigator as Navigator | undefined;
        if (nav?.share) await nav.share({ title: 'Mi viaje en Flety', text: texto });
        else if (nav?.clipboard) await nav.clipboard.writeText(texto);
      } else {
        await Share.share({ message: texto });
      }
    } catch {
      // El usuario cerró el menú de compartir.
    }
  }

  return (
    <View style={styles.fila}>
      <Pressable accessibilityRole="button" onPress={compartir} style={styles.boton}>
        <Share2 size={18} color={colors.ink} strokeWidth={2.2} />
        <Text style={styles.texto}>Compartir viaje</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Llamar al 911"
        onPress={() => Linking.openURL('tel:911')}
        style={styles.boton}>
        <Phone size={18} color={colors.danger} strokeWidth={2.2} />
        <Text style={[styles.texto, { color: colors.danger }]}>Llamar al 911</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8 },
  boton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.white,
    boxShadow: '0px 4px 12px -6px rgba(18,22,28,0.25)',
  },
  texto: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
