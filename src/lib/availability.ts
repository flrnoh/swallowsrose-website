// Per-member availability for upcoming events (the Verfügbarkeits-Ampel).
import { inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from './db';

export const AVAIL_STATUSES = ['ja', 'vielleicht', 'nein'] as const;
export type AvailStatus = (typeof AVAIL_STATUSES)[number];

export async function listAllMembers() {
  return db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .orderBy(schema.user.name);
}

export async function getAvailabilityForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return [];
  return db.select().from(schema.availability).where(inArray(schema.availability.eventId, eventIds));
}

/** Upsert the member's response — one row per (event, member). */
export async function setAvailability(eventId: string, userId: string, status: AvailStatus) {
  await db
    .insert(schema.availability)
    .values({ id: randomUUID(), eventId, userId, status, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.availability.eventId, schema.availability.userId],
      set: { status, updatedAt: new Date() },
    });
}
