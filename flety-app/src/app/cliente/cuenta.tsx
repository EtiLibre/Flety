import { router } from 'expo-router';
import { MapPinned, Wallet } from 'lucide-react-native';
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
      <FilaCuenta
        tema="claro"
        Icon={MapPinned}
        titulo="Mis lugares"
        detalle="Casa, Trabajo y tus lugares guardados (solo los ves vos)"
        onPress={() => router.push('/cliente/lugares')}
      />
      {gruista?.esDueno ? (
        <FilaCuenta
          tema="claro"
          Icon={IconoGrua}
          titulo="Panel de mi empresa de grúas"
          detalle={gruista.empresa?.nombre ?? 'Servicios, gruistas y tarifas'}
          onPress={() => router.push('/empresa-gruas' as never)}
        />
      ) : null}
      {gruista ? (
        <FilaCuenta
          tema="claro"
          Icon={IconoGrua}
          titulo="App del gruista"
          detalle="Recibir y hacer servicios de grúa"
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
