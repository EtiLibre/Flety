import * as Clipboard from 'expo-clipboard';
import { Banknote, Check, Copy, Landmark } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import type { Pedido } from '@/lib/orders';
import {
  datosCobro,
  ESTADO_PAGO,
  ESTADOS_PAGABLES,
  informarPago,
  METODO_LABEL,
  pagoDelFlete,
  type DatosCobro,
  type Pago,
} from '@/lib/pagos';
import { formatARS } from '@/lib/pricing';
import { colors, fonts, radius } from '@/theme';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Pago del flete (cliente): cuánto, a quién, cuándo y cómo; "Ya pagué" y el
// estado (por confirmar / pagado).
export function PagoCard({ pedido }: { pedido: Pedido }) {
  const companyId = pedido.company_id;
  const [carga, setCarga] = useState<{ id: string; pago: Pago | null; cobro: DatosCobro | null } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    Promise.all([pagoDelFlete(pedido.id), datosCobro(companyId)]).then(
      ([pago, cobro]) => !cancelled && setCarga({ id: `${pedido.id}:${version}`, pago, cobro })
    );
    return () => {
      cancelled = true;
    };
  }, [pedido.id, companyId, version, pedido.estado]);

  if (!companyId || pedido.precio_estimado == null) return null;
  const c = carga?.id === `${pedido.id}:${version}` ? carga : null;
  if (!c) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const pagable = ESTADOS_PAGABLES.includes(pedido.estado);
  const estado = c.pago?.estado ?? 'pendiente';
  const empresa = c.cobro?.nombre ?? 'la empresa';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titulo}>Pago</Text>
          <Text style={styles.monto}>{formatARS(Number(pedido.precio_estimado))}</Text>
        </View>
        <Text style={[styles.badge, { backgroundColor: ESTADO_PAGO[estado].bg, color: ESTADO_PAGO[estado].fg }]}>
          {ESTADO_PAGO[estado].label}
        </Text>
      </View>

      {c.pago?.estado === 'confirmado' ? (
        <View style={styles.ok}>
          <Check size={18} color={colors.success} strokeWidth={2.6} />
          <Text style={styles.okText}>
            {empresa} confirmó tu pago en {METODO_LABEL[c.pago.metodo].toLowerCase()}
            {c.pago.confirmado_at ? ` · ${fecha.format(new Date(c.pago.confirmado_at))}` : ''}.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.texto}>
            Le pagás a <Text style={styles.bold}>{empresa}</Text>{' '}
            {pagable ? 'ahora, al terminar el viaje.' : 'al terminar el viaje (cuando entreguen tu carga).'}
          </Text>
          <Metodos cobro={c.cobro} />
          {c.pago?.estado === 'informado' ? (
            <Text style={styles.nota}>
              Avisaste que pagaste por {METODO_LABEL[c.pago.metodo].toLowerCase()}
              {c.pago.referencia ? ` (operación ${c.pago.referencia})` : ''}. La empresa lo tiene que confirmar.
            </Text>
          ) : null}
          {c.pago?.estado === 'rechazado' ? (
            <Text style={[styles.nota, { color: colors.danger }]}>
              La empresa dice que el pago no le llegó. Revisalo o escribile por el chat.
            </Text>
          ) : null}
          {pagable ? <YaPague orderId={pedido.id} cobro={c.cobro} onListo={() => setVersion((v) => v + 1)} /> : null}
        </>
      )}
    </View>
  );
}

function Metodos({ cobro }: { cobro: DatosCobro | null }) {
  const efectivo = cobro?.acepta_efectivo ?? true;
  const transferencia = (cobro?.acepta_transferencia ?? true) && !!(cobro?.cobro_alias || cobro?.cobro_cbu);
  return (
    <View style={{ gap: 8 }}>
      {efectivo ? (
        <View style={styles.metodo}>
          <Banknote size={18} color={colors.ink} strokeWidth={2} />
          <Text style={styles.metodoText}>Efectivo al chofer cuando entrega</Text>
        </View>
      ) : null}
      {transferencia && cobro ? (
        <View style={[styles.metodo, styles.metodoTransf]}>
          <View style={styles.metodoFila}>
            <Landmark size={18} color={colors.ink} strokeWidth={2} />
            <Text style={styles.metodoText}>Transferencia</Text>
          </View>
          {cobro.cobro_alias ? <Copiable label="Alias" valor={cobro.cobro_alias} /> : null}
          {cobro.cobro_cbu ? <Copiable label="CBU/CVU" valor={cobro.cobro_cbu} /> : null}
          {cobro.cobro_titular ? (
            <Text style={styles.nota}>
              Titular: {cobro.cobro_titular}
              {cobro.cobro_banco ? ` · ${cobro.cobro_banco}` : ''}
            </Text>
          ) : null}
        </View>
      ) : null}
      {!efectivo && !transferencia ? (
        <Text style={styles.nota}>Coordiná el pago con la empresa por el chat.</Text>
      ) : null}
    </View>
  );
}

function Copiable({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copiar ${label}`}
      onPress={async () => {
        await Clipboard.setStringAsync(valor);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      style={styles.copiable}>
      <Text style={styles.copiableLabel}>{label}</Text>
      <Text style={styles.copiableValor} numberOfLines={1} selectable>
        {valor}
      </Text>
      {copiado ? (
        <Check size={16} color={colors.success} strokeWidth={2.6} />
      ) : (
        <Copy size={16} color={colors.muted} strokeWidth={2} />
      )}
    </Pressable>
  );
}

function YaPague({ orderId, cobro, onListo }: { orderId: string; cobro: DatosCobro | null; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const transferencia = (cobro?.acepta_transferencia ?? true) && !!(cobro?.cobro_alias || cobro?.cobro_cbu);
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>(transferencia ? 'transferencia' : 'efectivo');
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return <Button title="Ya pagué" variant="dark" onPress={() => setAbierto(true)} />;

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await informarPago(orderId, metodo, referencia);
      setAbierto(false);
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar el pago.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>¿Cómo pagaste?</Text>
      <View style={styles.opciones} role="radiogroup">
        {(['efectivo', 'transferencia'] as const).map((m) => (
          <Pressable
            key={m}
            role="radio"
            aria-checked={metodo === m}
            onPress={() => setMetodo(m)}
            style={[styles.opcion, metodo === m && styles.opcionOn]}>
            <Text style={[styles.opcionText, metodo === m && styles.opcionTextOn]}>{METODO_LABEL[m]}</Text>
          </Pressable>
        ))}
      </View>
      {metodo === 'transferencia' ? (
        <TextInput
          value={referencia}
          onChangeText={setReferencia}
          maxLength={80}
          placeholder="N.º de operación (opcional)"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Número de operación"
          style={styles.input}
        />
      ) : null}
      {error ? <Text style={[styles.nota, { color: colors.danger }]}>{error}</Text> : null}
      <Button title="Avisar a la empresa" loading={enviando} onPress={enviar} />
      <Pressable accessibilityRole="button" onPress={() => setAbierto(false)} style={{ alignSelf: 'center' }}>
        <Text style={styles.cancelar}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  monto: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  texto: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  bold: { fontFamily: fonts.bold },
  nota: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  ok: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  okText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.success },
  metodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  metodoTransf: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  metodoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metodoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  copiable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  copiableLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, width: 62 },
  copiableValor: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  form: { gap: 10, paddingTop: 4 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  opciones: { flexDirection: 'row', gap: 8 },
  opcion: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  opcionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  opcionTextOn: { color: colors.white },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  cancelar: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, textDecorationLine: 'underline' },
});
