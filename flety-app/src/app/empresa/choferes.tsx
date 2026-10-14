import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, ChoferFila, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { estadoDelChofer, type EstadoChofer } from '@/lib/empresa';
import { colors, fonts } from '@/theme';

const ORDEN: EstadoChofer[] = ['disponible', 'en_viaje', 'no_disponible'];
const TITULOS: Record<EstadoChofer, string> = {
  disponible: 'Disponibles',
  en_viaje: 'En viaje',
  no_disponible: 'No disponibles',
};

export default function ChoferesEmpresa() {
  const { empresa, choferes, pedidos, loading, esAdmin } = useEmpresa();
  const estados = choferes.map((c) => ({ chofer: c, estado: estadoDelChofer(c, pedidos) }));

  return (
    <EmpresaShell
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
      {!esAdmin ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTitulo}>¿Cómo sumo un chofer?</Text>
          <Text style={styles.avisoTexto}>
            Por ahora, pedile al equipo de Flety que lo asocie a tu empresa. En la próxima etapa vas a poder invitarlo con un
            código desde acá, y él se suma desde su app.
          </Text>
        </View>
      ) : null}
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexBasis: 300 },
  aviso: { gap: 4, padding: 16, borderRadius: 16, backgroundColor: '#FFF3D6' },
  avisoTitulo: { fontFamily: fonts.bold, fontSize: 15, color: '#7A4F00' },
  avisoTexto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#7A4F00' },
});
