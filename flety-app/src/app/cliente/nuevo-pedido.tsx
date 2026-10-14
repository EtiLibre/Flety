import { Redirect, router } from 'expo-router';

import { FormScreen } from '@/components/FormScreen';
import { PedidoForm } from '@/components/pedido/PedidoForm';
import { useIsWide } from '@/hooks/use-is-wide';
import { usePedidoDraft } from '@/lib/pedido-draft';
import { TIPO_LABEL } from '@/lib/types';

// Formulario de pedido en celular. En desktop el formulario vive en el panel
// de /cliente/inicio, así que redirige ahí.
export default function NuevoPedido() {
  const isWide = useIsWide();
  const { draft } = usePedidoDraft();

  if (isWide) return <Redirect href="/cliente/inicio" />;

  return (
    <FormScreen title={TIPO_LABEL[draft.tipo]} subtitle="Contanos qué movés y te mostramos opciones y precios.">
      <PedidoForm onContinue={() => router.push('/cliente/opciones')} />
    </FormScreen>
  );
}
