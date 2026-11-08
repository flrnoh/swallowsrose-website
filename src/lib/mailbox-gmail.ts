// Gmail REST transport for the booking inbox. A service account with
// domain-wide delegation acts as the Workspace mailbox, so there is no OAuth
// consent flow and no extra Workspace licence. Scope: gmail.modify.
import { createSign } from 'node:crypto';
import MailComposer from 'nodemailer/lib/mail-composer';
import type {
  MailAttachment,
  MailMessage,
  MailThread,
  MailTransport,
  MailView,
  OutgoingMail,
  ThreadSummary,
} from './mailbox';
import { BOOKING_ADDRESS, BOOKING_FROM, WEBDE_ADDRESS, displayName, isOwnAddress } from './mailbox-address';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const PAGE_SIZE = 20;

const CREDENTIALS = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
const MAILBOX_USER = process.env.GMAIL_MAILBOX_USER ?? 'info@swallowsrose.com';

export const gmailConfigured = !!CREDENTIALS;

// Everything that counts as booking mail. The Workspace account also receives
// Google invoices and info@ mail, which must stay out of the crew's view.
const BOOKING_SCOPE = [
  `to:${BOOKING_ADDRESS}`,
  `cc:${BOOKING_ADDRESS}`,
  `deliveredto:${BOOKING_ADDRESS}`,
  `to:${WEBDE_ADDRESS}`,
  `cc:${WEBDE_ADDRESS}`,
  `from:${BOOKING_ADDRESS}`,
].join(' OR ');

const VIEW_QUERY: Record<MailView, string> = {
  inbox: `in:inbox (${BOOKING_SCOPE})`,
  done: `-in:inbox -in:spam -in:trash -in:sent (${BOOKING_SCOPE})`,
  sent: `in:sent from:${BOOKING_ADDRESS}`,
  spam: `in:spam (${BOOKING_SCOPE})`,
};

const SCOPE_HEADERS = ['To', 'Cc', 'From', 'Delivered-To', 'X-Forwarded-To'];
const SUMMARY_HEADERS = ['Subject', 'Date', ...SCOPE_HEADERS];
const BOOKING_PATTERN = new RegExp(
  `${BOOKING_ADDRESS.replace('.', '\\.')}|${WEBDE_ADDRESS.replace('.', '\\.')}`,
  'i',
);

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};
type GmailThread = { id: string; snippet?: string; messages?: GmailMessage[] };

