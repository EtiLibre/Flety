import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

// El link del email vuelve a /restablecer de esta misma app (en web, el mismo
// dominio desde el que se pidió). Esa dirección tiene que estar en Supabase →
// Authentication → URL Configuration → Redirect URLs.
function destinoDelLink() {
  if (Platform.OS === 'web' && globalThis.location?.origin) return `${globalThis.location.origin}/restablecer`;
  return Linking.createURL('/restablecer');
}

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleEnviar() {
    setError(null);
    if (!email.trim()) {
      setError('Ingresá tu email.');
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: destinoDelLink(),
    });
    setLoading(false);
    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <FormScreen
        title="Revisá tu email"
        footer={<Button title="Volver a iniciar sesión" variant="dark" onPress={() => router.replace('/login')} />}>
        <Text style={styles.text}>
          Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva.
        </Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title="Recuperar contraseña"
      subtitle="Te mandamos un link para que elijas una nueva."
      footer={<Button title="Enviar link" onPress={handleEnviar} loading={loading} />}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        onSubmitEditing={handleEnviar}
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
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.ink },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
