import type { APIRoute } from 'astro';
import { requireUser, createContact, updateContact, validate, type ContactInput } from '../../../lib/contacts';
import { json } from '../../../lib/crew';

export const prerender = false;

// Create or update a contact.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const err = validate(body as Partial<ContactInput>);
  if (err) return json({ error: err }, 400);
  const input = body as unknown as ContactInput;

  const id = String(body.id ?? '');
  if (id) {
    await updateContact(id, input);
    return json({ ok: true, id });
  }
  await createContact(input, user.id);
  return json({ ok: true });
};
