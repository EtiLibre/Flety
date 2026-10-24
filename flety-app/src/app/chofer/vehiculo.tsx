import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiVehiculo } from '@/components/chofer/MiVehiculo';
import { useChofer } from '@/hooks/use-chofer';
import { useNavChofer } from '@/hooks/use-nav-chofer';
import { colors, fonts } from '@/theme';

const d = colors.dark;

// Mi vehículo (desde Cuenta): tipo, modelo, patente, color y fotos.
export default function VehiculoChofer() {
  const { chofer, loading, recargar } = useChofer();
  const ir = useNavChofer();
  const volver = () => (router.canGoBack() ? router.back() : ir('cuenta'));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={volver} style={styles.back}>
            <ChevronLeft size={22} color={d.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.titulo}>Mi vehículo</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : chofer ? (
          <MiVehiculo
            driverId={chofer.id}
            inicial={chofer.vehiculo}
            onGuardado={() => {
              recargar();
              volver();
            }}
          />
        ) : (
          <Text style={styles.texto}>Primero sumate a una empresa con tu código de invitación.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: d.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: d.text },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
});
