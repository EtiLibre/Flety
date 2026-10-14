// Espejo de public.user_role (supabase/migrations/0001_init_schema.sql en la raíz del repo).
export type UserRole = 'superadmin' | 'empresa' | 'chofer' | 'cliente' | 'contabilidad';

export const ROLE_HOME = {
  cliente: '/cliente/inicio',
  chofer: '/chofer/panel',
  empresa: '/empresa/panel',
  superadmin: '/empresa/panel',
  contabilidad: '/empresa/panel',
} as const satisfies Record<UserRole, string>;

// Espejo de las columnas de orders (migraciones 0001 y 0007).
export type TipoServicio = 'flete' | 'mudanza' | 'larga_distancia';
export type Tamano = 'chico' | 'mediano' | 'grande';
export type Vehiculo = 'utilitario' | 'camioneta' | 'camion';

export type GeoPoint = { lat: number; lng: number; direccion: string };

export const TIPO_LABEL: Record<TipoServicio, string> = {
  flete: 'Flete',
  mudanza: 'Mudanza',
  larga_distancia: 'Larga distancia',
};

export const TAMANO_LABEL: Record<Tamano, { titulo: string; detalle: string }> = {
  chico: { titulo: 'Chico', detalle: 'Algunos bultos' },
  mediano: { titulo: 'Mediano', detalle: 'Un ambiente' },
  grande: { titulo: 'Grande', detalle: 'Casa completa' },
};

export const VEHICULO_LABEL: Record<Vehiculo, { titulo: string; detalle: string }> = {
  utilitario: { titulo: 'Utilitario', detalle: 'Pocos bultos o un electrodoméstico' },
  camioneta: { titulo: 'Camioneta con caja', detalle: 'Un ambiente o mudanza chica' },
  camion: { titulo: 'Camión', detalle: 'Mudanza de casa completa' },
};
