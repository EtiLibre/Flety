import { router, useLocalSearchParams } from 'expo-router';
import { Hammer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { colors, fonts } from '@/theme';

const TITULOS: Record<string, string> = {
  flete: 'Nuevo flete',
  mudanza: 'Nueva mudanza',
  larga_distancia: 'Larga distancia',
};

// Placeholder: el formulario real (origen/destino, tamaño, ayudantes, cuándo,
// fotos y elegir vehículo) es el próximo paso de desarrollo.
export default function NuevoPedido() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const title = (tipo && TITULOS[tipo]) || 'Nuevo pedido';

  return (
    <FormScreen
      title={title}
      footer={<Button title="Volver al inicio" variant="dark" onPress={() => router.back()} />}>
      <View style={styles.card}>
        <Hammer size={28} color={colors.ink} strokeWidth={1.8} />
        <Text style={styles.text}>
          Estamos construyendo este paso: dirección de retiro y entrega, qué vas a mover, ayudantes, cuándo, y la
          elección de vehículo con precio.
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.ink },
});
