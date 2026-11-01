import type { LatLng } from '@/components/map/types';

import type { OpcionGrua } from './tipos';

// Grúas de ejemplo para el superadmin ("Ver la app como cliente") cuando
// todavía no hay grúas reales disponibles: así se ve el "Elegir grúa". No se
// pueden pedir (demo: true) y el cliente común nunca las ve.
const DEMO = [
  {
    nombre: 'Raúl',
    empresa: 'Auxilio Cuyo',
    modalidad: 'plancha',
    km: 1.8,
    rumbo: 40,
    ajuste: 1,
    estrellas: 4.9,
    n: 61,
    unidad: ['Iveco', 'Daily 70C'],
  },
  {
    nombre: 'Sergio',
    empresa: null,
    modalidad: 'plancha',
    km: 3.1,
    rumbo: 200,
    ajuste: 0.92,
    estrellas: 4.7,
    n: 23,
    unidad: ['Ford', 'Cargo 915'],
  },
  {
    nombre: 'Lucas',
    empresa: 'Grúas Godoy Cruz',
    modalidad: 'arrastre',
    km: 2.4,
    rumbo: 120,
    ajuste: 0.85,
    estrellas: 4.8,
    n: 40,
    unidad: ['Mercedes-Benz', 'Atego'],
  },
  {
    nombre: 'Pablo',
    empresa: 'Moto Rescate',
    modalidad: 'moto',
    km: 4.2,
    rumbo: 300,
    ajuste: 0.7,
    estrellas: null,
    n: 0,
    unidad: ['Renault', 'Kangoo'],
  },
];

export function gruasDeEjemplo(origen: LatLng, kmTraslado: number): OpcionGrua[] {
  return DEMO.map((d, i) => {
    const rad = (d.rumbo * Math.PI) / 180;
    const total = Math.round(((38000 + 1900 * kmTraslado) * d.ajuste * 1.1) / 100) * 100;
    return {
      prestador_id: `demo-${i}`,
      nombre: d.nombre,
      empresa: d.empresa,
      foto: null,
      modalidad: d.modalidad,
      unidad: { marca: d.unidad[0], modelo: d.unidad[1] },
      estrellas: d.estrellas,
      calificaciones: d.n,
      demo: true,
      distancia_km: d.km,
      eta_min: Math.max(4, Math.round((d.km / 35) * 60) + 2),
      lat: origen.lat + (d.km / 111) * Math.cos(rad),
      lng: origen.lng + (d.km / (111 * Math.cos((origen.lat * Math.PI) / 180))) * Math.sin(rad),
      total,
      cotizacion: {
        base: 38000,
        por_km: 1900,
        km: kmTraslado,
        km_incluidos: 0,
        km_cobrados: kmTraslado,
        subtotal: total,
        nocturno: 0,
        fin_de_semana: 0,
        zona: 0,
        adicionales: 0,
        tarifa_prestador: Math.round(total / 1.1),
        comision_pct: 10,
        comision: total - Math.round(total / 1.1),
        total,
      },
    };
  });
}
