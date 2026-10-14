import { createContext, useContext, useState } from 'react';

import type { GeoPoint, Tamano, TipoServicio, Vehiculo } from './types';

export type FotoLocal = {
  uri: string;
  mimeType: string;
  fileName: string;
  // Solo en web: el File del navegador (más directo para subir).
  file?: File;
};

// Pedido programado: día (clave local AAAA-MM-DD) y hora en punto.
export type Cuando = { modo: 'ahora' } | { modo: 'programado'; fecha: string; hora: number };

// Horarios que se pueden reservar (de 7 a 20 h) y hasta cuántos días adelante.
export const HORA_DESDE = 7;
export const HORA_HASTA = 20;
export const DIAS_ADELANTE = 60;
// Un programado tiene que ser al menos 1 hora después de ahora.
const ANTICIPACION_MS = 60 * 60 * 1000;

export function fechaKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function fechaDeKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function horarioDisponible(fecha: string, hora: number, ahora = new Date()): boolean {
  const date = fechaDeKey(fecha);
  date.setHours(hora, 0, 0, 0);
  const limite = new Date(ahora);
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() + DIAS_ADELANTE);
  return date.getTime() >= ahora.getTime() + ANTICIPACION_MS && date <= limite;
}

// Primer horario libre de ese día (o null si ya no queda ninguno).
export function primeraHoraDisponible(fecha: string, ahora = new Date()): number | null {
  for (let hora = HORA_DESDE; hora <= HORA_HASTA; hora++) {
    if (horarioDisponible(fecha, hora, ahora)) return hora;
  }
  return null;
}

// Al tocar "Programar": mañana a las 9.
export function cuandoProgramadoInicial(ahora = new Date()): Cuando {
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  return { modo: 'programado', fecha: fechaKey(manana), hora: 9 };
}

export type PedidoDraft = {
  tipo: TipoServicio;
  origen: GeoPoint | null;
  destino: GeoPoint | null;
  tamano: Tamano;
  ayudantes: number;
  cuando: Cuando;
  nota: string;
  fotos: FotoLocal[];
  vehiculo: Vehiculo | null;
};

export const MAX_FOTOS = 5;

const INITIAL: PedidoDraft = {
  tipo: 'flete',
  origen: null,
  destino: null,
  tamano: 'mediano',
  ayudantes: 1,
  cuando: { modo: 'ahora' },
  nota: '',
  fotos: [],
  vehiculo: null,
};

type DraftContext = {
  draft: PedidoDraft;
  update: (patch: Partial<PedidoDraft>) => void;
  reset: () => void;
};

const Ctx = createContext<DraftContext | null>(null);

// Borrador del pedido compartido entre "nuevo pedido" y "elegir vehículo".
export function PedidoDraftProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: Partial<PedidoDraft>;
}) {
  const [draft, setDraft] = useState<PedidoDraft>(() => ({ ...INITIAL, ...initial }));
  return (
    <Ctx.Provider
      value={{
        draft,
        update: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
        reset: () => setDraft(INITIAL),
      }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePedidoDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePedidoDraft fuera de PedidoDraftProvider');
  return ctx;
}

// Fecha y hora elegidas, o null si es "ahora".
export function programadoPara(cuando: Cuando): Date | null {
  if (cuando.modo === 'ahora') return null;
  const date = fechaDeKey(cuando.fecha);
  date.setHours(cuando.hora, 0, 0, 0);
  return date;
}

export function draftListoParaCotizar(draft: PedidoDraft): string | null {
  if (!draft.origen) return 'Elegí la dirección de retiro.';
  if (!draft.destino) return 'Elegí la dirección de entrega.';
  if (draft.origen.lat === draft.destino.lat && draft.origen.lng === draft.destino.lng) {
    return 'El retiro y la entrega no pueden ser el mismo lugar.';
  }
  if (draft.cuando.modo === 'programado' && !horarioDisponible(draft.cuando.fecha, draft.cuando.hora)) {
    return 'Ese horario ya pasó o está muy cerca. Elegí otro día u hora.';
  }
  return null;
}
