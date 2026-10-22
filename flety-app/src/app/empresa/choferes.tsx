import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { DatosChoferModal } from '@/components/empresa/DatosChoferModal';
import { InvitarChofer } from '@/components/empresa/InvitarChofer';
import { Card, ChoferFila, Vacio } from '@/components/empresa/ui';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { estadoDelChofer, type Chofer, type EstadoChofer } from '@/lib/empresa';
import { colors, fonts } from '@/theme';

const ORDEN: EstadoChofer[] = ['disponible', 'en_viaje', 'no_disponible'];
const TITULOS: Record<EstadoChofer, string> = {
  disponible: 'Disponibles',
  en_viaje: 'En viaje',
  no_disponible: 'No disponibles',
};

export default function ChoferesEmpresa() {
  const { empresa, choferes, pedidos, loading, error: errorCarga, esAdmin, recargar } = useEmpresa();
  const estados = choferes.map((c) => ({ chofer: c, estado: estadoDelChofer(c, pedidos) }));
  const [ficha, setFicha] = useState<Chofer | null>(null);

  return (
    <EmpresaShell
      aviso={errorCarga}
      active="choferes"
      empresa={empresa}
      title="Choferes"
      subtitle={esAdmin ? 'Los choferes de todas las empresas.' : 'Tu flota y quién está disponible ahora.'}>
      {!loading && choferes.length ? (
        <Text style={styles.ayuda}>Tocá un chofer para ver su ficha: DNI, licencia, domicilio y contacto.</Text>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {ORDEN.map((estado) => {
            const lista = estados.filter((e) => e.estado === estado);
            return (
              <Card key={estado} title={`${TITULOS[estado]} · ${lista.length}`} style={styles.col}>
                {lista.length ? (
                  lista.map(({ chofer }) => (
                    <ChoferFila key={chofer.id} chofer={chofer} estado={estado} onPress={() => setFicha(chofer)} />
                  ))
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
      <DatosChoferModal chofer={ficha} onClose={() => setFicha(null)} />
    </EmpresaShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexBasis: 300 },
  ayuda: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 12 },
});
