import type { APIRoute } from 'astro';
import { requireUser, createInvoice, updateInvoice, validate, type InvoiceInput } from '../../../lib/invoices';
import { json } from '../../../lib/crew';

export const prerender = false;

// Create (draft) or update an invoice with its line items.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const err = validate(body as Partial<InvoiceInput>);
  if (err) return json({ error: err }, 400);
  const input = body as unknown as InvoiceInput;

  const id = String(body.id ?? '');
  if (id) {
    await updateInvoice(id, input);
    return json({ ok: true, id });
  }
  const created = await createInvoice(input, user.id);
  return json({ ok: true, ...created });
};
