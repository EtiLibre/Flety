"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LiquidarButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("orders").update({ estado: "liquidado" }).eq("id", orderId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="rounded-lg border border-black/10 px-3 py-1 text-xs disabled:opacity-40 dark:border-white/15"
    >
      {loading ? "Liquidando..." : "Marcar liquidado"}
    </button>
  );
}
