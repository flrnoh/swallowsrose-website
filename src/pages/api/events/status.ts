import type { APIRoute } from 'astro';
import { requireUser, setStatus, STATUSES, type Status } from '../../../lib/events';
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

  const id = String(body.id ?? '');
  const status = body.status as Status;
  if (!id) return json({ error: 'Termin fehlt.' }, 400);
  if (!STATUSES.includes(status)) return json({ error: 'Ungültiger Status.' }, 400);

  await setStatus(id, status);
  return json({ ok: true });
};
