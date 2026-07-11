import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { saveGigSheet, SHEET_FIELDS, type GigSheetInput } from '../../../lib/gigsheets';
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

  const eventId = String(body.eventId ?? '');
  if (!eventId) return json({ error: 'Termin fehlt.' }, 400);

  // Only pick known text fields off the payload.
  const input: GigSheetInput = {};
  for (const f of SHEET_FIELDS) {
    if (f in body) input[f] = body[f] == null ? null : String(body[f]);
  }

  try {
    await saveGigSheet(eventId, input);
    return json({ ok: true });
  } catch (e) {
    console.error('[gigsheet]', e);
    return json({ error: 'Konnte nicht speichern.' }, 500);
  }
};
