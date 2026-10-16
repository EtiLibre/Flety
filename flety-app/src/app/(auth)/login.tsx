import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/TextField';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Completá tu email y contraseña.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    // Con éxito, el cambio de sesión redirige solo al inicio de tu rol.
    if (signInError) setError(authErrorMessage(signInError.message));
  }

  return (
    <FormScreen
      title="Iniciar sesión"
      subtitle="Qué bueno verte de nuevo."
      footer={<Button title="Ingresar" onPress={handleLogin} loading={loading} />}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleLogin}
      />
      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.links}>
        <Link href="/recuperar" style={styles.link}>
          Olvidé mi contraseña
        </Link>
        <Link href={{ pathname: '/registro', params: next ? { next } : undefined }} style={styles.link}>
          Crear cuenta
        </Link>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
