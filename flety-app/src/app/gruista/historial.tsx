import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PantallaTab } from '@/components/nav/PantallaTab';
import { Segmented } from '@/components/pedido/Choice';
import { formatARS } from '@/lib/pricing';
import { useMiGruista, useServiciosGruista } from '@/modulos/gruas/hooks';
import { estilosGruista as eg, Tarjeta } from '@/modulos/gruas/pantalla';
import type { Solicitud } from '@/modulos/gruas/tipos';
import { EstadoBadge, G } from '@/modulos/gruas/ui';
import { colors, fonts } from '@/theme';

const d = colors.dark;

const fecha = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type Periodo = 'semana' | 'mes' | 'todo';

function desde(periodo: Periodo) {
  const ahora = new Date();
  if (periodo === 'todo') return 0;
  if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  const lunes = new Date(ahora);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes.getTime();
}

function resumen(servicios: Solicitud[], periodo: Periodo) {
  const inicio = desde(periodo);
  const hechos = servicios.filter(
    (s) => s.estado === 'finalizada' && s.finalizada_at && new Date(s.finalizada_at).getTime() >= inicio
  );
  return {
    cantidad: hechos.length,
    ganado: hechos.reduce((t, s) => t + (s.precio_prestador ?? 0), 0),
    km: hechos.reduce((t, s) => t + (s.distancia_km ?? 0), 0),
  };
}

// Historial y ganancias del gruista.
export default function HistorialGruista() {
  const { gruista } = useMiGruista();
  const { servicios, cargando, error } = useServiciosGruista(gruista?.prestador.id ?? null);
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const r = resumen(servicios, periodo);

  return (
    <PantallaTab titulo="Historial" subtitulo="Tus servicios y lo que ganaste." tema="oscuro">
      {!gruista ? (
        <Text style={eg.muted}>Cuando hagas tu primer servicio de grúa, aparece acá.</Text>
      ) : (
        <>
          <Segmented
            tema="oscuro"
            options={[
              { value: 'semana', label: 'Esta semana' },
              { value: 'mes', label: 'Este mes' },
              { value: 'todo', label: 'Todo' },
            ]}
            value={periodo}
            onChange={setPeriodo}
          />
          <View style={styles.resumen}>
            <Dato valor={formatARS(r.ganado)} label="ganado" />
            <View style={styles.sep} />
            <Dato valor={String(r.cantidad)} label={r.cantidad === 1 ? 'servicio' : 'servicios'} />
            <View style={styles.sep} />
            <Dato valor={`${Math.round(r.km)}`} label="km" />
          </View>
          <Text style={eg.muted}>Ganancia = tu tarifa, sin la comisión de la plataforma.</Text>

          {cargando ? (
            <ActivityIndicator color={G.acento} />
          ) : error ? (
            <Text style={eg.error}>{error}</Text>
          ) : servicios.length ? (
            servicios.map((s) => (
              <Tarjeta key={s.id}>
                <View style={styles.top}>
                  <Text style={[eg.muted, { flex: 1 }]} numberOfLines={1}>
                    {fecha.format(new Date(s.created_at))}
                  </Text>
                  <EstadoBadge estado={s.estado} />
                </View>
                <Text style={eg.fuerte} numberOfLines={1}>
                  {s.origen.direccion ?? 'Retiro'}
                </Text>
                <Text style={eg.muted} numberOfLines={1}>
                  → {s.destino?.direccion ?? 'Destino'} · {s.distancia_km} km
                </Text>
                {s.precio_prestador != null ? <Text style={styles.monto}>{formatARS(s.precio_prestador)}</Text> : null}
              </Tarjeta>
            ))
          ) : (
            <Text style={eg.muted}>Todavía no hiciste servicios.</Text>
          )}
        </>
      )}
    </PantallaTab>
  );
}

function Dato({ valor, label }: { valor: string; label: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={eg.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: G.tinta,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  datoValor: { fontFamily: fonts.display, fontSize: 19, color: d.text },
  sep: { width: 1, height: 30, backgroundColor: '#4A2A18' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monto: { fontFamily: fonts.bold, fontSize: 15, color: G.acento },
});
