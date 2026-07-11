import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { deleteSetlist } from '../../../lib/setlists';
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
  if (!id) return json({ error: 'Setlist fehlt.' }, 400);

  await deleteSetlist(id);
  return json({ ok: true });
};
