import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, Vacio } from '@/components/empresa/ui';
import { Segmented } from '@/components/pedido/Choice';
import { EmpresaShell } from '@/components/web/EmpresaShell';
import { useEmpresa } from '@/hooks/use-empresa';
import { useIsWide } from '@/hooks/use-is-wide';
import { confirmar } from '@/lib/confirm';
import type { Pedido } from '@/lib/orders';
import {
  datosCobro,
  ESTADO_PAGO,
  ESTADOS_PAGABLES,
  guardarDatosCobro,
  METODO_LABEL,
  pagosDeEmpresa,
  rechazarPago,
  registrarCobro,
  type DatosCobro,
  type PagoConFlete,
} from '@/lib/pagos';
import { formatARS } from '@/lib/pricing';
import { TIPO_LABEL, type TipoServicio } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

type Filtro = 'por_confirmar' | 'sin_pagar' | 'pagados';

const fecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const corta = (d: string | undefined) => d?.split(',')[0]?.trim() || '—';

// Cobros de la empresa: cómo le pagan los clientes (alias/CBU, efectivo) y el
// estado de cada flete: por confirmar, sin pagar y pagados.
export default function Cobros() {
  const isWide = useIsWide();
  const { empresa, pedidos, clientes, esAdmin, loading } = useEmpresa();
  const companyId = empresa?.id ?? null;
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ v: number; pagos: PagoConFlete[]; error: string | null } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('por_confirmar');

  useEffect(() => {
    if (loading || (!companyId && !esAdmin)) return;
    let cancelled = false;
    pagosDeEmpresa(esAdmin ? null : companyId)
      .then((pagos) => !cancelled && setRes({ v: version, pagos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ v: version, pagos: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [companyId, esAdmin, loading, version]);

  const pagos = res?.pagos ?? [];
  const conPago = new Set(pagos.filter((p) => p.estado !== 'rechazado').map((p) => p.order_id));
  const sinPagar = pedidos.filter((p) => ESTADOS_PAGABLES.includes(p.estado) && !conPago.has(p.id));
  const porConfirmar = pagos.filter((p) => p.estado === 'informado');
  const pagados = pagos.filter((p) => p.estado === 'confirmado');
  const cobrado = pagados.reduce((t, p) => t + p.monto, 0);
  const aCobrar =
    sinPagar.reduce((t, p) => t + Number(p.precio_estimado ?? 0), 0) + porConfirmar.reduce((t, p) => t + p.monto, 0);
  const recargar = () => setVersion((v) => v + 1);

  return (
    <EmpresaShell
      active="cobros"
      empresa={empresa}
      title="Cobros"
      subtitle={esAdmin ? 'Los pagos de todas las empresas.' : 'Cómo te pagan los clientes y qué falta cobrar.'}
      aviso={res?.error}>
      <View style={[styles.grid, isWide && styles.gridWide]}>
        <View style={[{ gap: 16 }, isWide && { flex: 1.4 }]}>
          <View style={styles.kpis}>
            <Kpi label="Cobrado" valor={formatARS(cobrado)} />
            <Kpi label="A cobrar" valor={formatARS(aCobrar)} destacado={aCobrar > 0} />
          </View>
          <Segmented
            options={[
              {
                value: 'por_confirmar',
                label: `Por confirmar${porConfirmar.length ? ` · ${porConfirmar.length}` : ''}`,
              },
              { value: 'sin_pagar', label: `Sin pagar${sinPagar.length ? ` · ${sinPagar.length}` : ''}` },
              { value: 'pagados', label: 'Pagados' },
            ]}
            value={filtro}
            onChange={setFiltro}
          />
          {!res ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />
          ) : filtro === 'por_confirmar' ? (
            porConfirmar.length ? (
              porConfirmar.map((p) => <PagoFila key={p.order_id} p={p} onCambio={recargar} confirmable />)
            ) : (
              <Card>
                <Vacio texto="No hay pagos esperando confirmación." />
              </Card>
            )
          ) : filtro === 'sin_pagar' ? (
            sinPagar.length ? (
              sinPagar.map((p) => (
                <SinPagarFila key={p.id} pedido={p} cliente={clientes[p.cliente_id] ?? null} onCambio={recargar} />
              ))
            ) : (
              <Card>
                <Vacio texto="No hay fletes sin pagar." />
              </Card>
            )
          ) : pagados.length ? (
            pagados.map((p) => <PagoFila key={p.order_id} p={p} onCambio={recargar} />)
          ) : (
            <Card>
              <Vacio texto="Todavía no hay pagos confirmados." />
            </Card>
          )}
        </View>
        {!esAdmin && companyId ? (
          <View style={isWide ? { flex: 1 } : undefined}>
            <DatosCobroForm companyId={companyId} />
          </View>
        ) : null}
      </View>
    </EmpresaShell>
  );
}

function Kpi({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <View style={[styles.kpi, destacado && styles.kpiDestacado]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValor}>{valor}</Text>
    </View>
  );
}

function PagoFila({ p, onCambio, confirmable }: { p: PagoConFlete; onCambio: () => void; confirmable?: boolean }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(id: string, fn: () => Promise<void>) {
    setEnviando(id);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Card>
      <View style={styles.fila}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.filaTitulo}>
            {p.flete ? (TIPO_LABEL[p.flete.tipo as TipoServicio] ?? p.flete.tipo) : 'Flete'} · {formatARS(p.monto)}
          </Text>
          <Text style={styles.filaDetalle} numberOfLines={1}>
            {p.flete ? `${corta(p.flete.origen?.direccion)} → ${corta(p.flete.destino?.direccion)}` : ''}
          </Text>
          <Text style={styles.filaDetalle}>
            {METODO_LABEL[p.metodo]}
            {p.referencia ? ` · Op. ${p.referencia}` : ''} · {fecha.format(new Date(p.confirmado_at ?? p.created_at))}
            {p.informado_por === 'chofer'
              ? ' · cobró el chofer'
              : p.informado_por === 'cliente'
                ? ' · avisó el cliente'
                : ''}
          </Text>
        </View>
        <Text style={[styles.badge, { backgroundColor: ESTADO_PAGO[p.estado].bg, color: ESTADO_PAGO[p.estado].fg }]}>
          {ESTADO_PAGO[p.estado].label}
        </Text>
      </View>
      {confirmable ? (
        <View style={styles.acciones}>
          <Button
            title="Me llegó"
            variant="dark"
            loading={enviando === 'ok'}
            onPress={() => ejecutar('ok', () => registrarCobro(p.order_id, p.metodo))}
            style={{ flex: 1 }}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!!enviando}
            onPress={async () => {
              if (await confirmar('¿Marcar que este pago no te llegó? El cliente lo va a ver.')) {
                ejecutar('no', () => rechazarPago(p.order_id));
              }
            }}
            style={styles.secundario}>
            <Text style={styles.secundarioText}>No me llegó</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

function SinPagarFila({ pedido, cliente, onCambio }: { pedido: Pedido; cliente: string | null; onCambio: () => void }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cobrar(metodo: 'efectivo' | 'transferencia') {
    setEnviando(metodo);
    setError(null);
    try {
      await registrarCobro(pedido.id, metodo);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Card>
      <View style={styles.fila}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.filaTitulo}>
            {TIPO_LABEL[pedido.tipo]} · {formatARS(Number(pedido.precio_estimado ?? 0))}
          </Text>
          <Text style={styles.filaDetalle} numberOfLines={1}>
            {corta(pedido.origen?.direccion)} → {corta(pedido.destino?.direccion)}
          </Text>
          {cliente ? <Text style={styles.filaDetalle}>Cliente: {cliente}</Text> : null}
        </View>
        <Text style={[styles.badge, { backgroundColor: ESTADO_PAGO.pendiente.bg, color: ESTADO_PAGO.pendiente.fg }]}>
          Sin pagar
        </Text>
      </View>
      <Text style={styles.filaDetalle}>¿Ya te pagó? Registralo:</Text>
      <View style={styles.acciones}>
        <Button
          title="Efectivo"
          variant="outline"
          loading={enviando === 'efectivo'}
          onPress={() => cobrar('efectivo')}
          style={{ flex: 1 }}
        />
        <Button
          title="Transferencia"
          variant="outline"
          loading={enviando === 'transferencia'}
          onPress={() => cobrar('transferencia')}
          style={{ flex: 1 }}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

function DatosCobroForm({ companyId }: { companyId: string }) {
  const [inicial, setInicial] = useState<{ id: string; d: DatosCobro | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    datosCobro(companyId).then((d) => !cancelled && setInicial({ id: companyId, d }));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const actual = inicial?.id === companyId ? inicial : null;
  if (!actual) {
    return (
      <Card title="Cómo te pagan">
        <ActivityIndicator color={colors.ink} />
      </Card>
    );
  }
  return <DatosCobroCampos key={companyId} companyId={companyId} d={actual.d} />;
}

function DatosCobroCampos({ companyId, d }: { companyId: string; d: DatosCobro | null }) {
  const [alias, setAlias] = useState(d?.cobro_alias ?? '');
  const [cbu, setCbu] = useState(d?.cobro_cbu ?? '');
  const [titular, setTitular] = useState(d?.cobro_titular ?? '');
  const [banco, setBanco] = useState(d?.cobro_banco ?? '');
  const [efectivo, setEfectivo] = useState(d?.acepta_efectivo ?? true);
  const [transferencia, setTransferencia] = useState(d?.acepta_transferencia ?? true);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);

  const aliasOk = !alias || /^[A-Za-z0-9.-]{6,20}$/.test(alias);
  const cbuOk = !cbu || /^\d{22}$/.test(cbu);
  const faltaCuenta = transferencia && !alias && !cbu;
  const valido = aliasOk && cbuOk && (efectivo || transferencia) && !faltaCuenta;

  async function guardar() {
    setGuardando(true);
    setEstado(null);
    try {
      await guardarDatosCobro(companyId, {
        cobro_alias: alias,
        cobro_cbu: cbu,
        cobro_titular: titular,
        cobro_banco: banco,
        acepta_efectivo: efectivo,
        acepta_transferencia: transferencia,
      });
      setEstado({ ok: true, texto: 'Guardado. Los clientes lo ven al pagar.' });
    } catch (e) {
      setEstado({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card title="Cómo te pagan">
      <View style={{ gap: 12 }}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Efectivo al chofer</Text>
          <Switch value={efectivo} onValueChange={setEfectivo} accessibilityLabel="Aceptar efectivo" />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Transferencia</Text>
          <Switch value={transferencia} onValueChange={setTransferencia} accessibilityLabel="Aceptar transferencia" />
        </View>
        {transferencia ? (
          <>
            <Campo
              label="Alias"
              value={alias}
              onChange={(v) => setAlias(v.trim())}
              placeholder="fletes.cuyo.mp"
              error={aliasOk ? null : 'De 6 a 20 caracteres'}
            />
            <Campo
              label="CBU / CVU"
              value={cbu}
              onChange={(v) => setCbu(v.replace(/\D/g, '').slice(0, 22))}
              placeholder="22 números"
              numerico
              error={cbuOk ? null : 'Tiene que tener 22 números'}
            />
            <Campo label="Titular de la cuenta" value={titular} onChange={setTitular} placeholder="Fletes Cuyo SRL" />
            <Campo
              label="Banco o billetera"
              value={banco}
              onChange={setBanco}
              placeholder="Banco Nación / Mercado Pago"
            />
            {faltaCuenta ? (
              <Text style={styles.error}>Cargá el alias o el CBU/CVU para recibir transferencias.</Text>
            ) : null}
          </>
        ) : null}
        {estado ? <Text style={estado.ok ? styles.ok : styles.error}>{estado.texto}</Text> : null}
        <Button title="Guardar" variant="dark" disabled={!valido} loading={guardando} onPress={guardar} />
      </View>
    </Card>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  numerico,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numerico?: boolean;
  error?: string | null;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        keyboardType={numerico ? 'number-pad' : 'default'}
        autoCapitalize="none"
        style={[styles.input, !!error && { borderColor: colors.danger }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 20 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  kpis: { flexDirection: 'row', gap: 12 },
  kpi: {
    flex: 1,
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E3E6EA',
  },
  kpiDestacado: { backgroundColor: '#FFF3D6', borderColor: '#FFE3A3' },
  kpiLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  kpiValor: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  filaTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  filaDetalle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secundario: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secundarioText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
});
