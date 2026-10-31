import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';

import { irGruista } from './nav';

const d = colors.dark;

// Piezas de la app del gruista (tema oscuro con acento naranja).

// Pantalla secundaria (Mi grúa, Documentos, Tarifas…): volver + título + scroll.
export function Subpantalla({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: d.bg }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : irGruista('cuenta'))}
          hitSlop={8}
          style={st.volver}>
          <ChevronLeft size={22} color={d.text} />
          <Text style={st.volverTexto}>Volver</Text>
        </Pressable>
        <View style={{ gap: 4 }}>
          <Text style={st.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {subtitulo ? <Text style={st.sub}>{subtitulo}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Tarjeta({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[st.tarjeta, style]}>{children}</View>;
}

export function Titulo({ children }: { children: React.ReactNode }) {
  return <Text style={st.seccion}>{children}</Text>;
}

export function Campo({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: 6, flex: props.style ? undefined : 1, minWidth: 120 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={d.muted}
        {...props}
        style={[st.input, error ? { borderColor: '#FF8A80' } : null, props.style]}
      />
      {error ? <Text style={st.error}>{error}</Text> : null}
    </View>
  );
}

export const estilosGruista = StyleSheet.create({
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: d.muted },
  fuerte: { fontFamily: fonts.bold, fontSize: 15, color: d.text },
  error: { fontFamily: fonts.medium, fontSize: 13, color: '#FF8A80' },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: '#4ADE80' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 4 },
  volverTexto: { fontFamily: fonts.semibold, fontSize: 15, color: d.text },
  titulo: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, color: d.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: d.muted },
  tarjeta: {
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.surface,
  },
  seccion: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: d.muted },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: d.muted },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: d.line,
    backgroundColor: d.chip,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: d.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 12, color: '#FF8A80' },
});
