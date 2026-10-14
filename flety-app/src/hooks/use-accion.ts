import { useState } from 'react';

// Ejecuta una acción del panel (aceptar, asignar, rechazar...) marcando cuál
// está en curso y guardando el error para mostrarlo.
export function useAccion(onDone?: () => void) {
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(key: string, fn: () => Promise<void>) {
    setPendiente(key);
    setError(null);
    try {
      await fn();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.');
    } finally {
      setPendiente(null);
    }
  }

  return { pendiente, error, ejecutar };
}
