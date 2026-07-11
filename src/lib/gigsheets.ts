// Gig sheets — the show-day day sheet (load-in, schedule, directions, rider …)
// for a confirmed gig. One optional sheet per event; any logged-in member may
// edit. Powers /backend/gig-sheets and /api/gigsheet/save.
import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from './db';
import { CONFIRMED_STATUSES } from './events';

// Editable text fields on a sheet (order = form order). Kept as one list so the
// page, the API and the DB row stay in sync.
export const SHEET_FIELDS = [
  'loadIn',
  'soundcheck',
  'doors',
  'stageTime',
  'setLength',
  'address',
  'parking',
  'accommodation',
  'catering',
  'backline',
  'contactOnSite',
  'notes',
] as const;
export type SheetField = (typeof SHEET_FIELDS)[number];

export type GigSheetInput = Partial<Record<SheetField, string | null>>;

/** Confirmed gigs (real dates) that can carry a sheet, chronological. */
export async function listSheetGigs() {
  return db
    .select()
    .from(schema.event)
    .where(and(eq(schema.event.type, 'gig'), inArray(schema.event.status, CONFIRMED_STATUSES)))
    .orderBy(asc(schema.event.startAt));
}

/** Upcoming confirmed gigs only — used for the quick "anstehend" view. */
export async function listUpcomingSheetGigs() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.event)
    .where(
      and(
        eq(schema.event.type, 'gig'),
        inArray(schema.event.status, CONFIRMED_STATUSES),
        gte(schema.event.startAt, startOfToday),
      ),
    )
    .orderBy(asc(schema.event.startAt));
}

export async function getSheetsForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return [];
  return db.select().from(schema.gigSheet).where(inArray(schema.gigSheet.eventId, eventIds));
}

/** Normalise incoming values: trim, empty → null, only known fields. */
function cleanInput(input: GigSheetInput) {
  const row: Record<string, string | null> = {};
  for (const f of SHEET_FIELDS) {
    if (f in input) {
      const v = input[f];
      row[f] = typeof v === 'string' && v.trim() ? v.trim() : null;
    }
  }
  return row;
}

/** Upsert the sheet for an event — one row per event. */
export async function saveGigSheet(eventId: string, input: GigSheetInput) {
  const row = cleanInput(input);
  await db
    .insert(schema.gigSheet)
    .values({ id: randomUUID(), eventId, ...row, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.gigSheet.eventId,
      set: { ...row, updatedAt: new Date() },
    });
}
