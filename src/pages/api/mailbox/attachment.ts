import type { APIRoute } from 'astro';
import { json } from '../../../lib/crew';
import { getAttachment, mailboxReady, requireMailboxUser } from '../../../lib/mailbox';

export const prerender = false;

// Attachments always download: foreign files never render on our origin.
export const GET: APIRoute = async ({ request, url }) => {
  const user = await requireMailboxUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);
  if (!mailboxReady) return json({ error: 'Postfach ist noch nicht eingerichtet' }, 503);

  const messageId = url.searchParams.get('m') ?? '';
  const attachmentId = url.searchParams.get('a') ?? '';
  const name = url.searchParams.get('name') || 'anhang';
  if (!messageId || !attachmentId) return json({ error: 'Anhang fehlt' }, 400);

  try {
    const data = await getAttachment(messageId, attachmentId);
    if (!data) return json({ error: 'Anhang nicht gefunden' }, 404);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[mailbox/attachment]', err);
    return json({ error: 'Anhang konnte nicht geladen werden' }, 502);
  }
};
