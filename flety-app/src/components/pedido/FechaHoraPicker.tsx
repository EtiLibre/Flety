import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DIAS_ADELANTE,
  HORA_DESDE,
  HORA_HASTA,
  fechaDeKey,
  fechaKey,
  horarioDisponible,
  primeraHoraDisponible,
} from '@/lib/pedido-draft';
import { colors, fonts, radius } from '@/theme';

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const mesFormat = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const diaLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

const GRUPOS: { titulo: string; desde: number; hasta: number }[] = [
  { titulo: 'Mañana', desde: HORA_DESDE, hasta: 11 },
  { titulo: 'Tarde', desde: 12, hasta: 17 },
  { titulo: 'Noche', desde: 18, hasta: HORA_HASTA },
];

type Valor = { fecha: string; hora: number };

function rango(desde: number, hasta: number) {
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
}

// Calendario mensual + horarios para programar el pedido (web y celular).
export function FechaHoraPicker({ value, onChange }: { value: Valor; onChange: (value: Valor) => void }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ultimo = new Date(hoy);
  ultimo.setDate(hoy.getDate() + DIAS_ADELANTE);

  const elegido = fechaDeKey(value.fecha);
  const [mes, setMes] = useState(() => new Date(elegido.getFullYear(), elegido.getMonth(), 1));

  const primerDiaSemana = (mes.getDay() + 6) % 7; // semana arranca el lunes
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas: (Date | null)[] = [
    ...Array.from({ length: primerDiaSemana }, () => null),
    ...rango(1, diasEnMes).map((d) => new Date(mes.getFullYear(), mes.getMonth(), d)),
  ];
  while (celdas.length % 7) celdas.push(null);
  const semanas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));

  const hayAnterior = mes > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const haySiguiente = new Date(mes.getFullYear(), mes.getMonth() + 1, 1) <= ultimo;
  const mesTitulo = mesFormat.format(mes);

  function elegirDia(date: Date) {
    const fecha = fechaKey(date);
    const hora = horarioDisponible(fecha, value.hora) ? value.hora : primeraHoraDisponible(fecha);
    if (hora !== null) onChange({ fecha, hora });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.mes}>{mesTitulo.charAt(0).toUpperCase() + mesTitulo.slice(1)}</Text>
        <View style={styles.nav}>
          <NavButton
            label="Mes anterior"
            disabled={!hayAnterior}
            onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
            <ChevronLeft size={18} color={colors.ink} strokeWidth={2.4} />
          </NavButton>
          <NavButton
            label="Mes siguiente"
            disabled={!haySiguiente}
            onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
            <ChevronRight size={18} color={colors.ink} strokeWidth={2.4} />
          </NavButton>
        </View>
      </View>

      <View style={styles.week}>
        {SEMANA.map((d, i) => (
          <Text key={i} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {semanas.map((semana, i) => (
        <View key={i} style={styles.week}>
          {semana.map((date, j) => {
            if (!date) return <View key={j} style={styles.cell} />;
            const key = fechaKey(date);
            const fuera = date < hoy || date > ultimo || primeraHoraDisponible(key) === null;
            const selected = key === value.fecha;
            const esHoy = date.getTime() === hoy.getTime();
            return (
              <View key={j} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={diaLargo.format(date)}
                  accessibilityState={{ selected, disabled: fuera }}
                  disabled={fuera}
                  onPress={() => elegirDia(date)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.day,
                    selected && styles.daySelected,
                    !selected && !fuera && (pressed || hovered) && styles.dayHover,
                  ]}>
                  <Text style={[styles.dayText, fuera && styles.dayTextOff, selected && styles.dayTextSelected]}>
                    {date.getDate()}
                  </Text>
                  {esHoy ? <View style={[styles.todayDot, selected && { backgroundColor: colors.accent }]} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.divider} />

      <Text style={styles.horaTitulo}>Hora de llegada · {diaLargo.format(elegido)}</Text>
      {GRUPOS.map((grupo) => (
        <View key={grupo.titulo} style={styles.grupo}>
          <Text style={styles.grupoTitulo}>{grupo.titulo}</Text>
          <View style={styles.horas}>
            {rango(grupo.desde, grupo.hasta).map((hora) => {
              const disponible = horarioDisponible(value.fecha, hora);
              const selected = hora === value.hora;
              return (
                <Pressable
                  key={hora}
                  accessibilityRole="button"
                  accessibilityLabel={`${hora}:00 horas`}
                  accessibilityState={{ selected, disabled: !disponible }}
                  disabled={!disponible}
                  onPress={() => onChange({ fecha: value.fecha, hora })}
                  style={[styles.hora, selected && styles.horaSelected, !disponible && styles.horaOff]}>
                  <Text
                    style={[styles.horaText, selected && styles.horaTextSelected, !disponible && styles.dayTextOff]}>
                    {hora}:00
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function NavButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.navButton, disabled && { opacity: 0.3 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 4,
    backgroundColor: colors.white,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mes: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.3, color: colors.ink },
  nav: { flexDirection: 'row', gap: 6 },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  week: { flexDirection: 'row' },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
    paddingVertical: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayHover: { backgroundColor: colors.surface },
  daySelected: { backgroundColor: colors.ink },
  dayText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  dayTextOff: { color: '#B8BFC8' },
  dayTextSelected: { color: colors.white, fontFamily: fonts.bold },
  todayDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  horaTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 4 },
  grupo: { gap: 6, marginTop: 6 },
  grupoTitulo: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hora: {
    minWidth: 64,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  horaSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  horaOff: { backgroundColor: colors.surface, borderColor: colors.surface },
  horaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  horaTextSelected: { color: colors.white },
});
