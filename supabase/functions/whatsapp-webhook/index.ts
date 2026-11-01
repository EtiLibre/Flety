// Webhook de WhatsApp (Cloud API de Meta) para verificar teléfonos "al revés":
// el usuario manda "FLETY 123456" al número de Flety y acá se confirma
// (migración 0027, public.confirmar_verificacion_whatsapp).
//
// Se publica SIN verificación de JWT (la llama Meta). Secretos (Edge Functions → Secrets):
//   WHATSAPP_VERIFY_TOKEN   texto inventado, el mismo que se pone en Meta al configurar el webhook
//   WHATSAPP_APP_SECRET     "Clave secreta de la app" de Meta (firma de cada aviso)
//   FLETY_SECRET_KEY        clave secreta de Supabase (sb_secret_…)
//   WHATSAPP_TOKEN          opcional: token de acceso, para contestar "¡Listo!" por WhatsApp
//   WHATSAPP_PHONE_ID       opcional: identificador del número de teléfono en Meta
// SUPABASE_URL lo pone Supabase solo.

const enc = new TextEncoder();

function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function firmaValida(cuerpo: string, firma: string | null, secreto: string) {
  if (!firma?.startsWith('sha256=')) return false;
  const clave = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', clave, enc.encode(cuerpo)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return iguales(hex, firma.slice(7));
}

async function confirmar(codigo: string, telefono: string): Promise<string> {
  const clave = Deno.env.get('FLETY_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const headers: Record<string, string> = { apikey: clave, 'Content-Type': 'application/json' };
  if (clave.startsWith('ey')) headers.Authorization = `Bearer ${clave}`;
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/confirmar_verificacion_whatsapp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_codigo: codigo, p_telefono: telefono }),
  });
  if (!res.ok) {
    console.error('confirmar_verificacion_whatsapp', res.status, await res.text());
    return 'error';
  }
  return await res.json();
}

const RESPUESTAS: Record<string, string> = {
  verificado: '¡Listo! Tu número quedó verificado en Flety. Ya podés volver a la app.',
  invalido: 'Ese código no es válido o ya venció. Pedí uno nuevo en la app de Flety.',
};

// Respuesta dentro de la ventana de atención (mensaje de servicio: 1.000 gratis por mes).
async function responder(para: string, texto: string) {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const telefonoId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!token || !telefonoId) return;
  const res = await fetch(`https://graph.facebook.com/v23.0/${telefonoId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: para, type: 'text', text: { body: texto } }),
  });
  if (!res.ok) console.error('respuesta whatsapp', res.status, await res.text());
}

type Mensaje = { from?: string; type?: string; text?: { body?: string } };

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Alta del webhook en Meta: devuelve el "challenge" si el token coincide.
  if (req.method === 'GET') {
    const token = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    if (
      url.searchParams.get('hub.mode') === 'subscribe' &&
      token &&
      url.searchParams.get('hub.verify_token') === token
    ) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const cuerpo = await req.text();
  const secreto = Deno.env.get('WHATSAPP_APP_SECRET');
  if (!secreto || !(await firmaValida(cuerpo, req.headers.get('x-hub-signature-256'), secreto))) {
    return new Response('Forbidden', { status: 403 });
  }

  let aviso: { entry?: { changes?: { value?: { messages?: Mensaje[] } }[] }[] };
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return new Response('ok');
  }

  const mensajes = (aviso.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.messages ?? []));
  for (const m of mensajes) {
    if (m.type !== 'text' || !m.from) continue;
    const codigo = m.text?.body?.match(/flety\D{0,3}(\d{6})/i)?.[1];
    if (!codigo) continue; // Otros mensajes: no se contestan.
    const resultado = await confirmar(codigo, m.from);
    const texto = RESPUESTAS[resultado];
    if (texto) await responder(m.from, texto);
  }

  // Meta reintenta si no recibe 200.
  return new Response('ok');
});
