import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CentroAyuda } from '@/components/ayuda/CentroAyuda';
import { Button } from '@/components/Button';
import { Card } from '@/components/empresa/ui';
import { PaginaPanelGruas } from '@/components/gruas-empresa/Pagina';
import type { Destino } from '@/lib/ayuda';
import { RUTA_GRUISTA } from '@/modulos/gruas/nav';
import { colors, fonts } from '@/theme';

const ESTADO = { pendiente: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada', suspendida: 'Suspendida' };

const DESTINOS: Partial<Record<Destino, string>> = {
  panel: '/empresa-gruas',
  viajes: '/empresa-gruas/servicios',
  tarifas: '/empresa-gruas/tarifas',
  cuenta: '/empresa-gruas/cuenta',
};

// Datos de la empresa de grúas, acceso a la app del gruista y ayuda.
export default function CuentaEmpresaGruas() {
  return (
    <PaginaPanelGruas active="cuenta" title="Mi cuenta y ayuda">
      {({ demo, empresa }) => (
        <View style={{ gap: 20, maxWidth: 760, width: '100%' }}>
          <Card title="Tu empresa">
            <Fila label="Nombre" valor={empresa.nombre} />
            <Fila label="CUIT" valor={empresa.cuit ?? '—'} />
            <Fila label="Estado" valor={ESTADO[empresa.estado]} />
            {empresa.motivo ? <Fila label="Motivo" valor={empresa.motivo} /> : null}
          </Card>
          <Card title="¿También manejás una grúa?">
            <Text style={styles.texto}>
              Para recibir servicios y manejarlos en la calle, usá la app del gruista desde el celular.
            </Text>
            <Button title="Abrir la app del gruista" variant="grua" onPress={() => router.push(RUTA_GRUISTA)} />
          </Card>
          <Card title="Ayuda">
            <CentroAyuda
              tema="claro"
              rol="gruista"
              onNavegar={(d) => {
                const destino = DESTINOS[d];
                if (destino && !demo) router.navigate(destino as never);
              }}
            />
          </Card>
        </View>
      )}
    </PaginaPanelGruas>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  valor: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
});
