import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { createSong, updateSong, deleteSong, validateSong, type SongInput } from '../../../lib/setlists';
import { json } from '../../../lib/crew';

export const prerender = false;

// Manage a library song. action: 'create' | 'update' | 'delete'.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const action = String(body.action ?? '');

  if (action === 'delete') {
    const id = String(body.id ?? '');
    if (!id) return json({ error: 'Song fehlt.' }, 400);
    await deleteSong(id);
    return json({ ok: true });
  }

  const err = validateSong(body as Partial<SongInput>);
  if (err) return json({ error: err }, 400);
  const input = body as unknown as SongInput;

  if (action === 'update') {
    const id = String(body.id ?? '');
    if (!id) return json({ error: 'Song fehlt.' }, 400);
    await updateSong(id, input);
    return json({ ok: true });
  }

  if (action === 'create') {
    const id = await createSong(input);
    return json({ ok: true, id });
  }

  return json({ error: 'Unbekannte Aktion.' }, 400);
};
