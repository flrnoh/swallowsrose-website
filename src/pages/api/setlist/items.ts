import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/events';
import { addItem, removeItem, setItemNote, reorderItems } from '../../../lib/setlists';
import { json } from '../../../lib/crew';

export const prerender = false;

// Mutate the songs inside a setlist.
// action: 'add' | 'remove' | 'note' | 'reorder'.
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

  try {
    if (action === 'add') {
      const setlistId = String(body.setlistId ?? '');
      const songId = String(body.songId ?? '');
      if (!setlistId || !songId) return json({ error: 'Setlist oder Song fehlt.' }, 400);
      const id = await addItem(setlistId, songId);
      return json({ ok: true, id });
    }

    if (action === 'remove') {
      const itemId = String(body.itemId ?? '');
      if (!itemId) return json({ error: 'Eintrag fehlt.' }, 400);
      await removeItem(itemId);
      return json({ ok: true });
    }

    if (action === 'note') {
      const itemId = String(body.itemId ?? '');
      if (!itemId) return json({ error: 'Eintrag fehlt.' }, 400);
      await setItemNote(itemId, body.note == null ? null : String(body.note));
      return json({ ok: true });
    }

    if (action === 'reorder') {
      const setlistId = String(body.setlistId ?? '');
      const order = Array.isArray(body.order) ? body.order.map(String) : null;
      if (!setlistId || !order) return json({ error: 'Reihenfolge fehlt.' }, 400);
      await reorderItems(setlistId, order);
      return json({ ok: true });
    }

    return json({ error: 'Unbekannte Aktion.' }, 400);
  } catch (e) {
    console.error('[setlist/items]', e);
    return json({ error: 'Konnte nicht speichern.' }, 500);
  }
};
