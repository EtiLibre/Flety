import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { CentroAyuda } from '@/components/ayuda/CentroAyuda';
import { grupoDe } from '@/components/historial/FleteCard';
import { PantallaTab } from '@/components/nav/PantallaTab';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import type { Destino } from '@/lib/ayuda';
import { ESTADO_LABELS } from '@/lib/state-machine';
import { colors, fonts } from '@/theme';

export default function AyudaCliente() {
  const isWide = useIsWide();
  const { pedidos } = useMisPedidos();
  // El asistente usa el flete en curso para responder "¿dónde está mi flete?".
  const activo = pedidos.find((p) => grupoDe(p) === 'en_curso');

  function navegar(d: Destino) {
    if (d.startsWith('flete:')) return router.push(`/cliente/pedidos/${d.slice(6)}`);
    if (d === 'pedir') return router.push(isWide ? '/cliente/inicio' : '/cliente/nuevo-pedido');
    if (d === 'fletes') return router.navigate('/cliente/pedidos');
    if (d === 'cuenta') return router.navigate('/cliente/cuenta');
    if (d === 'pagos') return router.push('/cliente/pagos');
    if (d === 'unirse') return router.push('/unirse');
  }

  const ayuda = (
    <CentroAyuda
      tema="claro"
      rol="cliente"
      contexto={{
        fleteActivo: activo ? { id: activo.id, estado: activo.estado, etiqueta: ESTADO_LABELS[activo.estado] } : null,
      }}
      onNavegar={navegar}
    />
  );

  if (isWide) {
    return (
      <ClienteShell
        active="ayuda"
        panel={
          <>
            <Text style={styles.title} accessibilityRole="header">
              Ayuda
            </Text>
            {ayuda}
          </>
        }
      />
    );
  }
  return (
    <PantallaTab titulo="Ayuda" subtitulo="Preguntale al asistente o escribinos." tema="claro">
      {ayuda}
    </PantallaTab>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
});
