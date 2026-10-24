import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/theme';
import { paleta, type Tema } from '@/theme/tema';

// Pantalla de una pestaña en el celular (Mis fletes, Ayuda, Cuenta…): título
// grande y contenido con scroll. La barra inferior la pone el layout.
export function PantallaTab({
  titulo,
  subtitulo,
  tema,
  derecha,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  tema: Tema;
  derecha?: React.ReactNode;
  children: React.ReactNode;
}) {
  const p = paleta(tema);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
      <StatusBar style={tema === 'oscuro' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[styles.titulo, { color: p.text }]} accessibilityRole="header">
              {titulo}
            </Text>
            {subtitulo ? <Text style={[styles.subtitulo, { color: p.muted }]}>{subtitulo}</Text> : null}
          </View>
          {derecha}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6 },
  titulo: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 },
  subtitulo: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
