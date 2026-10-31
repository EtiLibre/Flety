import { router } from 'expo-router';
import { ChevronRight, Star, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAvisosFletes } from '@/hooks/use-avisos-fletes';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { formatARS } from '@/lib/pricing';
import { colors, fonts, radius } from '@/theme';

// Lo más importante que le falta al cliente: un pago o calificar un flete.
export function AvisoPendiente() {
  const { pedidos } = useMisPedidos();
  const { porCalificar, porPagar } = useAvisosFletes(pedidos);
  const pagar = pedidos.find((p) => porPagar.has(p.id));
  const calificar = pedidos.find((p) => porCalificar.has(p.id));
  const p = pagar ?? calificar;
  if (!p) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/cliente/pedidos/${p.id}`)}
      style={({ pressed }) => [styles.aviso, pressed && { opacity: 0.85 }]}>
      {pagar ? (
        <Wallet size={20} color={colors.ink} strokeWidth={2.2} />
      ) : (
        <Star size={20} color={colors.ink} fill={colors.ink} strokeWidth={2} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.avisoTitulo}>{pagar ? 'Tenés un pago pendiente' : '¿Cómo te fue con tu flete?'}</Text>
        <Text style={styles.avisoTexto} numberOfLines={1}>
          {pagar
            ? `${p.precio_estimado != null ? formatARS(Number(p.precio_estimado)) : 'Flete'} · tocá para ver cómo pagar`
            : 'Calificá a tu fletero en un toque'}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: '#FFF3D6',
    borderWidth: 1,
    borderColor: '#FFE3A3',
  },
  avisoTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  avisoTexto: { fontFamily: fonts.regular, fontSize: 13, color: '#5B4A1F' },
});
