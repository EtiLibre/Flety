import type { CapacitorConfig } from '@capacitor/cli';

// webDir: 'out' asume un futuro `next build` con output: 'export'. Next.js usa
// Server Components + middleware + el cliente Supabase SSR, que no son 100%
// compatibles con export estático. Definir la estrategia real (export estático
// limitado vs. Capacitor apuntando a la URL desplegada) queda pendiente para
// la Fase 4 del roadmap, cuando se generen los proyectos nativos.
const config: CapacitorConfig = {
  appId: 'com.flety.app',
  appName: 'Flety',
  webDir: 'out'
};

export default config;