let cachedToken: { value: string; expiresAt: number } | undefined;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const key = JSON.parse(CREDENTIALS ?? '{}') as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: key.client_email,
    sub: MAILBOX_USER,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Gmail-Anmeldung fehlgeschlagen (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gmail-Anfrage fehlgeschlagen (${res.status})`);
  return (await res.json()) as T;
}

function headerOf(part: GmailPart | undefined, name: string) {
  return part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function isBookingMessage(message: GmailMessage) {
  return SCOPE_HEADERS.some((name) => BOOKING_PATTERN.test(headerOf(message.payload, name)));
}

function isBookingThread(thread: GmailThread) {
  return (thread.messages ?? []).some(isBookingMessage);
}

function hasLabel(thread: GmailThread, label: string) {
  return (thread.messages ?? []).some((m) => m.labelIds?.includes(label));
}

function metadataQuery(headers: string[]) {
  return `format=metadata&${headers.map((h) => `metadataHeaders=${h}`).join('&')}`;
}

function summarize(thread: GmailThread): ThreadSummary {
  const messages = thread.messages ?? [];
  const last = messages[messages.length - 1];
  // Show the outside party: the newest foreign sender, else who we wrote to.
  const foreign = [...messages].reverse().find((m) => !isOwnAddress(headerOf(m.payload, 'From')));
  const counterpart = foreign
    ? headerOf(foreign.payload, 'From')
    : `An: ${displayName(headerOf(last?.payload, 'To'))}`;
  return {
    id: thread.id,
    subject: headerOf(messages[0]?.payload, 'Subject') || '(kein Betreff)',
    from: displayName(counterpart),
    date: Number(last?.internalDate ?? 0),
    snippet: last?.snippet ?? thread.snippet ?? '',
    unread: hasLabel(thread, 'UNREAD'),
    count: messages.length,
  };
}

function collectParts(part: GmailPart | undefined, into: GmailPart[] = []) {
  if (!part) return into;
  into.push(part);
  part.parts?.forEach((child) => collectParts(child, into));
  return into;
}

function decodeBody(part: GmailPart | undefined) {
  return part?.body?.data ? Buffer.from(part.body.data, 'base64url').toString('utf8') : '';
}

function toMessage(message: GmailMessage): MailMessage {
  const parts = collectParts(message.payload);
  const attachments: MailAttachment[] = parts
    .filter((p) => p.body?.attachmentId)
    .map((p) => ({
      id: p.body?.attachmentId ?? '',
      messageId: message.id,
      name: p.filename || 'anhang',
      size: p.body?.size ?? 0,
    }));
  const from = headerOf(message.payload, 'From');
  return {
    id: message.id,
    from,
    to: headerOf(message.payload, 'To'),
    cc: headerOf(message.payload, 'Cc'),
    date: Number(message.internalDate ?? 0),
    subject: headerOf(message.payload, 'Subject'),
    rfcId: headerOf(message.payload, 'Message-ID'),
    replyTo: headerOf(message.payload, 'Reply-To'),
    references: headerOf(message.payload, 'References'),
    text: decodeBody(parts.find((p) => p.mimeType === 'text/plain' && !p.body?.attachmentId)),
    html: decodeBody(parts.find((p) => p.mimeType === 'text/html' && !p.body?.attachmentId)),
    attachments,
    own: isOwnAddress(from),
  };
}

async function loadScoped(id: string, query: string) {
  const thread = await api<GmailThread>(`/threads/${encodeURIComponent(id)}?${query}`);
  return thread && isBookingThread(thread) ? thread : null;
}

export const gmailTransport: MailTransport = {
  async listThreads(view, search, pageToken) {
    // Brackets are stripped so a search term cannot close the booking scope.
    const term = search.replace(/[(){}]/g, ' ').trim();
    const params = new URLSearchParams({
      q: `${VIEW_QUERY[view]} ${term}`.trim(),
      maxResults: String(PAGE_SIZE),
    });
    if (view === 'spam') params.set('includeSpamTrash', 'true');
    if (pageToken) params.set('pageToken', pageToken);

    const list = await api<{ threads?: { id: string }[]; nextPageToken?: string }>(`/threads?${params}`);
    const threads = await Promise.all(
      (list?.threads ?? []).map((t) => api<GmailThread>(`/threads/${t.id}?${metadataQuery(SUMMARY_HEADERS)}`)),
    );
    return {
      threads: threads
        .filter((t): t is GmailThread => !!t && isBookingThread(t))
        .map(summarize)
        .sort((a, b) => b.date - a.date),
      nextPageToken: list?.nextPageToken ?? null,
    };
  },

  async getThread(id) {
    const thread = await loadScoped(id, 'format=full');
    if (!thread) return null;
    const messages = (thread.messages ?? []).map(toMessage);
    return {
      id: thread.id,
      subject: messages[0]?.subject || '(kein Betreff)',
      inInbox: hasLabel(thread, 'INBOX'),
      inSpam: hasLabel(thread, 'SPAM'),
      unread: hasLabel(thread, 'UNREAD'),
      messages,
    } satisfies MailThread;
  },

  async send(mail: OutgoingMail) {
    const composer = new MailComposer({
      from: BOOKING_FROM,
      to: mail.to,
      cc: mail.cc || undefined,
      subject: mail.subject,
      text: mail.text,
      inReplyTo: mail.inReplyTo,
      references: mail.references,
      attachments: mail.files,
    });
    const raw = (await composer.compile().build()).toString('base64url');
    await api('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw, threadId: mail.threadId }),
    });
  },

  async modify(id, add, remove) {
    if (!(await loadScoped(id, metadataQuery(SCOPE_HEADERS)))) throw new Error('Unterhaltung nicht gefunden');
    await api(`/threads/${encodeURIComponent(id)}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
    });
  },

  async attachment(messageId, attachmentId) {
    const message = await api<GmailMessage>(
      `/messages/${encodeURIComponent(messageId)}?${metadataQuery(SCOPE_HEADERS)}`,
    );
    if (!message) return null;
    // A thread may mix in a reply without the booking address, so check it whole.
    if (!(await loadScoped(message.threadId, metadataQuery(SCOPE_HEADERS)))) return null;
    const data = await api<{ data: string }>(
      `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
    return data ? Buffer.from(data.data, 'base64url') : null;
  },
};
