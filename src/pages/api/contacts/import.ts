import type { APIRoute } from 'astro';
import { requireUser, createContacts, validate, type ContactInput } from '../../../lib/contacts';
import { json } from '../../../lib/crew';

export const prerender = false;

const MAX_ROWS = 500;

// Bulk-create contacts from a pasted table. The whole batch is validated first
// and rejected atomically if any row is bad (the client previews before
// sending, so this is a backstop).
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const contacts = Array.isArray(body.contacts) ? (body.contacts as Partial<ContactInput>[]) : null;
  if (!contacts || contacts.length === 0) return json({ error: 'Keine Kontakte übergeben.' }, 400);
  if (contacts.length > MAX_ROWS) return json({ error: `Zu viele Zeilen (max. ${MAX_ROWS}).` }, 400);

  for (let i = 0; i < contacts.length; i++) {
    const err = validate(contacts[i]);
    if (err) return json({ error: `Zeile ${i + 1}: ${err}` }, 400);
  }

  try {
    const count = await createContacts(contacts as ContactInput[], user.id);
    return json({ ok: true, count });
  } catch (e) {
    console.error('[contacts/import]', e);
    return json({ error: 'Import fehlgeschlagen.' }, 500);
  }
};
