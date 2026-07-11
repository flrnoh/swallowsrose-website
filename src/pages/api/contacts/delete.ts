import type { APIRoute } from 'astro';
import { requireUser, deleteContact } from '../../../lib/contacts';
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
  if (!id) return json({ error: 'Kontakt fehlt.' }, 400);

  await deleteContact(id);
  return json({ ok: true });
};
