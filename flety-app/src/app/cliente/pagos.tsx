import { router } from 'expo-router';
import { ChevronLeft, Receipt } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PantallaTab } from '@/components/nav/PantallaTab';
import { ClienteShell } from '@/components/web/ClienteShell';
import { useAvisosFletes } from '@/hooks/use-avisos-fletes';
import { useIsWide } from '@/hooks/use-is-wide';
import { useMisPedidos } from '@/hooks/use-mis-pedidos';
import { useAuth } from '@/lib/auth';
import { ESTADO_PAGO, METODO_LABEL, misPagos, type PagoConFlete } from '@/lib/pagos';
import { formatARS } from '@/lib/pricing';
import { TIPO_LABEL, type TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaHora = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const corta = (d: string | undefined) => d?.split(',')[0]?.trim() || '—';

// Historial de pagos del cliente: qué pagó, a quién, cuándo y cómo, y lo pendiente.
export default function MisPagos() {
  const isWide = useIsWide();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { pedidos } = useMisPedidos();
  const { porPagar } = useAvisosFletes(pedidos);
  const pendientes = pedidos.filter((p) => porPagar.has(p.id));
  const [res, setRes] = useState<{ id: string; pagos: PagoConFlete[]; error: string | null } | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    misPagos(userId)
      .then((pagos) => !cancelled && setRes({ id: userId, pagos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ id: userId, pagos: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const actual = res?.id === userId ? res : null;
  const pagos = actual?.pagos ?? [];
  const pagado = pagos.filter((p) => p.estado === 'confirmado').reduce((t, p) => t + p.monto, 0);
  const deuda = pendientes.reduce((t, p) => t + Number(p.precio_estimado ?? 0), 0);

  const contenido = (
    <>
      <View style={styles.resumen}>
        <View style={styles.dato}>
          <Text style={styles.datoValor}>{formatARS(pagado)}</Text>
          <Text style={styles.datoLabel}>pagado</Text>
        </View>
        <View style={styles.sep} />
        <View style={styles.dato}>
          <Text style={[styles.datoValor, deuda > 0 && { color: colors.accent }]}>{formatARS(deuda)}</Text>
          <Text style={styles.datoLabel}>pendiente</Text>
        </View>
      </View>
      <Text style={styles.nota}>
        Le pagás a la empresa que hace cada flete, al terminar el viaje: en efectivo al chofer o por transferencia.
      </Text>

      {pendientes.length ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.seccion}>Para pagar</Text>
          {pendientes.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => router.push(`/cliente/pedidos/${p.id}`)}
              style={({ pressed }) => [styles.item, styles.itemPendiente, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemTitulo}>{TIPO_LABEL[p.tipo]}</Text>
                <Text style={styles.itemDetalle} numberOfLines={1}>
                  {corta(p.origen?.direccion)} → {corta(p.destino?.direccion)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.itemMonto}>{formatARS(Number(p.precio_estimado ?? 0))}</Text>
                <Text style={styles.pagarLink}>Pagar</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text style={styles.seccion}>Historial</Text>
        {actual?.error ? <Text style={styles.error}>{actual.error}</Text> : null}
        {!actual ? (
          <ActivityIndicator color={colors.ink} />
        ) : pagos.length ? (
          pagos.map((p) => {
            const on = abierto === p.order_id;
            return (
              <Pressable
                key={p.order_id}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => setAbierto(on ? null : p.order_id)}
                style={styles.item}>
                <View style={styles.itemFila}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitulo} numberOfLines={1}>
                      {p.empresa ?? 'Empresa'}
                    </Text>
                    <Text style={styles.itemDetalle}>
                      {fecha.format(new Date(p.confirmado_at ?? p.created_at))} · {METODO_LABEL[p.metodo]}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.itemMonto}>{formatARS(p.monto)}</Text>
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: ESTADO_PAGO[p.estado].bg, color: ESTADO_PAGO[p.estado].fg },
                      ]}>
                      {ESTADO_PAGO[p.estado].label}
                    </Text>
                  </View>
                </View>
                {on ? <Comprobante p={p} /> : null}
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.vacio}>Todavía no registraste pagos.</Text>
        )}
      </View>
    </>
  );

  if (isWide) {
    return (
      <ClienteShell
        active="cuenta"
        panel={
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/cliente/cuenta')}
              style={styles.volver}>
              <ChevronLeft size={18} color={colors.ink} />
              <Text style={styles.volverText}>Mi cuenta</Text>
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              Mis pagos
            </Text>
            {contenido}
          </>
        }
      />
    );
  }
  return (
    <PantallaTab
      titulo="Mis pagos"
      tema="claro"
      derecha={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.cerrar}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
      }>
      {contenido}
    </PantallaTab>
  );
}

// Comprobante simple (no es una factura: la factura la emite la empresa).
function Comprobante({ p }: { p: PagoConFlete }) {
  return (
    <View style={styles.comprobante}>
      <View style={styles.compHead}>
        <Receipt size={16} color={colors.muted} />
        <Text style={styles.compTitulo}>Comprobante de pago</Text>
      </View>
      <Fila label="Empresa" valor={p.empresa ?? '—'} />
      <Fila label="Servicio" valor={p.flete ? (TIPO_LABEL[p.flete.tipo as TipoServicio] ?? p.flete.tipo) : '—'} />
      <Fila
        label="Recorrido"
        valor={p.flete ? `${corta(p.flete.origen?.direccion)} → ${corta(p.flete.destino?.direccion)}` : '—'}
      />
      <Fila label="Monto" valor={formatARS(p.monto)} />
      <Fila label="Método" valor={METODO_LABEL[p.metodo]} />
      {p.referencia ? <Fila label="Operación" valor={p.referencia} /> : null}
      <Fila label="Estado" valor={ESTADO_PAGO[p.estado].label} />
      <Fila label="Fecha" valor={fechaHora.format(new Date(p.confirmado_at ?? p.created_at))} />
      <Text style={styles.compNota}>La factura la emite la empresa que hizo el flete. Pedísela por el chat.</Text>
    </View>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volverText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  cerrar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: colors.ink,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  datoValor: { fontFamily: fonts.display, fontSize: 22, color: colors.white },
  datoLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.mutedOnInk },
  sep: { width: 1, height: 30, backgroundColor: '#2A313B' },
  nota: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  seccion: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  item: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E6EA',
    backgroundColor: colors.white,
  },
  itemPendiente: { flexDirection: 'row', alignItems: 'center', borderColor: '#FFE3A3', backgroundColor: '#FFFBF0' },
  itemFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  itemDetalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  itemMonto: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  pagarLink: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  comprobante: { gap: 6, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface },
  compHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  compTitulo: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  fila: { flexDirection: 'row', gap: 10 },
  filaLabel: { width: 84, fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  filaValor: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  compNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  vacio: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
