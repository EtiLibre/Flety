import { createContext, useContext, useState } from 'react';

import type { GeoPoint, Tamano, TipoServicio, Vehiculo } from './types';

export type FotoLocal = {
  uri: string;
  mimeType: string;
  fileName: string;
  // Solo en web: el File del navegador (más directo para subir).
  file?: File;
};

export type Franja = 'manana' | 'tarde' | 'noche';

export const FRANJAS: Record<Franja, { label: string; hora: number }> = {
  manana: { label: '8 a 12 h', hora: 8 },
  tarde: { label: '12 a 16 h', hora: 12 },
  noche: { label: '16 a 20 h', hora: 16 },
};

export const DIAS = ['Hoy', 'Mañana', 'Pasado mañana'] as const;

export type Cuando = { modo: 'ahora' } | { modo: 'programado'; dia: 0 | 1 | 2; franja: Franja };

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

// Fecha/hora de inicio de la franja elegida, o null si es "ahora".
export function programadoPara(cuando: Cuando): Date | null {
  if (cuando.modo === 'ahora') return null;
  const date = new Date();
  date.setDate(date.getDate() + cuando.dia);
  date.setHours(FRANJAS[cuando.franja].hora, 0, 0, 0);
  return date;
}

export function draftListoParaCotizar(draft: PedidoDraft): string | null {
  if (!draft.origen) return 'Elegí la dirección de retiro.';
  if (!draft.destino) return 'Elegí la dirección de entrega.';
  if (draft.origen.lat === draft.destino.lat && draft.origen.lng === draft.destino.lng) {
    return 'El retiro y la entrega no pueden ser el mismo lugar.';
  }
  return null;
}
