// Shared band calendar — data helpers for /backend/kalender, the event API,
// the iCal feed and the public tour list. Any logged-in member may edit.
import { and, asc, eq, gte } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { db, schema } from './db';

export const EVENT_TYPES = ['gig', 'probe', 'sonstiges'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

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
};

/** Any authenticated member (the calendar is shared, everyone may edit). */
export async function requireUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return (session?.user as { id: string; role?: string } | undefined) ?? null;
}

export function validate(input: Partial<EventInput>): string | null {
  if (!input.type || !EVENT_TYPES.includes(input.type)) return 'Ungültiger Termin-Typ.';
  if (!input.title || !input.title.trim()) return 'Titel ist Pflicht.';
  if (!input.startAt || isNaN(new Date(input.startAt).getTime())) return 'Ungültiges Startdatum.';
  if (input.endAt && isNaN(new Date(input.endAt).getTime())) return 'Ungültiges Enddatum.';
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
  };
}

export async function listEvents() {
  return db.select().from(schema.event).orderBy(asc(schema.event.startAt));
}

export async function createEvent(input: EventInput, userId: string) {
  await db.insert(schema.event).values({
    id: randomUUID(),
    ...toRow(input),
    createdBy: userId,
  });
}

export async function updateEvent(id: string, input: EventInput) {
  await db
    .update(schema.event)
    .set({ ...toRow(input), updatedAt: new Date() })
    .where(eq(schema.event.id, id));
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

/** Upcoming public events for the marketing site's tour list. */
export async function listPublicUpcoming() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.event)
    .where(and(eq(schema.event.isPublic, true), gte(schema.event.startAt, startOfToday)))
    .orderBy(asc(schema.event.startAt));
}
