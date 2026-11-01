import { router } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { CuentaForm, FilaCuenta } from '@/components/cuenta/CuentaForm';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMiGruista } from '@/modulos/gruas/hooks';
import { RUTA_GRUISTA } from '@/modulos/gruas/nav';
import { IconoGrua } from '@/plataforma/IconoGrua';
import { colors, fonts } from '@/theme';

export default function CuentaCliente() {
  const isWide = useIsWide();
  // Chofer y gruista se eligen al registrarse; acá solo vuelve a su panel
  // quien ya está dado de alta como gruista.
  const { gruista } = useMiGruista();
  const form = (
    <CuentaForm tema="claro">
      <FilaCuenta
        tema="claro"
        Icon={Wallet}
        titulo="Mis pagos"
        detalle="Historial, pendientes y comprobantes"
        onPress={() => router.push('/cliente/pagos')}
      />
      {gruista ? (
        <FilaCuenta
          tema="claro"
          Icon={IconoGrua}
          titulo="Panel de gruista"
          detalle="Tus servicios de grúa y auxilio"
          onPress={() => router.push(RUTA_GRUISTA)}
        />
      ) : null}
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
