import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/empresa';
import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { colors, fonts } from '@/theme';

// Avatar del cliente arriba a la derecha (lleva a Mi cuenta). Siempre a mano
// en las pantallas de pedir, en Mudanzas y en Grúas.
export function BotonPerfil({ style }: { style?: StyleProp<ViewStyle> }) {
  const { session, nombre } = useAuth();
  if (!session) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mi cuenta"
      onPress={() => router.navigate('/cliente/cuenta')}
      style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}>
      <Degrade nombre="grafito" style={styles.avatar}>
        <Text style={styles.texto}>{iniciales(nombre || 'Yo')}</Text>
      </Degrade>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    boxShadow: SOMBRAS.grafito,
  },
  texto: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
});
