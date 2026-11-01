import { useCallback, useEffect, useState } from 'react';

import { MENDOZA } from '@/components/map/types';
import { useAuth } from '@/lib/auth';

import { flota, invitaciones, serviciosDeEmpresa, type MiGruista } from './api';
import { useMiGruista } from './hooks';
import type { Empresa, Prestador, Solicitud } from './tipos';

// Panel web de la EMPRESA DE GRÚAS: independiente del panel de empresas de
// Mudanzas (otras secciones, otros datos, otro esquema de base). Lo ve el
// dueño de una empresa de grúas; el superadmin lo ve con datos de ejemplo.

export type GruistaFlota = Prestador & { nombre: string | null };
export type Invitacion = { code: string; expires_at: string; used_at: string | null; created_at: string };

export type PanelGruas =
  | { estado: 'cargando' }
  | { estado: 'sin-empresa' }
  | { estado: 'listo'; demo: boolean; empresa: Empresa; gruista: MiGruista | null };

export function useEmpresaGruas(): PanelGruas {
  const { role } = useAuth();
  const { gruista, cargando } = useMiGruista();
  if (gruista?.esDueno && gruista.empresa) return { estado: 'listo', demo: false, empresa: gruista.empresa, gruista };
  if (cargando) return { estado: 'cargando' };
  if (role === 'superadmin') return { estado: 'listo', demo: true, empresa: EMPRESA_DEMO, gruista: null };
  return { estado: 'sin-empresa' };
}

export type DatosEmpresa = { gruistas: GruistaFlota[]; codigos: Invitacion[]; servicios: Solicitud[] };

// Flota, códigos de invitación y servicios de la empresa (o los de ejemplo).
export function useDatosEmpresa(panel: PanelGruas) {
  const empresaId = panel.estado === 'listo' && !panel.demo ? panel.empresa.id : null;
  const demo = panel.estado === 'listo' && panel.demo;
  const [version, setVersion] = useState(0);
  const clave = `${empresaId}:${version}`;
  const [res, setRes] = useState<{ clave: string; datos: DatosEmpresa | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      const [gruistas, codigos] = await Promise.all([flota(empresaId), invitaciones(empresaId)]);
      const servicios = await serviciosDeEmpresa(gruistas.map((g) => g.id));
      return { gruistas, codigos: codigos as Invitacion[], servicios };
    })()
      .then((datos) => !cancelled && setRes({ clave, datos, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, datos: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [empresaId, clave]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  if (demo) return { datos: DATOS_DEMO, error: null, cargando: false, recargar };
  const actual = res?.clave === clave ? res : null;
  return { datos: actual?.datos ?? null, error: actual?.error ?? null, cargando: !!empresaId && !actual, recargar };
}

export function nombreGruista(datos: DatosEmpresa | null, prestadorId: string | null) {
  return datos?.gruistas.find((g) => g.id === prestadorId)?.nombre?.split(' ')[0] ?? 'Gruista';
}

// ── Datos de ejemplo (vista del superadmin) ─────────────────────────────
const EMPRESA_DEMO: Empresa = {
  id: 'demo-empresa',
  nombre: 'Auxilio Cuyo (ejemplo)',
  cuit: '30712345678',
  owner_id: 'demo',
  zona_id: null,
  estado: 'aprobada',
  motivo: null,
  created_at: '2026-09-01T12:00:00Z',
};

const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();

function gruistaDemo(i: number, nombre: string, estado: Prestador['estado'], disponible: boolean): GruistaFlota {
  return {
    id: `demo-g${i}`,
    user_id: `demo-u${i}`,
    empresa_id: EMPRESA_DEMO.id,
    zona_id: null,
    estado,
    motivo: null,
    telefono: `261555000${i}`,
    foto: null,
    disponible,
    lat: MENDOZA.lat,
    lng: MENDOZA.lng,
    ubicacion_at: hace(2),
    created_at: hace(60 * 24 * (30 - i)),
    nombre,
  };
}

function servicioDemo(
  i: number,
  prestador: string,
  estado: Solicitud['estado'],
  minutos: number,
  tipo: string,
  motivo: string,
  origen: string,
  destino: string | null,
  precio: number
): Solicitud {
  const total = Math.round((precio * 1.1) / 100) * 100;
  return {
    id: `demo-s${i}`,
    cliente_id: 'demo-cliente',
    zona_id: null,
    origen: { lat: MENDOZA.lat, lng: MENDOZA.lng, direccion: origen },
    destino: destino ? { lat: MENDOZA.lat - 0.02, lng: MENDOZA.lng + 0.02, direccion: destino } : null,
    distancia_km: destino ? 6.4 : 0,
    tipo_vehiculo: tipo,
    vehiculo: {},
    motivo,
    situaciones: [],
    nota: null,
    estado,
    prestador_solicitado: null,
    precio_max: total,
    precio_sugerido: null,
    prestador_id: prestador,
    unidad_id: null,
    cotizacion: null,
    precio_total: total,
    precio_prestador: precio,
    comision: total - precio,
    cargo_cancelacion: null,
    motivo_cancelacion: estado === 'cancelada_cliente' ? 'Cancelado por el cliente' : null,
    created_at: hace(minutos),
    asignada_at: hace(minutos - 1),
    en_camino_at: null,
    en_origen_at: null,
    trasladando_at: null,
    finalizada_at: estado === 'finalizada' ? hace(minutos - 50) : null,
    cancelada_at: null,
  } as Solicitud;
}

const DATOS_DEMO: DatosEmpresa = {
  gruistas: [
    gruistaDemo(1, 'Raúl Benítez', 'aprobado', true),
    gruistaDemo(2, 'Lucas Ortiz', 'aprobado', true),
    gruistaDemo(3, 'Sergio Molina', 'aprobado', false),
    gruistaDemo(4, 'Pablo Díaz', 'pendiente', false),
  ],
  codigos: [{ code: 'GRU-48K2', expires_at: hace(-60 * 24 * 5), used_at: null, created_at: hace(60) }],
  servicios: [
    servicioDemo(
      1,
      'demo-g1',
      'en_camino',
      12,
      'auto',
      'no_arranca',
      'Av. San Martín 1200, Mendoza',
      'Taller Pérez, Godoy Cruz',
      41000
    ),
    servicioDemo(
      2,
      'demo-g2',
      'trasladando',
      35,
      'camioneta',
      'choque',
      'Acceso Este km 5, Guaymallén',
      'Mendoza Motors, Ciudad',
      52000
    ),
    servicioDemo(3, 'demo-g1', 'finalizada', 60 * 5, 'moto', 'pinchadura', 'Belgrano 900, Ciudad', null, 18000),
    servicioDemo(4, 'demo-g3', 'finalizada', 60 * 26, 'auto', 'bateria', 'Las Heras 300, Ciudad', null, 15000),
    servicioDemo(
      5,
      'demo-g2',
      'finalizada',
      60 * 50,
      'utilitario',
      'falla_mecanica',
      'Costanera 2500, Godoy Cruz',
      'Taller Ruta 40, Luján',
      63000
    ),
    servicioDemo(6, 'demo-g3', 'cancelada_cliente', 60 * 72, 'auto', 'sin_combustible', 'Perú 1500, Ciudad', null, 0),
  ],
};
