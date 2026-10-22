import { ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PatenteChip, VehiculoIlustracion } from '@/components/VehiculoIlustracion';
import { iniciales } from '@/lib/empresa';
import { perfilFletero, type PerfilFletero } from '@/lib/marketplace';
import { describirModelo } from '@/lib/vehiculos';
import { colors, fonts, radius } from '@/theme';

import { PerfilContenido } from './PerfilFletero';

// Seguimiento del cliente: quién va y en qué vehículo (con la patente
// completa, para reconocerlo cuando llega).
export function FleteroAsignado({ driverId }: { driverId: string }) {
  const [perfil, setPerfil] = useState<{ id: string; p: PerfilFletero | null } | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    perfilFletero(driverId).then((p) => !cancelled && setPerfil({ id: driverId, p }));
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const p = perfil?.id === driverId ? perfil.p : null;
  if (!p) return null;
  const modelo = describirModelo(p.vehiculo);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales(p.nombre)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.nombre}>{p.nombre}</Text>
          <View style={styles.row}>
            {p.empresa_verificada ? <ShieldCheck size={13} color={colors.success} strokeWidth={2.2} /> : null}
            <Text style={styles.muted} numberOfLines={1}>
              {p.empresa}
              {p.calificaciones ? ` · ★ ${p.estrellas?.toFixed(1)} (${p.calificaciones})` : ' · Nuevo en Flety'}
            </Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setAbierto(true)} hitSlop={8}>
          <Text style={styles.link}>Ver perfil</Text>
        </Pressable>
      </View>
      <View style={styles.vehiculo}>
        <VehiculoIlustracion tipo={p.vehiculo.tipo ?? 'camioneta'} color={p.vehiculo.color ?? 'blanco'} ancho={120} />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={styles.modelo}>{modelo ?? 'Vehículo'}</Text>
          {p.vehiculo.patente ? (
            <PatenteChip patente={p.vehiculo.patente} tapada={!p.vehiculo.patente_completa} />
          ) : null}
        </View>
      </View>

      <Modal visible={abierto} animationType="slide" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={styles.modalHead}>
            <Pressable accessibilityRole="button" onPress={() => setAbierto(false)}>
              <Text style={styles.link}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <PerfilContenido perfil={p} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  nombre: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  vehiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: '#EEF0F2',
  },
  modelo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  modalHead: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
});
