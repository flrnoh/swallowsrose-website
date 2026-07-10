// Shared band calendar + gig booking pipeline. Data helpers for
// /backend/kalender, /backend/gigs, the event API, the iCal feed and the
// public tour list. Any logged-in member may edit.
import { and, asc, eq, gte, inArray, ne, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { db, schema } from './db';

export const EVENT_TYPES = ['gig', 'probe', 'sonstiges'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// Booking pipeline. Non-gig events stay 'bestaetigt' (real dates, not inquiries).
export const STATUSES = ['anfrage', 'angebot', 'bestaetigt', 'gespielt', 'abgesagt'] as const;
export type Status = (typeof STATUSES)[number];
// Statuses that count as a real, happening date (calendar + public tour).
export const CONFIRMED_STATUSES: Status[] = ['bestaetigt', 'gespielt'];

export type EventInput = {
  type: EventType;
  title: string;
  startAt: string; // ISO
  endAt?: string | null;
  allDay?: boolean;
  location?: string | null;
  city?: string | null;
  ticketUrl?: string | null;
  notes?: string | null;
  isPublic?: boolean;
  status?: Status;
  fee?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

/** Any authenticated member (calendar + pipeline are shared, everyone may edit). */
export async function requireUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return (session?.user as { id: string; role?: string } | undefined) ?? null;
}

export function validate(input: Partial<EventInput>): string | null {
  if (!input.type || !EVENT_TYPES.includes(input.type)) return 'Ungültiger Termin-Typ.';
  if (!input.title || !input.title.trim()) return 'Titel ist Pflicht.';
  if (!input.startAt || isNaN(new Date(input.startAt).getTime())) return 'Ungültiges Startdatum.';
  if (input.endAt && isNaN(new Date(input.endAt).getTime())) return 'Ungültiges Enddatum.';
  if (input.status && !STATUSES.includes(input.status)) return 'Ungültiger Status.';
  return null;
}

function toRow(input: EventInput) {
  return {
    type: input.type,
    title: input.title.trim(),
    startAt: new Date(input.startAt),
    endAt: input.endAt ? new Date(input.endAt) : null,
    allDay: !!input.allDay,
    location: input.location?.trim() || null,
    city: input.city?.trim() || null,
    ticketUrl: input.ticketUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    isPublic: !!input.isPublic,
    status: input.status && STATUSES.includes(input.status) ? input.status : 'bestaetigt',
    fee: typeof input.fee === 'number' && !isNaN(input.fee) ? Math.round(input.fee) : null,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
  };
}

export async function listEvents() {
  return db.select().from(schema.event).orderBy(asc(schema.event.startAt));
}

/** Real dates for the calendar + iCal: everything except tentative or cancelled
 *  gigs (those live in the booking pipeline until confirmed). */
export async function listCalendarEvents() {
  return db
    .select()
    .from(schema.event)
    .where(or(ne(schema.event.type, 'gig'), inArray(schema.event.status, CONFIRMED_STATUSES)))
    .orderBy(asc(schema.event.startAt));
}

/** Upcoming real events — used by the availability board. */
export async function listUpcomingEvents() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.event)
    .where(
      and(
        or(ne(schema.event.type, 'gig'), inArray(schema.event.status, CONFIRMED_STATUSES)),
        gte(schema.event.startAt, startOfToday),
      ),
    )
    .orderBy(asc(schema.event.startAt));
}

/** Gigs only, for the booking pipeline. */
export async function listGigs() {
  return db
    .select()
    .from(schema.event)
    .where(eq(schema.event.type, 'gig'))
    .orderBy(asc(schema.event.startAt));
}

export async function createEvent(input: EventInput, userId: string) {
  await db.insert(schema.event).values({ id: randomUUID(), ...toRow(input), createdBy: userId });
}

/** Partial update — only fields present in the payload are touched, so editing
 *  a calendar event never clobbers pipeline fields it doesn't know about. */
export async function updateEvent(id: string, input: Partial<EventInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.type !== undefined) set.type = input.type;
  if (input.title !== undefined) set.title = input.title.trim();
  if (input.startAt !== undefined) set.startAt = new Date(input.startAt);
  if ('endAt' in input) set.endAt = input.endAt ? new Date(input.endAt) : null;
  if (input.allDay !== undefined) set.allDay = !!input.allDay;
  if ('location' in input) set.location = input.location?.trim() || null;
  if ('city' in input) set.city = input.city?.trim() || null;
  if ('ticketUrl' in input) set.ticketUrl = input.ticketUrl?.trim() || null;
  if ('notes' in input) set.notes = input.notes?.trim() || null;
  if (input.isPublic !== undefined) set.isPublic = !!input.isPublic;
  if (input.status !== undefined && STATUSES.includes(input.status)) set.status = input.status;
  if ('fee' in input) set.fee = typeof input.fee === 'number' && !isNaN(input.fee) ? Math.round(input.fee) : null;
  if ('contactName' in input) set.contactName = input.contactName?.trim() || null;
  if ('contactEmail' in input) set.contactEmail = input.contactEmail?.trim() || null;
  if ('contactPhone' in input) set.contactPhone = input.contactPhone?.trim() || null;
  await db.update(schema.event).set(set).where(eq(schema.event.id, id));
}

export async function setStatus(id: string, status: Status) {
  await db.update(schema.event).set({ status, updatedAt: new Date() }).where(eq(schema.event.id, id));
}

export async function deleteEvent(id: string) {
  await db.delete(schema.event).where(eq(schema.event.id, id));
}

/** Get (or lazily create) a member's secret iCal feed token. */
export async function getOrCreateIcalToken(userId: string): Promise<string> {
  const [u] = await db
    .select({ token: schema.user.icalToken })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  if (u?.token) return u.token;
  const token = (randomUUID() + randomUUID()).replace(/-/g, '');
  await db.update(schema.user).set({ icalToken: token }).where(eq(schema.user.id, userId));
  return token;
}

export async function findUserByIcalToken(token: string) {
  const [u] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.icalToken, token))
    .limit(1);
  return u ?? null;
}

/** Upcoming, confirmed, public events for the marketing site's tour list. */
export async function listPublicUpcoming() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.event)
    .where(
      and(
        eq(schema.event.isPublic, true),
        inArray(schema.event.status, CONFIRMED_STATUSES),
        gte(schema.event.startAt, startOfToday),
      ),
    )
    .orderBy(asc(schema.event.startAt));
}
