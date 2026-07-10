import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { setAvailability, AVAIL_STATUSES, type AvailStatus } from '../../../lib/availability';
import { json } from '../../../lib/crew';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const eventId = String(body.eventId ?? '');
  const status = body.status as AvailStatus;
  if (!eventId) return json({ error: 'Termin fehlt.' }, 400);
  if (!AVAIL_STATUSES.includes(status)) return json({ error: 'Ungültiger Status.' }, 400);

  try {
    await setAvailability(eventId, user.id, status);
    return json({ ok: true });
  } catch (e) {
    console.error('[availability]', e);
    return json({ error: 'Konnte nicht speichern.' }, 500);
  }
};
