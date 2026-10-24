import type { LatLng } from '@/components/map/types';

import type { Pedido } from './orders';
import type { Tarifa } from './pricing';
import { supabase } from './supabase';
import type { Vehiculo } from './types';
import type { EstadoSeguro } from './seguros';
import type { DatosVehiculo } from './vehiculos';

// Marketplace (migración 0010): fleteros disponibles cerca del retiro, con el
// precio de las tarifas de su empresa.

export type Fletero = {
  driver_id: string;
  nombre: string;
  empresa: string;
  company_id: string;
  vehiculo: Vehiculo;
  distancia_km: number;
  // Aproximada (~100 m).
  posicion: LatLng;
  precio: number | null;
  // Reputación (promedio de estrellas y cuántas calificaciones tiene).
  estrellas: number | null;
  calificaciones: number;
  // Fletero de ejemplo (solo lo ve el superadmin para previsualizar el marketplace).
  demo?: boolean;
  // Marca, modelo, año y color (sin patente) para dibujar el vehículo.
  auto: DatosVehiculo | null;
  // Ruta de la foto de perfil (bucket "perfiles", migración 0016).
  foto_perfil?: string | null;
  // Estado del seguro del vehículo (migración 0018).
  seguro?: EstadoSeguro | null;
};

// SOLO SUPERADMIN: fleteros de ejemplo alrededor del retiro, con precios
// calculados con las tarifas de Flety (cada "empresa" con un pequeño ajuste),
// para ver cómo luce el marketplace cuando todavía no hay choferes reales.
const DEMO: {
  nombre: string;
  empresa: string;
  vehiculo: Vehiculo;
  km: number;
  rumbo: number;
  ajuste: number;
  estrellas: number | null;
  calificaciones: number;
  auto: DatosVehiculo;
  viajes: number;
  meses: number;
  resenas: { estrellas: number; comentario: string; dias: number }[];
}[] = [
  {
    nombre: 'Martín',
    empresa: 'Fletes Cuyo',
    vehiculo: 'camioneta',
    km: 1.2,
    rumbo: 40,
    ajuste: 1,
    estrellas: 4.9,
    calificaciones: 38,
    auto: { marca: 'Ford', modelo: 'Ranger con caja', anio: '2016', color: 'blanco', patente: 'AE 482 KD' },
    viajes: 52,
    meses: 14,
    resenas: [
      { estrellas: 5, comentario: 'Puntual y súper cuidadoso con la heladera. Lo recomiendo.', dias: 3 },
      { estrellas: 5, comentario: 'Rápido y amable, ayudó a subir todo al tercer piso.', dias: 9 },
      { estrellas: 4, comentario: 'Todo bien, llegó 10 minutos tarde pero avisó.', dias: 21 },
    ],
  },
  {
    nombre: 'Lucía',
    empresa: 'Mudanzas del Sol',
    vehiculo: 'camion',
    km: 2.6,
    rumbo: 160,
    ajuste: 1.08,
    estrellas: 4.8,
    calificaciones: 21,
    auto: { marca: 'Mercedes-Benz', modelo: 'Accelo 815', anio: '2019', color: 'azul', patente: 'AC 915 LM' },
    viajes: 31,
    meses: 9,
    resenas: [
      { estrellas: 5, comentario: 'Mudanza completa en una mañana, impecable.', dias: 5 },
      { estrellas: 5, comentario: 'Trajeron mantas para proteger los muebles. Muy profesionales.', dias: 16 },
    ],
  },
  {
    nombre: 'Diego',
    empresa: 'Fletes Cuyo',
    vehiculo: 'utilitario',
    km: 3.4,
    rumbo: 250,
    ajuste: 1,
    estrellas: null,
    calificaciones: 0,
    auto: { marca: 'Renault', modelo: 'Kangoo', anio: '2021', color: 'rojo', patente: 'AF 207 PR' },
    viajes: 0,
    meses: 0,
    resenas: [],
  },
  {
    nombre: 'Paula',
    empresa: 'Traslados Andes',
    vehiculo: 'camioneta',
    km: 5.1,
    rumbo: 320,
    ajuste: 0.94,
    estrellas: 4.6,
    calificaciones: 12,
    auto: { marca: 'Toyota', modelo: 'Hilux con caja', anio: '2014', color: 'gris', patente: 'OKL 538' },
    viajes: 17,
    meses: 6,
    resenas: [{ estrellas: 4, comentario: 'Buen servicio, precio justo.', dias: 12 }],
  },
];

