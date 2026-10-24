import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { CuentaForm, FilaCuenta } from '@/components/cuenta/CuentaForm';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { colors, fonts } from '@/theme';

export default function CuentaCliente() {
  const isWide = useIsWide();
  const form = (
    <CuentaForm tema="claro">
      <FilaCuenta
        tema="claro"
        Icon={Truck}
        titulo="Soy chofer · tengo un código"
        detalle="Sumate a la flota de una empresa de Flety"
        onPress={() => router.push('/unirse')}
      />
    </CuentaForm>
  );

  if (isWide) {
    return (
      <ClienteShell
        active="cuenta"
        panel={
          <>
            <Text style={styles.title} accessibilityRole="header">
              Mi cuenta
            </Text>
            {form}
          </>
        }
      />
    );
  }
  return (
    <PantallaTab titulo="Cuenta" tema="claro">
      {form}
    </PantallaTab>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
});
