import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { ROLE_HOME } from '@/lib/types';
import { colors, fonts } from '@/theme';

// Error que Supabase agrega al link cuando venció o ya se usó (#error=...&error_description=...).
function errorDelLink(): string | null {
  if (Platform.OS !== 'web') return null;
  const hash = new URLSearchParams(globalThis.location?.hash?.replace(/^#/, '') ?? '');
  const query = new URLSearchParams(globalThis.location?.search ?? '');
  return hash.get('error_description') ?? query.get('error_description') ?? hash.get('error') ?? query.get('error');
}

// Destino del link de "Olvidé mi contraseña". El cliente de Supabase toma la
// sesión de recuperación del link (detectSessionInUrl) y acá se elige la nueva.
// Va fuera del grupo (auth): ahí una sesión abierta redirige al panel.
export default function Restablecer() {
  const { session, role, initializing } = useAuth();
  const [errorLink] = useState(errorDelLink);
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (errorLink || !session) {
    return (
      <FormScreen
        title="El link no sirve"
        subtitle="Venció o ya se usó. Los links para cambiar la contraseña duran poco y sirven una sola vez."
        footer={<Button title="Pedir otro link" onPress={() => router.replace('/recuperar')} />}>
        <Text style={styles.muted}>Abrí el link nuevo desde el mismo dispositivo y navegador.</Text>
      </FormScreen>
    );
  }

  if (listo) {
    return (
      <FormScreen
        title="¡Listo!"
        subtitle="Cambiaste tu contraseña. Ya podés usar Flety."
        footer={<Button title="Continuar" onPress={() => router.replace(role ? ROLE_HOME[role] : '/')} />}>
        <Text style={styles.muted}>La próxima vez ingresá con {session.user.email} y tu contraseña nueva.</Text>
      </FormScreen>
    );
  }

  async function guardar() {
    setError(null);
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setGuardando(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes('different')
          ? 'La contraseña nueva tiene que ser distinta de la anterior.'
          : authErrorMessage(updateError.message)
      );
      return;
    }
    setListo(true);
  }

  return (
    <FormScreen
      title="Elegí tu contraseña nueva"
      subtitle={`Para ${session.user.email}`}
      footer={<Button title="Guardar contraseña" onPress={guardar} loading={guardando} />}>
      <TextField
        label="Contraseña nueva"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repetila"
        value={repetir}
        onChangeText={setRepetir}
        placeholder="La misma contraseña"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={guardar}
      />
      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  muted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
