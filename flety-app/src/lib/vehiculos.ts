import type { Vehiculo } from './types';

// Datos del vehículo del chofer (drivers.vehiculo, jsonb). Se muestra su foto
// real (ver lib/fotoModelo.ts) o, si no hay, el dibujo según tipo y color.
export type DatosVehiculo = {
  tipo?: Vehiculo;
  marca?: string;
  modelo?: string;
  anio?: string;
  color?: ColorVehiculo;
  patente?: string;
  // Rutas en el bucket "vehiculos" (fotos que subió el chofer, hasta 3).
  fotos?: string[];
  // Foto de referencia del modelo (Wikimedia Commons) o "ninguna" si el chofer
  // dijo que ninguna se parece (entonces se muestra el dibujo).
  foto_modelo?: FotoModelo | 'ninguna' | null;
};

export type FotoModelo = { url: string; pagina: string; autor: string; licencia: string };

export type ColorVehiculo =
  'blanco' | 'gris' | 'plateado' | 'negro' | 'rojo' | 'azul' | 'verde' | 'amarillo' | 'naranja' | 'bordo';

export const COLORES: Record<ColorVehiculo, { label: string; hex: string }> = {
  blanco: { label: 'Blanco', hex: '#F2F3F5' },
  gris: { label: 'Gris', hex: '#8E96A0' },
  plateado: { label: 'Plateado', hex: '#C6CBD2' },
  negro: { label: 'Negro', hex: '#2A2F36' },
  rojo: { label: 'Rojo', hex: '#C8372D' },
  azul: { label: 'Azul', hex: '#2F5BB7' },
  verde: { label: 'Verde', hex: '#3F7D4E' },
  amarillo: { label: 'Amarillo', hex: '#F2C230' },
  naranja: { label: 'Naranja', hex: '#E2772E' },
  bordo: { label: 'Bordó', hex: '#7A2633' },
};

// Formato de patente argentina: "AE 123 FT" (Mercosur) o "ABC 123" (anterior).
export function formatoPatente(texto: string) {
  const limpio = texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
  if (/^[A-Z]{2}\d{3}[A-Z]{0,2}$/.test(limpio) && limpio.length > 5) {
    return `${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5)}`.trim();
  }
  if (/^[A-Z]{3}\d{1,3}$/.test(limpio)) return `${limpio.slice(0, 3)} ${limpio.slice(3)}`.trim();
  return limpio;
}

export function patenteValida(p: string) {
  const limpio = p.replace(/\s/g, '');
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(limpio) || /^[A-Z]{3}\d{3}$/.test(limpio);
}

// "Renault Kangoo 2019 · Blanco"
export function describirModelo(v: DatosVehiculo | null | undefined) {
  if (!v) return null;
  const nombre = [v.marca, v.modelo, v.anio].filter(Boolean).join(' ');
  const color = v.color ? COLORES[v.color]?.label : null;
  return [nombre, color].filter(Boolean).join(' · ') || null;
}
