import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { createEntry, updateEntry, validate, type FinanceInput } from '../../../lib/finance';
import { json } from '../../../lib/crew';

export const prerender = false;

// Create or update a ledger entry.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const err = validate(body as Partial<FinanceInput>);
  if (err) return json({ error: err }, 400);
  const input = body as unknown as FinanceInput;

  const id = String(body.id ?? '');
  if (id) {
    await updateEntry(id, input);
    return json({ ok: true, id });
  }
  const newId = await createEntry(input, user.id);
  return json({ ok: true, id: newId });
};
