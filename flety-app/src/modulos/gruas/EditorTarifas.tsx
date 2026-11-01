import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatARS } from '@/lib/pricing';
import { colors, fonts } from '@/theme';

import { guardarTarifas } from './api';
import { Campo, estilosGruista as eg, Tarjeta, Titulo } from './pantalla';
import type { Adicional, Catalogo, Dueno, Recargos, Tarifa } from './tipos';
import { G } from './ui';

type Fila = { activo: boolean; base: string; por_km: string; km_incluidos: string; minimo: string };
export type DatosTarifas = { tarifas: Tarifa[]; recargos: Recargos | null; adicionales: Adicional[] };

const num = (v: string) => Number(v.replace(/\D/g, '')) || 0;
const soloNum = (v: string) => v.replace(/\D/g, '').slice(0, 8);
const hora = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}:${n.slice(2)}` : n;
};
const horaOk = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// Editor de tarifas del dueño (gruista independiente o empresa de grúas): lo
// usan la app del gruista y el panel de la empresa. `soloVer`: vista de ejemplo.
export function EditorTarifas({
  tiposIniciales,
  dueno,
  catalogo,
  datos,
  soloVer,
}: {
  tiposIniciales: string[];
  dueno: Dueno;
  catalogo: Catalogo;
  datos: DatosTarifas;
  soloVer?: boolean;
}) {
  const tipos = catalogo.tipos.filter((t) => t.activo !== false);
  const [filas, setFilas] = useState<Record<string, Fila>>(() => {
    const iniciales = datos.tarifas.length
      ? datos.tarifas.map((t) => t.tipo_vehiculo)
      : tiposIniciales;
    return Object.fromEntries(
      tipos.map((t) => {
        const x = datos.tarifas.find((y) => y.tipo_vehiculo === t.id);
        return [
          t.id,
          {
            activo: iniciales.includes(t.id),
            base: x ? String(x.base) : '',
            por_km: x ? String(x.por_km) : '',
            km_incluidos: x ? String(x.km_incluidos) : '',
            minimo: x ? String(x.minimo) : '',
          },
        ];
      })
    );
  });
  const r = datos.recargos;
  const [nocturno, setNocturno] = useState(r ? String(r.nocturno_pct) : '0');
  const [desde, setDesde] = useState(r ? r.nocturno_desde.slice(0, 5) : '22:00');
  const [hasta, setHasta] = useState(r ? r.nocturno_hasta.slice(0, 5) : '06:00');
  const [finde, setFinde] = useState(r ? String(r.finde_pct) : '0');
  const [adicionales, setAdicionales] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      catalogo.situaciones.map((s) => [
        s.id,
        String(datos.adicionales.find((a) => a.situacion_id === s.id)?.monto ?? ''),
      ])
    )
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const activos = tipos.filter((t) => filas[t.id]?.activo);
  const incompletos = activos.filter((t) => !num(filas[t.id].base) && !num(filas[t.id].minimo));
  const listo = activos.length > 0 && !incompletos.length && horaOk(desde) && horaOk(hasta);

  function cambiar(tipo: string, campo: keyof Fila, valor: string | boolean) {
    setOk(false);
    setFilas((f) => ({ ...f, [tipo]: { ...f[tipo], [campo]: valor } }));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      await guardarTarifas(
        dueno,
        activos.map((t) => ({
          ...dueno,
          tipo_vehiculo: t.id,
          base: num(filas[t.id].base),
          por_km: num(filas[t.id].por_km),
          km_incluidos: num(filas[t.id].km_incluidos),
          minimo: num(filas[t.id].minimo),
        })),
        {
          ...dueno,
          nocturno_pct: Math.min(200, num(nocturno)),
          nocturno_desde: desde,
          nocturno_hasta: hasta,
          finde_pct: Math.min(200, num(finde)),
        },
        catalogo.situaciones.map((s) => ({ ...dueno, situacion_id: s.id, monto: num(adicionales[s.id] ?? '') }))
      );
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tus tarifas.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      {tipos.map((t) => {
        const f = filas[t.id];
        const ejemplo = Math.max(num(f.minimo), num(f.base) + num(f.por_km) * Math.max(0, 10 - num(f.km_incluidos)));
        return (
          <Tarjeta key={t.id} style={f.activo ? { borderColor: G.acento } : undefined}>
            <View style={styles.top}>
              <Text style={[eg.fuerte, { flex: 1 }]}>{t.nombre}</Text>
              <Switch
                accessibilityLabel={`Llevo ${t.nombre}`}
                value={f.activo}
                onValueChange={(v) => cambiar(t.id, 'activo', v)}
                trackColor={{ true: G.acento, false: colors.dark.line }}
                thumbColor={colors.white}
              />
            </View>
            {f.activo ? (
              <>
                <View style={eg.fila}>
                  <Campo
                    label="Salida ($)"
                    value={f.base}
                    onChangeText={(v) => cambiar(t.id, 'base', soloNum(v))}
                    keyboardType="number-pad"
                  />
                  <Campo
                    label="Por km ($)"
                    value={f.por_km}
                    onChangeText={(v) => cambiar(t.id, 'por_km', soloNum(v))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={eg.fila}>
                  <Campo
                    label="Km incluidos"
                    value={f.km_incluidos}
                    onChangeText={(v) => cambiar(t.id, 'km_incluidos', soloNum(v).slice(0, 3))}
                    keyboardType="number-pad"
                  />
                  <Campo
                    label="Mínimo ($)"
                    value={f.minimo}
                    onChangeText={(v) => cambiar(t.id, 'minimo', soloNum(v))}
                    keyboardType="number-pad"
                  />
                </View>
                {ejemplo > 0 ? (
                  <Text style={eg.muted}>
                    Ejemplo, traslado de 10 km: cobrás <Text style={styles.ejemplo}>{formatARS(ejemplo)}</Text> (sin
                    recargos ni adicionales).
                  </Text>
                ) : (
                  <Text style={eg.error}>Poné al menos la salida o el mínimo.</Text>
                )}
              </>
            ) : null}
          </Tarjeta>
        );
      })}

      <Tarjeta>
        <Titulo>Recargos</Titulo>
        <View style={eg.fila}>
          <Campo
            label="Nocturno (%)"
            value={nocturno}
            onChangeText={(v) => setNocturno(soloNum(v).slice(0, 3))}
            keyboardType="number-pad"
          />
          <Campo
            label="Desde"
            value={desde}
            onChangeText={(v) => setDesde(hora(v))}
            keyboardType="number-pad"
            placeholder="22:00"
            error={desde && !horaOk(desde) ? 'HH:MM' : null}
          />
          <Campo
            label="Hasta"
            value={hasta}
            onChangeText={(v) => setHasta(hora(v))}
            keyboardType="number-pad"
            placeholder="06:00"
            error={hasta && !horaOk(hasta) ? 'HH:MM' : null}
          />
        </View>
        <Campo
          label="Sábados, domingos y feriados (%)"
          value={finde}
          onChangeText={(v) => setFinde(soloNum(v).slice(0, 3))}
          keyboardType="number-pad"
        />
      </Tarjeta>

      <Tarjeta>
        <Titulo>Adicionales por situación</Titulo>
        <Text style={eg.muted}>Se suman cuando el cliente marca la situación. Dejá vacío si no cobrás extra.</Text>
        {catalogo.situaciones.map((s) => (
          <Campo
            key={s.id}
            label={`${s.nombre} ($)`}
            value={adicionales[s.id] ?? ''}
            onChangeText={(v) => setAdicionales((a) => ({ ...a, [s.id]: soloNum(v) }))}
            keyboardType="number-pad"
          />
        ))}
      </Tarjeta>

      {error ? <Text style={eg.error}>{error}</Text> : null}
      {ok ? <Text style={eg.ok}>Tarifas guardadas. Ya se usan en los próximos pedidos.</Text> : null}
      {soloVer ? (
        <Text style={eg.muted}>Vista de ejemplo: los cambios no se guardan.</Text>
      ) : (
        <Button title="Guardar tarifas" variant="grua" loading={guardando} disabled={!listo} onPress={guardar} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ejemplo: { fontFamily: fonts.bold, color: colors.dark.text },
});
