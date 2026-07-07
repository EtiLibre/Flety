import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Punto único de retorno para OAuth (Google), confirmación de email y
// recuperación de contraseña: todos mandan acá un `code` que se canjea por
// una sesión, y de ahí se redirige a `next` (o a "/" por defecto).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
