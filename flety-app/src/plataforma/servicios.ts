import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';

import { IconoCamioneta } from './estilo';
import { IconoGrua } from './IconoGrua';
import { RUTA_PEDIR_GRUA } from '@/modulos/gruas/nav';

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
  Icon: LucideIcon | typeof IconoGrua | typeof IconoCamioneta;
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
    descripcion: 'Mudanzas, fletes y viajes de larga distancia, con empresas verificadas.',
    cta: 'Pedir mudanza o flete',
    sello: 'Precio antes de confirmar',
    estado: 'activo',
    Icon: IconoCamioneta,
    color: { acento: '#FFC233', suave: '#FFF4D6', texto: '#3D2C00', textoSuave: '#7A5A00', tinta: '#12161C' },
    ruta: '/cliente/mudanzas',
  },
  {
    id: 'gruas',
    nombre: 'Grúas',
    titulo: 'Grúas y auxilio',
    descripcion: 'Traslado con grúa o auxilio por batería o rueda pinchada. Auto, moto o bici.',
    cta: 'Pedir grúa o auxilio',
    sello: 'Seguimiento en vivo',
    estado: 'activo',
    Icon: IconoGrua,
    color: { acento: '#FF6B1A', suave: '#FFE9DC', texto: '#4A1B0C', textoSuave: '#993C1D', tinta: '#2A1006' },
    ruta: RUTA_PEDIR_GRUA,
  },
];

export function servicio(id: ServicioId) {
  return SERVICIOS.find((s) => s.id === id)!;
}
