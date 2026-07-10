import type { APIRoute } from 'astro';
import { requireUser, updateEvent, validate, type EventInput } from '../../../lib/events';
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
  if (!id) return json({ error: 'Termin fehlt.' }, 400);

  const err = validate(body as Partial<EventInput>);
  if (err) return json({ error: err }, 400);

  await updateEvent(id, body as unknown as EventInput);
  return json({ ok: true });
};
