// Minimal, dependency-free iCalendar (RFC 5545) builder for the crew feed.
type Ev = {
  id: string;
  type: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  location: string | null;
  city: string | null;
  ticketUrl: string | null;
  notes: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC timestamp form: 20260315T190000Z */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Date-only form for all-day events: 20260315 */
function dateStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets per RFC 5545 (continuation = CRLF + space). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

const TYPE_LABEL: Record<string, string> = { gig: 'Gig', probe: 'Probe', sonstiges: '' };

export function buildICS(events: Ev[], calName = "Swallow's Rose"): string {
  const now = utcStamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Swallow's Rose//Crew Kalender//DE",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
  ];

  for (const e of events) {
    const label = TYPE_LABEL[e.type] ?? '';
    const summary = label ? `${label}: ${e.title}` : e.title;
    const loc = [e.location, e.city].filter(Boolean).join(', ');
    const desc = [e.notes, e.ticketUrl ? `Tickets: ${e.ticketUrl}` : '']
      .filter(Boolean)
      .join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@swallowsrose.com`);
    lines.push(`DTSTAMP:${now}`);

    if (e.allDay) {
      const end = e.endAt ?? new Date(e.startAt.getTime() + 86400000);
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.startAt)}`);
      lines.push(`DTEND;VALUE=DATE:${dateStamp(end)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(e.startAt)}`);
      if (e.endAt) lines.push(`DTEND:${utcStamp(e.endAt)}`);
    }

    lines.push(`SUMMARY:${esc(summary)}`);
    if (loc) lines.push(`LOCATION:${esc(loc)}`);
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (e.ticketUrl) lines.push(`URL:${esc(e.ticketUrl)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
