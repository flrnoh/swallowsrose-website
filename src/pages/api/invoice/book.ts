import type { APIRoute } from 'astro';
import { requireUser, bookInvoiceAsIncome } from '../../../lib/invoices';
import { json } from '../../../lib/crew';

export const prerender = false;

// Book a paid invoice into the finance ledger (idempotent). Marks it 'bezahlt'.
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
  if (!id) return json({ error: 'Keine Rechnung angegeben.' }, 400);
  const method = typeof body.method === 'string' ? body.method : 'sumup';

  try {
    const entryId = await bookInvoiceAsIncome(id, user.id, method);
    return json({ ok: true, entryId });
  } catch (e) {
    console.error('[invoice/book]', e);
    return json({ error: 'Buchen fehlgeschlagen.' }, 500);
  }
};
