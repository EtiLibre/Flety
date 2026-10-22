import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FleteroOption } from '@/components/pedido/FleteroOption';
import { PerfilFleteroModal } from '@/components/pedido/PerfilFletero';
import { VehiculoIlustracion } from '@/components/VehiculoIlustracion';
import { useAuth } from '@/lib/auth';
import { fleterosDeEjemplo, type Fletero } from '@/lib/marketplace';
import { COLORES, type ColorVehiculo } from '@/lib/vehiculos';
import { colors, fonts } from '@/theme';

// SOLO DESARROLLO (y superadmin): la lista del marketplace con fleteros de
// ejemplo, su perfil y los dibujos de vehículos en todos los colores.
const TARIFAS = [
  { vehiculo: 'utilitario' as const, base: 15000, por_km: 900, por_ayudante: 12000 },
  { vehiculo: 'camioneta' as const, base: 25000, por_km: 1200, por_ayudante: 12000 },
  { vehiculo: 'camion' as const, base: 45000, por_km: 1800, por_ayudante: 12000 },
];
const FLETEROS = fleterosDeEjemplo({ lat: -32.8893, lng: -68.8392 }, 4.2, 1, TARIFAS);

export default function PreviewFleteros() {
  const { role } = useAuth();
  const [elegido, setElegido] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Fletero | null>(FLETEROS[0]);
  if (!__DEV__ && role !== 'superadmin') return <Redirect href="/" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Elegí tu fletero</Text>
      {FLETEROS.map((f) => (
        <FleteroOption
          key={f.driver_id}
          fletero={f}
          selected={elegido === f.driver_id}
          onPress={() => setElegido(f.driver_id)}
          onVerPerfil={() => setPerfil(f)}
        />
      ))}
      <Text style={styles.title}>Vehículos</Text>
      <View style={styles.grid}>
        {(['utilitario', 'camioneta', 'camion'] as const).map((t) =>
          (Object.keys(COLORES) as ColorVehiculo[]).slice(0, 4).map((c) => (
            <View key={`${t}-${c}`} style={styles.cell}>
              <VehiculoIlustracion tipo={t} color={c} ancho={150} />
            </View>
          ))
        )}
      </View>
      <PerfilFleteroModal fletero={perfil} onClose={() => setPerfil(null)} onElegir={(f) => setElegido(f.driver_id)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { padding: 6, borderRadius: 12, backgroundColor: '#EEF0F2' },
});
