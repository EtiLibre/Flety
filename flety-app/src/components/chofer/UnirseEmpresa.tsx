import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { canjearInvitacion } from '@/lib/chofer';
import { colors, fonts, radius } from '@/theme';

const d = colors.dark;

// "Sumate a una empresa": el chofer escribe el código que le dio su empresa.
export function UnirseEmpresa() {
  const { recargarPerfil } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<string | null>(null);

  async function canjear() {
    setEnviando(true);
    setError(null);
    try {
      setEmpresa(await canjearInvitacion(codigo));
      recargarPerfil();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos usar el código.');
    } finally {
      setEnviando(false);
    }
  }

  if (empresa) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>¡Listo! Ya sos parte de {empresa}</Text>
        <Text style={styles.text}>
          Desde ahora tu empresa te puede asignar viajes. Marcate disponible cuando quieras trabajar.
        </Text>
        <Button title="Ir a mi panel de chofer" onPress={() => router.replace('/chofer/panel')} />
      </View>
    );
  }

  const valido = codigo.trim().length >= 6;
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <KeyRound size={22} color={colors.ink} strokeWidth={2.2} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Sumate a tu empresa
      </Text>
      <Text style={styles.text}>
        Pedile a la empresa de fletes con la que trabajás el código de invitación (6 letras y números) y escribilo acá.
      </Text>
      <TextInput
        value={codigo}
        onChangeText={(t) =>
          setCodigo(
            t
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 6)
          )
        }
        placeholder="ABC123"
        placeholderTextColor="#5B6470"
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Código de invitación"
        onSubmitEditing={() => valido && canjear()}
        style={styles.input}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button title="Sumarme" disabled={!valido} loading={enviando} onPress={canjear} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 22, borderRadius: 24, backgroundColor: d.surface, borderWidth: 1, borderColor: d.line },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: d.text },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: d.muted },
  input: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: d.chip,
    borderWidth: 1,
    borderColor: d.line,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 8,
    color: d.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 14, color: '#FF8A80' },
});
