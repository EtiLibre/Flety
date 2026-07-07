import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Bypassea RLS (service_role). Usar SOLO en Route Handlers/Server Actions de
// confianza que necesiten leer/escribir filas de otros usuarios (ej. mandar
// una notificación push a otra persona). Nunca importar desde un componente
// que corra en el cliente.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