export function fleterosDeEjemplo(origen: LatLng, km: number, ayudantes: number, tarifas: Tarifa[]): Fletero[] {
  return DEMO.map((d, i) => {
    const rad = (d.rumbo * Math.PI) / 180;
    const posicion = {
      lat: origen.lat + (d.km / 111) * Math.cos(rad),
      lng: origen.lng + (d.km / (111 * Math.cos((origen.lat * Math.PI) / 180))) * Math.sin(rad),
    };
    const t = tarifas.find((x) => x.vehiculo === d.vehiculo);
    const precio = t
      ? Math.round(((t.base + t.por_km * km + t.por_ayudante * ayudantes) * d.ajuste) / 100) * 100
      : null;
    return {
      driver_id: `demo-${i}`,
      nombre: d.nombre,
      empresa: d.empresa,
      company_id: `demo-${d.empresa}`,
      vehiculo: d.vehiculo,
      distancia_km: d.km,
      posicion,
      precio,
      estrellas: d.estrellas,
      calificaciones: d.calificaciones,
      demo: true,
      auto: { marca: d.auto.marca, modelo: d.auto.modelo, anio: d.auto.anio, color: d.auto.color },
      // El fletero nuevo todavía no tiene el seguro verificado.
      seguro: d.calificaciones ? 'verificado' : 'en_revision',
    };
  });
}

type FleteroRow = {
  driver_id: string;
  nombre: string;
  empresa: string;
  company_id: string;
  vehiculo: Vehiculo;
  distancia_km: number | string;
  lat: number;
  lng: number;
  precio: number | string | null;
  estrellas: number | string | null;
  calificaciones: number | null;
  auto: DatosVehiculo | null;
  foto_perfil?: string | null;
  seguro?: EstadoSeguro | null;
};

export async function fleterosDisponibles(
  origen: LatLng,
  km: number,
  ayudantes: number,
  vehiculo: Vehiculo
): Promise<Fletero[]> {
  const { data, error } = await supabase.rpc('fleteros_disponibles', {
    p_lat: origen.lat,
    p_lng: origen.lng,
    p_km: km,
    p_ayudantes: ayudantes,
    p_vehiculo: vehiculo,
  });
  if (error) throw error;
  return ((data as FleteroRow[] | null) ?? []).map((r) => ({
    driver_id: r.driver_id,
    nombre: r.nombre,
    empresa: r.empresa,
    company_id: r.company_id,
    vehiculo: r.vehiculo,
    distancia_km: Number(r.distancia_km),
    posicion: { lat: r.lat, lng: r.lng },
    precio: r.precio == null ? null : Number(r.precio),
    estrellas: r.estrellas == null ? null : Number(r.estrellas),
    calificaciones: r.calificaciones ?? 0,
    auto: r.auto ?? null,
    foto_perfil: r.foto_perfil ?? null,
    seguro: r.seguro ?? null,
  }));
}

// Minutos aproximados en llegar al retiro (ciudad, ~25 km/h promedio).
export function minutosHasta(distanciaKm: number) {
  return Math.max(2, Math.round((distanciaKm / 25) * 60));
}

// ── Reserva del fletero elegido ─────────────────────────────────────────
// El pedido está "reservado" para el fletero elegido hasta solicitado_hasta.
export function reservaVigente(
  p: Pick<Pedido, 'estado' | 'company_solicitada' | 'solicitado_hasta'>,
  ahora = Date.now()
) {
  return (
    p.estado === 'buscando_asignacion' &&
    !!p.company_solicitada &&
    !!p.solicitado_hasta &&
    new Date(p.solicitado_hasta).getTime() > ahora
  );
}

export function segundosRestantes(hasta: string | null, ahora = Date.now()) {
  if (!hasta) return 0;
  return Math.max(0, Math.round((new Date(hasta).getTime() - ahora) / 1000));
}

