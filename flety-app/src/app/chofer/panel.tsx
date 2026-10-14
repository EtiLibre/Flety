import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

// Placeholder: disponibilidad, solicitudes entrantes y viaje activo son un paso siguiente.
export default function PanelChofer() {
  const { nombre } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <BrandMark tone="dark" />
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.text}>
          La app del chofer (disponibilidad, pedidos entrantes y viaje activo) llega en el próximo paso.
        </Text>
      </View>
      <Button title="Cerrar sesión" variant="light" onPress={() => supabase.auth.signOut()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg, padding: 24, gap: 24 },
  body: { flex: 1, justifyContent: 'center', gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.6, color: colors.dark.text },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.dark.muted },
});
