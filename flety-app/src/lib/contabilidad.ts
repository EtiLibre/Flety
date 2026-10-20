import { Platform, Share } from 'react-native';

import { PEDIDO_COLUMNS, type Pedido } from './orders';
import { supabase } from './supabase';

// Contabilidad (migración 0013). Mientras no haya cobros reales por la
// plataforma (docs/pagos-contable-legal.md), los montos son el precio estimado
// del pedido y la comisión se calcula con el % de la empresa o el de Flety.

export type EmpresaComision = { id: string; nombre: string; cuit: string | null; comision_pct: number | null };

export type FilaLiquidacion = {
  empresa: EmpresaComision;
  pct: number;
  pedidos: number;
  total: number;
  comision: number;
  neto: number;
  // Confirmados por el cliente y todavía no liquidados a la empresa.
  pendientes: Pedido[];
  netoPendiente: number;
  netoLiquidado: number;
};

export async function comisionDefault(): Promise<number> {
  const { data } = await supabase.from('config').select('valor').eq('clave', 'comision_pct_default').maybeSingle();
  const v = Number(data?.valor);
  return Number.isFinite(v) ? v : 10;
}

export async function guardarComisionDefault(pct: number) {
  const { error } = await supabase
    .from('config')
    .upsert({ clave: 'comision_pct_default', valor: pct, updated_at: new Date().toISOString() });
  if (error) throw new Error('No pudimos guardar la comisión.');
}

export async function datosContables(desde: Date, hasta: Date) {
  const [empresasRes, pedidosRes, pct] = await Promise.all([
    supabase.from('companies').select('id, nombre, cuit, comision_pct').order('nombre'),
    supabase
      .from('orders')
      .select(PEDIDO_COLUMNS)
      .in('estado', ['entregado', 'confirmado', 'liquidado', 'en_disputa'])
      .gte('created_at', desde.toISOString())
      .lt('created_at', hasta.toISOString())
      .order('created_at'),
    comisionDefault(),
  ]);
  return {
    empresas: (empresasRes.data as EmpresaComision[] | null) ?? [],
    pedidos: (pedidosRes.data as Pedido[] | null) ?? [],
    pctDefault: pct,
  };
}

const redondear = (n: number) => Math.round(n);

export function liquidaciones(empresas: EmpresaComision[], pedidos: Pedido[], pctDefault: number): FilaLiquidacion[] {
  return empresas
    .map((empresa) => {
      const pct = empresa.comision_pct != null ? Number(empresa.comision_pct) : pctDefault;
      const propios = pedidos.filter(
        (p) => p.company_id === empresa.id && ['confirmado', 'liquidado'].includes(p.estado)
      );
      const monto = (p: Pedido) => Number(p.precio_estimado ?? 0);
      const neto = (p: Pedido) => monto(p) * (1 - pct / 100);
      const total = propios.reduce((a, p) => a + monto(p), 0);
      const pendientes = propios.filter((p) => p.estado === 'confirmado');
      return {
        empresa,
        pct,
        pedidos: propios.length,
        total: redondear(total),
        comision: redondear(total * (pct / 100)),
        neto: redondear(total * (1 - pct / 100)),
        pendientes,
        netoPendiente: redondear(pendientes.reduce((a, p) => a + neto(p), 0)),
        netoLiquidado: redondear(propios.filter((p) => p.estado === 'liquidado').reduce((a, p) => a + neto(p), 0)),
      };
    })
    .filter((f) => f.pedidos > 0)
    .sort((a, b) => b.total - a.total);
}

// confirmado -> liquidado (el trigger solo lo permite a contabilidad/superadmin).
export async function marcarLiquidados(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from('orders')
    .update({ estado: 'liquidado' })
    .in('id', ids)
    .eq('estado', 'confirmado');
  if (error) throw new Error(error.message?.startsWith('Solo ') ? error.message : 'No pudimos marcar los pedidos.');
}

// CSV para el estudio contable (separador ; para Excel en español).
export function csvLiquidaciones(filas: FilaLiquidacion[], periodo: string) {
  const enc = [
    'Periodo',
    'Empresa',
    'CUIT',
    'Pedidos',
    'Total estimado',
    'Comision %',
    'Comision Flety',
    'Neto empresa',
    'Pendiente de liquidar',
    'Liquidado',
  ];
  const lineas = filas.map((f) =>
    [
      periodo,
      f.empresa.nombre,
      f.empresa.cuit ?? '',
      f.pedidos,
      f.total,
      f.pct,
      f.comision,
      f.neto,
      f.netoPendiente,
      f.netoLiquidado,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  );
  return [enc.join(';'), ...lineas].join('\n');
}

export async function descargarArchivo(nombre: string, contenido: string) {
  if (Platform.OS === 'web') {
    // BOM para que Excel abra bien los acentos.
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: nombre, message: contenido });
}
