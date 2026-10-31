import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatARS } from '@/lib/pricing';
import { guardarTarifas, tarifasDe, type MiGruista } from '@/modulos/gruas/api';
import { useCatalogoGruas, useMiGruista } from '@/modulos/gruas/hooks';
import { Campo, estilosGruista as eg, Subpantalla, Tarjeta, Titulo } from '@/modulos/gruas/pantalla';
import type { Adicional, Catalogo, Dueno, Recargos, Tarifa } from '@/modulos/gruas/tipos';
import { G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

type Fila = { activo: boolean; base: string; por_km: string; km_incluidos: string; minimo: string };
type Datos = { tarifas: Tarifa[]; recargos: Recargos | null; adicionales: Adicional[] };

const num = (v: string) => Number(v.replace(/\D/g, '')) || 0;
const soloNum = (v: string) => v.replace(/\D/g, '').slice(0, 8);
const hora = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}:${n.slice(2)}` : n;
};
const horaOk = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// Tarifas del dueño (gruista independiente o empresa de auxilio). El cliente
// ve este precio más la comisión de la plataforma.
export default function TarifasGruista() {
  const { gruista, cargando } = useMiGruista();
  const { catalogo } = useCatalogoGruas();
  const gestiona = !!gruista && (!gruista.prestador.empresa_id || gruista.esDueno);
  const dueno: Dueno | null = gruista
    ? gruista.empresa
      ? { empresa_id: gruista.empresa.id, prestador_id: null }
      : { empresa_id: null, prestador_id: gruista.prestador.id }
    : null;
  const clave = dueno ? `${dueno.empresa_id}:${dueno.prestador_id}` : null;
  const [res, setRes] = useState<{ clave: string; datos: Datos | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!clave || !gestiona) return;
    let cancelled = false;
    const [empresa_id, prestador_id] = clave.split(':').map((x) => (x === 'null' ? null : x));
    tarifasDe({ empresa_id, prestador_id })
      .then((datos) => !cancelled && setRes({ clave, datos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [clave, gestiona]);

  const actual = res && res.clave === clave ? res : null;

  return (
    <Subpantalla
      titulo={gruista?.esDueno ? 'Tarifas de la empresa' : 'Mis tarifas'}
      subtitulo="Lo que cobrás vos. El cliente ve este precio más la comisión de la plataforma.">
      {cargando || !catalogo ? (
        <ActivityIndicator color={G.acento} />
      ) : !gruista ? (
        <Text style={eg.muted}>Primero date de alta como gruista.</Text>
      ) : !gestiona ? (
        <Tarjeta>
          <Text style={eg.texto}>Las tarifas las define {gruista.empresa?.nombre ?? 'tu empresa'}.</Text>
        </Tarjeta>
      ) : actual?.error ? (
        <Text style={eg.error}>{actual.error}</Text>
      ) : !actual?.datos || !dueno ? (
        <ActivityIndicator color={G.acento} />
      ) : (
        <Editor g={gruista} dueno={dueno} catalogo={catalogo} datos={actual.datos} />
      )}
    </Subpantalla>
  );
}

function Editor({ g, dueno, catalogo, datos }: { g: MiGruista; dueno: Dueno; catalogo: Catalogo; datos: Datos }) {
  const tipos = catalogo.tipos.filter((t) => t.activo !== false);
  const [filas, setFilas] = useState<Record<string, Fila>>(() => {
    const iniciales = datos.tarifas.length
      ? datos.tarifas.map((t) => t.tipo_vehiculo)
      : (g.unidad?.tipos_vehiculo ?? []);
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
      <Button title="Guardar tarifas" variant="grua" loading={guardando} disabled={!listo} onPress={guardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ejemplo: { fontFamily: fonts.bold, color: colors.dark.text },
});
