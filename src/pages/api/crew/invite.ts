import type { APIRoute } from 'astro';
import { requireBandleader, inviteMember, ROLES, json, type Role } from '../../../lib/crew';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const caller = await requireBandleader(request.headers);
  if (!caller) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const role = body.role as Role;
  const instrument = body.instrument ? String(body.instrument) : undefined;

  if (!name || !email) return json({ error: 'Name und E-Mail sind Pflicht.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Ungültige E-Mail-Adresse.' }, 400);
  if (!ROLES.includes(role)) return json({ error: 'Ungültige Rolle.' }, 400);

  try {
    const origin = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
    await inviteMember({ name, email, role, instrument }, origin);
    return json({ ok: true });
  } catch (e) {
    console.error('[crew.invite]', e);
    return json({ error: 'Einladung fehlgeschlagen — die Mail konnte evtl. nicht verschickt werden.' }, 500);
  }
};
