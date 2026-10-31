import type { Href } from 'expo-router';
import { Truck, type LucideIcon } from 'lucide-react-native';

import { IconoGrua } from './IconoGrua';

// Registro de las unidades de negocio de la plataforma. Cada servicio declara
// cómo se presenta (nombre, textos, color) y a dónde lleva. Comparten la
// plataforma (cuenta, mapa, componentes) pero no sus datos ni sus reglas: cada
// uno tiene sus tablas, tarifas, prestadores y estados (ver
// docs/plan-plataforma-gruas.md). Sumar un negocio nuevo = sumar una entrada
// acá y su módulo.

export type ServicioId = 'mudanzas' | 'gruas';

export type Servicio = {
  id: ServicioId;
  nombre: string;
  // Título de la tarjeta del inicio.
  titulo: string;
  descripcion: string;
  cta: string;
  // Etiqueta chica arriba a la derecha de la tarjeta.
  sello: string;
  // activo: se puede usar; pronto: se muestra como "Muy pronto".
  estado: 'activo' | 'pronto';
  Icon: LucideIcon | typeof IconoGrua;
  // Colores propios del servicio (el resto del diseño es compartido).
  color: {
    acento: string; // botones y detalles
    suave: string; // fondo de la tarjeta
    texto: string; // texto sobre el fondo suave
    textoSuave: string;
    tinta: string; // botón principal oscuro
  };
  // Pantalla del servicio en la app del cliente (null mientras está "pronto").
  ruta: Href | null;
};

export const SERVICIOS: Servicio[] = [
  {
    id: 'mudanzas',
    nombre: 'Mudanzas',
    titulo: 'Mudanzas y fletes',
    descripcion: 'Muebles, electrodomésticos o tu casa entera, con empresas verificadas.',
    cta: 'Solicitar flete',
    sello: 'Precio antes de confirmar',
    estado: 'activo',
    Icon: Truck,
    color: { acento: '#FFC233', suave: '#FFF4D6', texto: '#3D2C00', textoSuave: '#7A5A00', tinta: '#12161C' },
    ruta: '/cliente/mudanzas',
  },
  {
    id: 'gruas',
    nombre: 'Grúas',
    titulo: 'Grúas',
    descripcion: 'Auxilio y traslado de tu vehículo. Seguís la grúa en vivo hasta que llega.',
    cta: 'Solicitar grúa',
    sello: 'Muy pronto',
    estado: 'pronto',
    Icon: IconoGrua,
    color: { acento: '#FF6B1A', suave: '#FFE9DC', texto: '#4A1B0C', textoSuave: '#993C1D', tinta: '#2A1006' },
    ruta: null,
  },
];

export function servicio(id: ServicioId) {
  return SERVICIOS.find((s) => s.id === id)!;
}
