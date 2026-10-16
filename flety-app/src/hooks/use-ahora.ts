import { useEffect, useState } from 'react';

// "Ahora" que se actualiza cada `intervalo` ms mientras `activo` (cuentas regresivas).
export function useAhora(activo: boolean, intervalo = 1000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setAhora(Date.now()), intervalo);
    return () => clearInterval(id);
  }, [activo, intervalo]);
  return ahora;
}
