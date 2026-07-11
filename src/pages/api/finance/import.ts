import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { createEntries, validate, type FinanceInput } from '../../../lib/finance';
import { json } from '../../../lib/crew';

export const prerender = false;

const MAX_ROWS = 500;

// Bulk-create ledger entries from a pasted table. The whole batch is validated
// first and rejected atomically if any row is bad (the client previews before
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

  const entries = Array.isArray(body.entries) ? (body.entries as Partial<FinanceInput>[]) : null;
  if (!entries || entries.length === 0) return json({ error: 'Keine Buchungen übergeben.' }, 400);
  if (entries.length > MAX_ROWS) return json({ error: `Zu viele Zeilen (max. ${MAX_ROWS}).` }, 400);

  for (let i = 0; i < entries.length; i++) {
    const err = validate(entries[i]);
    if (err) return json({ error: `Zeile ${i + 1}: ${err}` }, 400);
  }

  try {
    const count = await createEntries(entries as FinanceInput[], user.id);
    return json({ ok: true, count });
  } catch (e) {
    console.error('[finance/import]', e);
    return json({ error: 'Import fehlgeschlagen.' }, 500);
  }
};
