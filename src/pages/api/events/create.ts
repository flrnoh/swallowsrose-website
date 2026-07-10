import type { APIRoute } from 'astro';
import { requireUser, createEvent, validate, type EventInput } from '../../../lib/events';
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

  const err = validate(body as Partial<EventInput>);
  if (err) return json({ error: err }, 400);

  await createEvent(body as unknown as EventInput, user.id);
  return json({ ok: true });
};