export function formatoCuenta(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// El elegido libera el pedido: pasa a la cola abierta.
export async function liberarSolicitud(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ company_solicitada: null, driver_solicitado: null })
    .eq('id', orderId);
  if (error) throw new Error('No pudimos liberar el pedido. Probá de nuevo.');
}

// El chofer elegido acepta: queda asignado a él y a su empresa.
export async function aceptarComoChofer(orderId: string, driverId: string, companyId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ estado: 'asignado', company_id: companyId, driver_id: driverId })
    .eq('id', orderId)
    .eq('estado', 'buscando_asignacion')
    .select('id');
  if (error) throw new Error(error.message?.startsWith('Solo ') ? error.message : 'No pudimos aceptar el viaje.');
  if (!data?.length) throw new Error('Ese viaje ya no está disponible.');
}

// ── Tarifas de la empresa ───────────────────────────────────────────────
export async function tarifasDeEmpresa(companyId: string): Promise<Tarifa[]> {
  const { data } = await supabase
    .from('company_tarifas')
    .select('vehiculo, base, por_km, por_ayudante')
    .eq('company_id', companyId);
  return (data ?? []).map((t) => ({
    vehiculo: t.vehiculo as Vehiculo,
    base: Number(t.base),
    por_km: Number(t.por_km),
    por_ayudante: Number(t.por_ayudante),
  }));
}

export async function guardarTarifas(companyId: string, tarifas: Tarifa[]) {
  const { error } = await supabase
    .from('company_tarifas')
    .upsert(tarifas.map((t) => ({ ...t, company_id: companyId, updated_at: new Date().toISOString() })));
  if (error) throw new Error('No pudimos guardar las tarifas. Probá de nuevo.');
}

// ── Perfil del fletero ──────────────────────────────────────────────────
export type PerfilFletero = {
  driver_id: string;
  nombre: string;
  empresa: string;
  empresa_verificada: boolean;
  foto_perfil?: string | null;
  seguro?: EstadoSeguro | null;
  desde: string;
  vehiculo: DatosVehiculo & { patente_completa?: boolean };
  estrellas: number | null;
  calificaciones: number;
  viajes: number;
  resenas: { estrellas: number; comentario: string; fecha: string }[];
};

export async function perfilFletero(driverId: string): Promise<PerfilFletero | null> {
  const { data, error } = await supabase.rpc('perfil_fletero', { p_driver: driverId });
  if (error || !data) return null;
  const p = data as PerfilFletero & { estrellas: number | string | null };
  return { ...p, estrellas: p.estrellas == null ? null : Number(p.estrellas) };
}

// Perfil de un fletero de ejemplo (patente tapada, como la ve el cliente antes de pedir).
export function perfilDeEjemplo(f: Fletero): PerfilFletero | null {
  const d = DEMO[Number(f.driver_id.replace('demo-', ''))];
  if (!d) return null;
  const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - d.meses);
  return {
    driver_id: f.driver_id,
    nombre: `${d.nombre} ${d.nombre === 'Martín' ? 'G.' : d.nombre === 'Lucía' ? 'F.' : d.nombre === 'Diego' ? 'S.' : 'R.'}`,
    empresa: d.empresa,
    empresa_verificada: true,
    seguro: f.seguro ?? null,
    desde: desde.toISOString(),
    vehiculo: { tipo: d.vehiculo, ...d.auto, patente: patenteTapada(d.auto.patente ?? ''), patente_completa: false },
    estrellas: d.estrellas,
    calificaciones: d.calificaciones,
    viajes: d.viajes,
    resenas: d.resenas.map((r) => ({ estrellas: r.estrellas, comentario: r.comentario, fecha: hace(r.dias) })),
  };
}

// Igual que public.patente_tapada (migración 0014).
export function patenteTapada(p: string) {
  if (!p || p.length < 5) return p;
  if (p.length >= 8) return `${p.slice(0, 4)}${'•'.repeat(p.length - 7)}${p.slice(-3)}`;
  return `${p.slice(0, 2)}${'•'.repeat(p.length - 4)}${p.slice(-2)}`;
}
