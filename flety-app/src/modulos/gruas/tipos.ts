import type { GeoPoint } from '@/lib/types';

// Tipos del negocio Grúas (esquema "gruas" de la base, migraciones 0020-0022).
// Independientes de los de Flety Mudanzas.

export type EstadoSolicitud =
  | 'buscando'
  | 'asignada'
  | 'en_camino'
  | 'en_origen'
  | 'trasladando'
  | 'finalizada'
  | 'sin_grua'
  | 'cancelada_cliente'
  | 'cancelada_admin';

export type Item = { id: string; nombre: string; orden?: number; activo?: boolean };

export type Zona = {
  id: string;
  provincia: string;
  ciudad: string;
  lat: number;
  lng: number;
  radio_km: number;
  recargo_pct: number;
  comision_pct: number | null;
  activa: boolean;
};

export type Catalogo = {
  tipos: Item[];
  motivos: Item[];
  situaciones: Item[];
  modalidades: (Item & { descripcion: string | null })[];
  zonas: Zona[];
};

export type Cotizacion = {
  base: number;
  por_km: number;
  km: number;
  km_incluidos: number;
  km_cobrados: number;
  subtotal: number;
  nocturno: number;
  fin_de_semana: number;
  zona: number;
  adicionales: number;
  tarifa_prestador: number;
  comision_pct: number;
  comision: number;
  total: number;
};

export type OpcionGrua = {
  distancia_km: number;
  eta_min: number;
  lat: number;
  lng: number;
  total: number;
  cotizacion: Cotizacion;
};

export type ResultadoCotizar =
  | { cobertura: false }
  | { cobertura: true; zona: { id: string; ciudad: string; provincia: string }; km: number; opciones: OpcionGrua[] };

export type Vehiculo = { marca?: string; modelo?: string; patente?: string; color?: string };

export type Solicitud = {
  id: string;
  cliente_id: string;
  zona_id: string | null;
  origen: GeoPoint;
  destino: GeoPoint | null;
  distancia_km: number;
  tipo_vehiculo: string;
  vehiculo: Vehiculo;
  motivo: string;
  situaciones: string[];
  nota: string | null;
  estado: EstadoSolicitud;
  precio_max: number | null;
  precio_sugerido: number | null;
  prestador_id: string | null;
  unidad_id: string | null;
  cotizacion: Cotizacion | null;
  precio_total: number | null;
  precio_prestador: number | null;
  comision: number | null;
  cargo_cancelacion: number | null;
  motivo_cancelacion: string | null;
  created_at: string;
  asignada_at: string | null;
  en_camino_at: string | null;
  en_origen_at: string | null;
  trasladando_at: string | null;
  finalizada_at: string | null;
  cancelada_at: string | null;
};

export const SOLICITUD_COLS =
  'id, cliente_id, zona_id, origen, destino, distancia_km, tipo_vehiculo, vehiculo, motivo, situaciones, nota, estado, precio_max, precio_sugerido, prestador_id, unidad_id, cotizacion, precio_total, precio_prestador, comision, cargo_cancelacion, motivo_cancelacion, created_at, asignada_at, en_camino_at, en_origen_at, trasladando_at, finalizada_at, cancelada_at';

export type GruaAsignada = {
  nombre: string;
  foto: string | null;
  empresa: string | null;
  lat: number | null;
  lng: number | null;
  ubicacion_at: string | null;
  unidad: { patente: string | null; marca: string | null; modelo: string | null; modalidad: string | null };
  estrellas: number | null;
  calificaciones: number;
  servicios: number;
};

export type Oferta = {
  id: string;
  solicitud_id: string;
  prestador_id: string;
  cotizacion: Cotizacion;
  precio_total: number;
  precio_prestador: number;
  comision: number;
  distancia_km: number;
  eta_min: number;
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';
  enviada_at: string;
  vence_at: string;
};

export type Empresa = {
  id: string;
  nombre: string;
  cuit: string | null;
  owner_id: string;
  zona_id: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'suspendida';
  motivo: string | null;
  created_at: string;
};

export type Prestador = {
  id: string;
  user_id: string;
  empresa_id: string | null;
  zona_id: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';
  motivo: string | null;
  telefono: string | null;
  foto: string | null;
  disponible: boolean;
  lat: number | null;
  lng: number | null;
  ubicacion_at: string | null;
  created_at: string;
};

export const PRESTADOR_COLS =
  'id, user_id, empresa_id, zona_id, estado, motivo, telefono, foto, disponible, lat, lng, ubicacion_at, created_at';

export type Unidad = {
  id: string;
  prestador_id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  modalidad: string;
  capacidad_kg: number | null;
  tipos_vehiculo: string[];
  activa: boolean;
};

export type TipoDocumento = 'licencia' | 'seguro' | 'vtv' | 'habilitacion' | 'dni';

export type Documento = {
  id: string;
  prestador_id: string;
  tipo: TipoDocumento;
  archivo: string;
  vence: string | null;
  estado: 'pendiente' | 'verificado' | 'rechazado';
  motivo: string | null;
  created_at: string;
};

export type Tarifa = {
  id?: string;
  empresa_id: string | null;
  prestador_id: string | null;
  tipo_vehiculo: string;
  base: number;
  por_km: number;
  km_incluidos: number;
  minimo: number;
};

export type Recargos = {
  id?: string;
  empresa_id: string | null;
  prestador_id: string | null;
  nocturno_pct: number;
  nocturno_desde: string;
  nocturno_hasta: string;
  finde_pct: number;
};

export type Adicional = {
  id?: string;
  empresa_id: string | null;
  prestador_id: string | null;
  situacion_id: string;
  monto: number;
};

// Dueño de las tarifas: la empresa o el gruista independiente.
export type Dueno = { empresa_id: string | null; prestador_id: string | null };
