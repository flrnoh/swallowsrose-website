import type { APIRoute } from 'astro';
import { json } from '../../../lib/crew';
import { getThread, listAssignees, mailboxReady, modifyThread, requireMailboxUser, setAssignee } from '../../../lib/mailbox';

export const prerender = false;

// Gmail label changes behind each button: [add, remove].
const LABEL_ACTIONS: Record<string, [string[], string[]]> = {
  done: [[], ['INBOX']],
  reopen: [['INBOX'], []],
  spam: [['SPAM'], ['INBOX']],
  notspam: [['INBOX'], ['SPAM']],
  unread: [['UNREAD'], []],
};

// Move a thread between views, or set who handles it.
export const POST: APIRoute = async ({ request }) => {
  const user = await requireMailboxUser(request.headers);
  if (!user) return json({ error: 'Kein Zugriff' }, 403);
  if (!mailboxReady) return json({ error: 'Postfach ist noch nicht eingerichtet' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const threadId = String(body.threadId ?? '');
  const action = String(body.action ?? '');
  if (!threadId) return json({ error: 'Unterhaltung fehlt' }, 400);

  try {
    if (action === 'assign') {
      if (!(await getThread(threadId))) return json({ error: 'Unterhaltung nicht gefunden' }, 404);
      const assigneeId = String(body.assigneeId ?? '') || null;
      if (assigneeId && !(await listAssignees()).some((a) => a.id === assigneeId)) {
        return json({ error: 'Mitglied nicht gefunden' }, 400);
      }
      await setAssignee(threadId, assigneeId);
      return json({ ok: true });
    }

    const labels = LABEL_ACTIONS[action];
    if (!labels) return json({ error: 'Unbekannte Aktion' }, 400);
    await modifyThread(threadId, labels[0], labels[1]);
    return json({ ok: true });
  } catch (err) {
    console.error('[mailbox/action]', err);
    return json({ error: 'Das hat nicht geklappt. Bitte nochmal versuchen.' }, 502);
  }
};
