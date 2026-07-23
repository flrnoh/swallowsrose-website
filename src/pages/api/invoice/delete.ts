import type { APIRoute } from 'astro';
import { requireUser, deleteInvoice } from '../../../lib/invoices';
import { json } from '../../../lib/crew';

export const prerender = false;

// Delete an invoice (its line items cascade). The linked ledger entry, if any,
// stays — deleting the invoice does not un-book money already counted.
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

  await deleteInvoice(id);
  return json({ ok: true });
};
