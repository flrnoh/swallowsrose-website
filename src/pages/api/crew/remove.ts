import type { APIRoute } from 'astro';
import { requireBandleader, removeMember, json } from '../../../lib/crew';

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

  const userId = String(body.userId ?? '');
  if (!userId) return json({ error: 'Mitglied fehlt.' }, 400);
  if (userId === caller.id) return json({ error: 'Du kannst dich nicht selbst entfernen.' }, 400);

  await removeMember(userId, caller.id);
  return json({ ok: true });
};
