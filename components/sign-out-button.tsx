"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-black/10 px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
    >
      Cerrar sesión
    </button>
  );
}
