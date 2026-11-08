// In-memory sample mailbox for local development: the booking inbox works end
// to end without Google credentials. Never active in production.
import type { MailMessage, MailThread, MailTransport, MailView, OutgoingMail } from './mailbox';

type DemoThread = MailThread & { labels: Set<string> };

const hours = (n: number) => Date.now() - n * 3_600_000;

function message(partial: Partial<MailMessage> & Pick<MailMessage, 'id' | 'from' | 'date' | 'subject'>): MailMessage {
  return {
    to: 'booking@swallowsrose.com',
    cc: '',
    rfcId: `<${partial.id}@demo.local>`,
    replyTo: '',
    references: '',
    text: '',
    html: '',
    attachments: [],
    own: false,
    ...partial,
  };
}

function seed(): DemoThread[] {
  return [
    {
      id: 'demo-1',
      subject: 'Anfrage Sommerfestival 2027',
      inInbox: true,
      inSpam: false,
      unread: true,
      labels: new Set(['INBOX', 'UNREAD']),
      messages: [
        message({
          id: 'demo-1a',
          from: 'Anna Beispiel <anna@festival.example>',
          date: hours(3),
          subject: 'Anfrage Sommerfestival 2027',
          text: 'Servus,\n\nhabt ihr am 12. Juni 2027 Zeit für unser Festival?\n\nViele Grüße\nAnna',
          attachments: [{ id: 'att-1', messageId: 'demo-1a', name: 'Technik-Rider.txt', size: 42 }],
        }),
      ],
    },
    {
      id: 'demo-2',
      subject: 'AW: Support-Slot im Oktober',
      inInbox: true,
      inSpam: false,
      unread: false,
      labels: new Set(['INBOX']),
      messages: [
        message({
          id: 'demo-2a',
          from: `"Swallow's Rose Booking" <booking@swallowsrose.com>`,
          to: 'Klub Beispiel <klub@venue.example>',
          date: hours(50),
          subject: 'Support-Slot im Oktober',
          text: 'Hallo, wir hätten Lust auf den Support-Slot.',
          own: true,
        }),
        message({
          id: 'demo-2b',
          from: 'Klub Beispiel <klub@venue.example>',
          date: hours(26),
          subject: 'AW: Support-Slot im Oktober',
          html: '<p>Hallo zusammen,</p><p><strong>gerne!</strong> Hier die <a href="https://example.com">Infos</a>.</p><script>document.title="gehackt"</script><img src="https://example.com/x.png" onerror="alert(1)" width="1" height="1">',
        }),
      ],
    },
    {
      id: 'demo-3',
      subject: 'Gewinne jetzt 1000 Follower',
      inInbox: false,
      inSpam: true,
      unread: true,
      labels: new Set(['SPAM', 'UNREAD']),
      messages: [
        message({
          id: 'demo-3a',
          from: 'Promo <promo@spam.example>',
          date: hours(8),
          subject: 'Gewinne jetzt 1000 Follower',
          text: 'Nur heute!',
        }),
      ],
    },
  ];
}

// Survives Vite's module reloads during dev.
const store = globalThis as unknown as { __demoMailbox?: DemoThread[] };
const threads = () => (store.__demoMailbox ??= seed());

const inView = (t: DemoThread, view: MailView) => {
  if (view === 'inbox') return t.labels.has('INBOX');
  if (view === 'spam') return t.labels.has('SPAM');
  if (view === 'sent') return t.messages.some((m) => m.own);
  return !t.labels.has('INBOX') && !t.labels.has('SPAM');
};

function sync(t: DemoThread) {
  t.inInbox = t.labels.has('INBOX');
  t.inSpam = t.labels.has('SPAM');
  t.unread = t.labels.has('UNREAD');
}

export const demoTransport: MailTransport = {
  async listThreads(view, search) {
    const term = search.toLowerCase();
    const matches = threads()
      .filter((t) => inView(t, view))
      .filter((t) => !term || JSON.stringify(t.messages).toLowerCase().includes(term));
    return {
      threads: matches
        .map((t) => {
          const last = t.messages[t.messages.length - 1];
          const foreign = [...t.messages].reverse().find((m) => !m.own);
          return {
            id: t.id,
            subject: t.subject,
            from: (foreign?.from ?? `An: ${last.to}`).replace(/<[^>]*>/, '').replace(/"/g, '').trim(),
            date: last.date,
            snippet: (last.text || last.html.replace(/<[^>]+>/g, ' ')).slice(0, 120),
            unread: t.unread,
            count: t.messages.length,
          };
        })
        .sort((a, b) => b.date - a.date),
      nextPageToken: null,
    };
  },

  async getThread(id) {
    return threads().find((t) => t.id === id) ?? null;
  },

  async send(mail: OutgoingMail) {
    const id = `demo-${Date.now()}`;
    const sent = message({
      id,
      from: `"Swallow's Rose Booking" <booking@swallowsrose.com>`,
      to: mail.to,
      cc: mail.cc,
      date: Date.now(),
      subject: mail.subject,
      text: mail.text,
      own: true,
      attachments: mail.files.map((f, i) => ({
        id: `file-${i}`,
        messageId: id,
        name: f.filename,
        size: f.content.length,
      })),
    });
    const existing = threads().find((t) => t.id === mail.threadId);
    if (existing) {
      existing.messages.push(sent);
      return;
    }
    threads().push({
      id,
      subject: mail.subject,
      inInbox: false,
      inSpam: false,
      unread: false,
      labels: new Set(),
      messages: [sent],
    });
  },

  async modify(id, add, remove) {
    const thread = threads().find((t) => t.id === id);
    if (!thread) throw new Error('Unterhaltung nicht gefunden');
    add.forEach((l) => thread.labels.add(l));
    remove.forEach((l) => thread.labels.delete(l));
    sync(thread);
  },

  async attachment(messageId, attachmentId) {
    const exists = threads().some((t) =>
      t.messages.some((m) => m.id === messageId && m.attachments.some((a) => a.id === attachmentId)),
    );
    return exists ? Buffer.from('Demo-Anhang aus dem lokalen Postfach.\n') : null;
  },
};
