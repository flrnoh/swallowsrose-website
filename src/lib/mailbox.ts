// Booking inbox for /backend/postfach and /api/mailbox/*. The mail itself stays
// in Gmail (booking@ is an alias on the info@ Workspace account); we only store
// who in the crew handles a thread.
//
// Local / unconfigured (no GMAIL_SERVICE_ACCOUNT): dev runs on sample
// threads held in memory, prod shows a "not set up yet" notice.
import { eq, inArray, ne } from 'drizzle-orm';
import { auth } from './auth';
import { db, schema } from './db';
import { bareAddress, displayName, isOwnAddress, splitAddresses } from './mailbox-address';
import { demoTransport } from './mailbox-demo';
import { gmailConfigured, gmailTransport } from './mailbox-gmail';

export { BOOKING_ADDRESS, BOOKING_FROM, WEBDE_ADDRESS, bareAddress, displayName, isOwnAddress } from './mailbox-address';

// Vercel rejects request bodies above 4.5 MB, multipart overhead included.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const VIEWS = ['inbox', 'done', 'sent', 'spam'] as const;
export type MailView = (typeof VIEWS)[number];
export const VIEW_LABEL: Record<MailView, string> = {
  inbox: 'Offen',
  done: 'Erledigt',
  sent: 'Gesendet',
  spam: 'Spam',
};

export type ThreadSummary = {
  id: string;
  subject: string;
  from: string;
  date: number;
  snippet: string;
  unread: boolean;
  count: number;
};

export type MailAttachment = {
  id: string;
  messageId: string;
  name: string;
  size: number;
};

export type MailMessage = {
  id: string;
  from: string;
  to: string;
  cc: string;
  date: number;
  subject: string;
  rfcId: string;
  replyTo: string;
  references: string;
  text: string;
  html: string;
  attachments: MailAttachment[];
  own: boolean;
};

export type MailThread = {
  id: string;
  subject: string;
  inInbox: boolean;
  inSpam: boolean;
  unread: boolean;
  messages: MailMessage[];
};

export type OutgoingFile = { filename: string; content: Buffer; contentType: string };

export type OutgoingMail = {
  to: string;
  cc: string;
  subject: string;
  text: string;
  files: OutgoingFile[];
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};

export type ThreadPage = { threads: ThreadSummary[]; nextPageToken: string | null };

export type MailTransport = {
  listThreads(view: MailView, search: string, pageToken: string): Promise<ThreadPage>;
  getThread(id: string): Promise<MailThread | null>;
  send(mail: OutgoingMail): Promise<void>;
  modify(id: string, add: string[], remove: string[]): Promise<void>;
  attachment(messageId: string, attachmentId: string): Promise<Buffer | null>;
};

const transport: MailTransport | null = gmailConfigured
  ? gmailTransport
  : import.meta.env.DEV
    ? demoTransport
    : null;

export const mailboxReady = transport !== null;
export const mailboxDemo = transport === demoTransport;

function mail(): MailTransport {
  if (!transport) throw new Error('Postfach ist noch nicht eingerichtet');
  return transport;
}

/** Band members and the bandleader only: subs never see booking mail. */
export function canUseMailbox(user?: { role?: string } | null) {
  return !!user && user.role !== 'sub';
}

export async function requireMailboxUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  const user = session?.user as { id: string; role?: string } | undefined;
  return user && canUseMailbox(user) ? user : null;
}

export const listThreads = (view: MailView, search: string, pageToken: string) =>
  mail().listThreads(view, search, pageToken);
export const getThread = (id: string) => mail().getThread(id);
export const modifyThread = (id: string, add: string[], remove: string[]) => mail().modify(id, add, remove);
export const getAttachment = (messageId: string, attachmentId: string) =>
  mail().attachment(messageId, attachmentId);
export const sendMail = (outgoing: OutgoingMail) => mail().send(outgoing);

/** Who can take a thread: everyone except subs. */
export async function listAssignees() {
  return db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .where(ne(schema.user.role, 'sub'))
    .orderBy(schema.user.name);
}

/** threadId → assignee name for the given threads. */
export async function assigneeNames(threadIds: string[]) {
  if (!threadIds.length) return new Map<string, string>();
  const rows = await db
    .select({ threadId: schema.mailThread.threadId, name: schema.user.name })
    .from(schema.mailThread)
    .innerJoin(schema.user, eq(schema.mailThread.assigneeId, schema.user.id))
    .where(inArray(schema.mailThread.threadId, threadIds));
  return new Map(rows.map((r) => [r.threadId, r.name]));
}

export async function getAssigneeId(threadId: string) {
  const [row] = await db
    .select({ assigneeId: schema.mailThread.assigneeId })
    .from(schema.mailThread)
    .where(eq(schema.mailThread.threadId, threadId));
  return row?.assigneeId ?? null;
}

export async function setAssignee(threadId: string, assigneeId: string | null) {
  const now = new Date();
  await db
    .insert(schema.mailThread)
    .values({ threadId, assigneeId, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.mailThread.threadId,
      set: { assigneeId, updatedAt: now },
    });
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/** Splits a comma/semicolon list; returns null if any entry is no address. */
export function parseRecipients(value: string): string[] | null {
  const list = splitAddresses(value);
  return list.every((v) => EMAIL.test(bareAddress(v))) ? list : null;
}

/** Who a reply goes to: Reply-To or sender, the others copied in (reply-all). */
export function replyRecipients(message: MailMessage) {
  if (message.own) return { to: message.to, cc: message.cc };
  const to = message.replyTo || message.from;
  const toKey = bareAddress(to).toLowerCase();
  const cc = splitAddresses(`${message.to},${message.cc}`).filter((address) => {
    return !isOwnAddress(address) && bareAddress(address).toLowerCase() !== toKey;
  });
  return { to, cc: cc.join(', ') };
}

export function replySubject(subject: string) {
  return /^(re|aw):/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

/** The message a reply answers: the newest one the outside world wrote. */
export function replyTarget(thread: MailThread) {
  return [...thread.messages].reverse().find((m) => !m.own) ?? thread.messages[thread.messages.length - 1];
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** The newest message's text as a quoted block below the reply. */
export function quoteMessage(message: MailMessage) {
  const when = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(message.date));
  const body = message.text || htmlToText(message.html);
  const quoted = body.trim().split('\n').map((line) => `> ${line}`).join('\n');
  return `Am ${when} schrieb ${displayName(message.from)}:\n${quoted}`;
}

/** Wraps untrusted mail HTML for a script-less sandboxed iframe. */
export function mailDocument(html: string) {
  const csp = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{margin:0;padding:16px;background:#fff;color:#111;font:15px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`;
}
