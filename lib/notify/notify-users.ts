export function notifyUsers(
  userIds: string[],
  payload: { title: string; body?: string; url?: string }
) {
  if (!userIds.length) return;

  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, ...payload }),
  }).catch(() => {
    // Fire-and-forget: una notificación que falla no debe romper el flujo principal.
  });
}
