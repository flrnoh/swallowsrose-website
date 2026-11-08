// Gmail REST transport for the booking inbox. A service account with
// domain-wide delegation acts as the Workspace mailbox, so there is no OAuth
// consent flow and no extra Workspace licence. Scope: gmail.modify. It signs in
// through Workload Identity Federation: no key exists anywhere.
import { getVercelOidcToken } from '@vercel/oidc';
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
const STS_URL = 'https://sts.googleapis.com/v1/token';
const IAM_URL = 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts';
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const PAGE_SIZE = 20;

const SERVICE_ACCOUNT = process.env.GMAIL_SERVICE_ACCOUNT;
const WORKLOAD_PROVIDER = process.env.GMAIL_WORKLOAD_PROVIDER;
const MAILBOX_USER = process.env.GMAIL_MAILBOX_USER ?? 'info@swallowsrose.com';

export const gmailConfigured = !!(SERVICE_ACCOUNT && WORKLOAD_PROVIDER);

// Folders come from Gmail labels. Gmail's search finds nothing for the booking@
// alias over the API, so booking mail is picked by its headers instead. That
// keeps Google invoices and info@ mail out of the crew's view.
const VIEW_LABELS: Partial<Record<MailView, string>> = { inbox: 'INBOX', sent: 'SENT', spam: 'SPAM' };
const DONE_QUERY = '-in:inbox -in:spam -in:trash -in:sent';

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

async function postJson<T>(url: string, body: object, bearer?: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gmail-Anmeldung fehlgeschlagen: ${url} (${res.status}) ${await res.text()}`);
  return (await res.json()) as T;
}

// Keyless chain: Vercel's OIDC token → Google federated token → the service
// account signs a delegated JWT for the mailbox → Gmail access token.
async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const federated = await postJson<{ access_token: string }>(STS_URL, {
    audience: `//iam.googleapis.com/${WORKLOAD_PROVIDER}`,
    grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
    requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    subjectToken: await getVercelOidcToken(),
  });

  const now = Math.floor(Date.now() / 1000);
  const { signedJwt } = await postJson<{ signedJwt: string }>(
    `${IAM_URL}/${SERVICE_ACCOUNT}:signJwt`,
    {
      payload: JSON.stringify({
        iss: SERVICE_ACCOUNT,
        sub: MAILBOX_USER,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    },
    federated.access_token,
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });
  if (!res.ok) throw new Error(`Gmail-Anmeldung fehlgeschlagen (${res.status}) ${await res.text()}`);
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
    const term = search.trim();
    const params = new URLSearchParams({ maxResults: String(PAGE_SIZE), includeSpamTrash: 'true' });
    const label = VIEW_LABELS[view];
    if (label) params.set('labelIds', label);
    const query = `${label ? '' : DONE_QUERY} ${term}`.trim();
    if (query) params.set('q', query);
    if (pageToken) params.set('pageToken', pageToken);

    const list = await api<{ threads?: { id: string }[]; nextPageToken?: string }>(`/threads?${params}`);
    const threads = await Promise.all(
      (list?.threads ?? []).map((t) => api<GmailThread>(`/threads/${t.id}?${metadataQuery(SUMMARY_HEADERS)}`)),
    );
    const booking = threads.filter((t): t is GmailThread => !!t && isBookingThread(t));
    console.log(`[postfach] ${view}: gefunden ${list?.threads?.length ?? 0}, geladen ${threads.filter(Boolean).length}, Booking ${booking.length}`);
    return {
      threads: booking
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
