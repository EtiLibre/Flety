import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { InvitarChofer } from '@/components/empresa/InvitarChofer';
import { Card, ChoferFila, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { estadoDelChofer, type EstadoChofer } from '@/lib/empresa';
import { colors } from '@/theme';

const ORDEN: EstadoChofer[] = ['disponible', 'en_viaje', 'no_disponible'];
const TITULOS: Record<EstadoChofer, string> = {
  disponible: 'Disponibles',
  en_viaje: 'En viaje',
  no_disponible: 'No disponibles',
};

export default function ChoferesEmpresa() {
  const { empresa, choferes, pedidos, loading, error: errorCarga, esAdmin, recargar } = useEmpresa();
  const estados = choferes.map((c) => ({ chofer: c, estado: estadoDelChofer(c, pedidos) }));

  return (
    <EmpresaShell
      aviso={errorCarga}
      active="choferes"
      empresa={empresa}
      title="Choferes"
      subtitle={esAdmin ? 'Los choferes de todas las empresas.' : 'Tu flota y quién está disponible ahora.'}>
      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {ORDEN.map((estado) => {
            const lista = estados.filter((e) => e.estado === estado);
            return (
              <Card key={estado} title={`${TITULOS[estado]} · ${lista.length}`} style={styles.col}>
                {lista.length ? (
                  lista.map(({ chofer }) => <ChoferFila key={chofer.id} chofer={chofer} estado={estado} />)
                ) : (
                  <Vacio texto="Nadie por ahora." />
                )}
              </Card>
            );
          })}
        </View>
      )}
      {!esAdmin && empresa?.estado_aprobacion === 'aprobada' ? (
        <InvitarChofer empresa={empresa.nombre} onCambio={recargar} />
      ) : null}
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexBasis: 300 },
});
