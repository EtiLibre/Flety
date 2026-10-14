import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

// Pedidos del cliente logueado, más recientes primero. Se recarga cada vez que
// la pantalla vuelve a estar en foco.
export function useMisPedidos() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      supabase
        .from('orders')
        .select(PEDIDO_COLUMNS)
        .eq('cliente_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (cancelled) return;
          setPedidos((data as Pedido[]) ?? []);
          setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return { pedidos, loading };
}
