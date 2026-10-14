import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

const PANEL_WEB = 'https://flety-nine.vercel.app';

// Empresas, superadmin y contabilidad siguen usando el panel web actual hasta
// que se rediseñe (canvas "Empresa · panel web").
export default function PanelEmpresa() {
  const { nombre, role } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <BrandMark />
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.text}>
          {role === 'empresa'
            ? 'Por ahora la cola de pedidos, tu flota y la asignación de choferes se manejan desde el panel web.'
            : 'Por ahora la administración se hace desde el panel web.'}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button title="Abrir panel web" variant="dark" onPress={() => WebBrowser.openBrowserAsync(PANEL_WEB)} />
        <Button title="Cerrar sesión" variant="outline" onPress={() => supabase.auth.signOut()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white, padding: 24, gap: 24 },
  body: { flex: 1, justifyContent: 'center', gap: 12, maxWidth: 520 },
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.6, color: colors.ink },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  actions: { gap: 12, maxWidth: 520, width: '100%' },
});
