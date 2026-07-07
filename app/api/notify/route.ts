import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Relay interno: cualquier usuario autenticado puede pedir que se le mande
// una notificación a otro (se llama solo desde nuestro propio código, justo
// después de una transición de estado válida). No valida que el evento sea
// "real" — si esto se necesita exponer más ampliamente, sumar una
// verificación de que el caller pertenece al pedido en cuestión.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { userIds, title, body, url } = await request.json();

  if (!Array.isArray(userIds) || !userIds.length || typeof title !== "string") {
    return NextResponse.json({ error: "userIds y title son requeridos" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: subscriptions } = await service
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .catch(async (err: { statusCode?: number }) => {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await service.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw err;
        })
    )
  );

  return NextResponse.json({
    sent: results.filter((r) => r.status === "fulfilled").length,
    total: results.length,
  });
}
