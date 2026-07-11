import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { createSetlist, updateSetlist, validateSetlist, type SetlistInput } from '../../../lib/setlists';
import { json } from '../../../lib/crew';

export const prerender = false;

// Create or update a setlist's meta (title, linked gig, notes).
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const err = validateSetlist(body as Partial<SetlistInput>);
  if (err) return json({ error: err }, 400);
  const input = body as unknown as SetlistInput;

  const id = String(body.id ?? '');
  if (id) {
    await updateSetlist(id, input);
    return json({ ok: true, id });
  }
  const newId = await createSetlist(input, user.id);
  return json({ ok: true, id: newId });
};
