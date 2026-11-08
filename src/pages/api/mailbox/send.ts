import type { APIRoute } from 'astro';
import { json } from '../../../lib/crew';
import {
  MAX_UPLOAD_BYTES,
  getAssigneeId,
  getThread,
  mailboxReady,
  parseRecipients,
  quoteMessage,
  replySubject,
  replyTarget,
  requireMailboxUser,
  sendMail,
  setAssignee,
  type OutgoingFile,
  type OutgoingMail,
} from '../../../lib/mailbox';

export const prerender = false;

// Send a new mail or a reply from booking@. Multipart because of attachments.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireMailboxUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);
  if (!mailboxReady) return json({ error: 'Postfach ist noch nicht eingerichtet' }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const field = (name: string) => String(form.get(name) ?? '').trim();
  const to = parseRecipients(field('to'));
  const cc = parseRecipients(field('cc'));
  const text = field('text');
  if (!to?.length) return json({ error: 'Bitte eine gültige Empfänger-Adresse angeben' }, 400);
  if (!cc) return json({ error: 'Die Kopie-Adresse ist ungültig' }, 400);
  if (!text) return json({ error: 'Die Nachricht ist leer' }, 400);

  const uploads = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (uploads.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
    return json({ error: 'Anhänge dürfen zusammen höchstens 4 MB groß sein' }, 413);
  }
  const files: OutgoingFile[] = await Promise.all(
    uploads.map(async (f) => ({
      filename: f.name,
      content: Buffer.from(await f.arrayBuffer()),
      contentType: f.type || 'application/octet-stream',
    })),
  );

  const outgoing: OutgoingMail = { to: to.join(', '), cc: cc.join(', '), subject: field('subject'), text, files };

  try {
    const threadId = field('threadId');
    if (threadId) {
      const thread = await getThread(threadId);
      if (!thread) return json({ error: 'Unterhaltung nicht gefunden' }, 404);
      const target = replyTarget(thread);
      outgoing.threadId = thread.id;
      outgoing.subject = replySubject(thread.subject);
      outgoing.inReplyTo = target.rfcId;
      outgoing.references = `${target.references} ${target.rfcId}`.trim();
      outgoing.text = `${text}\n\n${quoteMessage(target)}`;
      await sendMail(outgoing);
      // Whoever answers an unclaimed thread has taken it on.
      if (!(await getAssigneeId(thread.id))) await setAssignee(thread.id, user.id);
      return json({ ok: true });
    }

    if (!outgoing.subject) return json({ error: 'Bitte einen Betreff angeben' }, 400);
    await sendMail(outgoing);
    return json({ ok: true });
  } catch (err) {
    console.error('[mailbox/send]', err);
    return json({ error: 'Senden hat nicht geklappt. Die Nachricht wurde nicht verschickt.' }, 502);
  }
};
