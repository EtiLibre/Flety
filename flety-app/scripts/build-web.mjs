// Build web para Vercel. El proyecto de Vercel ya tiene las variables del
// panel Next.js viejo (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY,
// mismo proyecto de Supabase y también clave pública): si faltan las
// EXPO_PUBLIC_*, se reusan esas. Nunca usar acá la service_role.
import { spawnSync } from 'node:child_process';

const env = { ...process.env };
env.EXPO_PUBLIC_SUPABASE_URL ||= env.NEXT_PUBLIC_SUPABASE_URL;
env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// En local no hace falta: Expo carga .env.local por su cuenta.
const faltan = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter((name) => !env[name]);
if (faltan.length) console.warn(`Aviso: faltan ${faltan.join(', ')} (se usan las de .env.local si existe).`);

const result = spawnSync('npx', ['expo', 'export', '--platform', 'web'], { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);
