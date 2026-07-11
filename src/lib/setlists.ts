// Setlists — the band's song library plus named, ordered setlists built from
// it. Any logged-in member may edit. Powers /backend/setlists,
// /backend/setlists/[id] and the /api/setlist/* endpoints.
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from './db';

// ── Song library ──────────────────────────────────────────────────────────

export type SongInput = {
  title: string;
  artist?: string | null;
  durationSeconds?: number | null;
  notes?: string | null;
  active?: boolean;
};

export function validateSong(input: Partial<SongInput>): string | null {
  if (!input.title || !input.title.trim()) return 'Songtitel ist Pflicht.';
  if (
    input.durationSeconds != null &&
    (typeof input.durationSeconds !== 'number' || isNaN(input.durationSeconds) || input.durationSeconds < 0)
  )
    return 'Ungültige Länge.';
  return null;
}

function songRow(input: SongInput) {
  return {
    title: input.title.trim(),
    artist: input.artist?.trim() || null,
    durationSeconds:
      typeof input.durationSeconds === 'number' && !isNaN(input.durationSeconds)
        ? Math.round(input.durationSeconds)
        : null,
    notes: input.notes?.trim() || null,
    active: input.active ?? true,
  };
}

export async function listSongs() {
  return db.select().from(schema.song).orderBy(asc(schema.song.title));
}

export async function createSong(input: SongInput) {
  const id = randomUUID();
  await db.insert(schema.song).values({ id, ...songRow(input) });
  return id;
}

export async function updateSong(id: string, input: Partial<SongInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title.trim();
  if ('artist' in input) set.artist = input.artist?.trim() || null;
  if ('durationSeconds' in input)
    set.durationSeconds =
      typeof input.durationSeconds === 'number' && !isNaN(input.durationSeconds)
        ? Math.round(input.durationSeconds)
        : null;
  if ('notes' in input) set.notes = input.notes?.trim() || null;
  if (input.active !== undefined) set.active = !!input.active;
  await db.update(schema.song).set(set).where(eq(schema.song.id, id));
}

export async function deleteSong(id: string) {
  await db.delete(schema.song).where(eq(schema.song.id, id));
}

// ── Setlists ────────────────────────────────────────────────────────────────

export type SetlistInput = {
  title: string;
  eventId?: string | null;
  notes?: string | null;
};

export function validateSetlist(input: Partial<SetlistInput>): string | null {
  if (!input.title || !input.title.trim()) return 'Titel ist Pflicht.';
  return null;
}

/** All setlists with a song count + summed duration (unknown lengths ignored). */
export async function listSetlists() {
  const lists = await db.select().from(schema.setlist).orderBy(asc(schema.setlist.title));
  if (lists.length === 0) return [];
  const rows = await db
    .select({
      setlistId: schema.setlistItem.setlistId,
      count: sql<number>`count(*)`.as('count'),
      duration: sql<number>`coalesce(sum(${schema.song.durationSeconds}), 0)`.as('duration'),
    })
    .from(schema.setlistItem)
    .leftJoin(schema.song, eq(schema.setlistItem.songId, schema.song.id))
    .groupBy(schema.setlistItem.setlistId);
  const stats = new Map(rows.map((r) => [r.setlistId, { count: Number(r.count), duration: Number(r.duration) }]));
  return lists.map((l) => ({
    ...l,
    songCount: stats.get(l.id)?.count ?? 0,
    durationSeconds: stats.get(l.id)?.duration ?? 0,
  }));
}

/** One setlist with its ordered items, each joined to the song. */
export async function getSetlist(id: string) {
  const [list] = await db.select().from(schema.setlist).where(eq(schema.setlist.id, id)).limit(1);
  if (!list) return null;
  const items = await db
    .select({
      itemId: schema.setlistItem.id,
      position: schema.setlistItem.position,
      note: schema.setlistItem.note,
      songId: schema.song.id,
      title: schema.song.title,
      artist: schema.song.artist,
      durationSeconds: schema.song.durationSeconds,
      active: schema.song.active,
    })
    .from(schema.setlistItem)
    .innerJoin(schema.song, eq(schema.setlistItem.songId, schema.song.id))
    .where(eq(schema.setlistItem.setlistId, id))
    .orderBy(asc(schema.setlistItem.position));
  return { list, items };
}

export async function createSetlist(input: SetlistInput, userId: string) {
  const id = randomUUID();
  await db.insert(schema.setlist).values({
    id,
    title: input.title.trim(),
    eventId: input.eventId || null,
    notes: input.notes?.trim() || null,
    createdBy: userId,
  });
  return id;
}

export async function updateSetlist(id: string, input: Partial<SetlistInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title.trim();
  if ('eventId' in input) set.eventId = input.eventId || null;
  if ('notes' in input) set.notes = input.notes?.trim() || null;
  await db.update(schema.setlist).set(set).where(eq(schema.setlist.id, id));
}

export async function deleteSetlist(id: string) {
  await db.delete(schema.setlist).where(eq(schema.setlist.id, id));
}

// ── Setlist items (ordering) ─────────────────────────────────────────────────

/** Append a song to the end of a setlist. */
export async function addItem(setlistId: string, songId: string) {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${schema.setlistItem.position}), -1)` })
    .from(schema.setlistItem)
    .where(eq(schema.setlistItem.setlistId, setlistId));
  const position = Number(max?.max ?? -1) + 1;
  const id = randomUUID();
  await db.insert(schema.setlistItem).values({ id, setlistId, songId, position });
  await touchSetlist(setlistId);
  return id;
}

export async function removeItem(itemId: string) {
  const [row] = await db
    .select({ setlistId: schema.setlistItem.setlistId })
    .from(schema.setlistItem)
    .where(eq(schema.setlistItem.id, itemId))
    .limit(1);
  await db.delete(schema.setlistItem).where(eq(schema.setlistItem.id, itemId));
  if (row) await touchSetlist(row.setlistId);
}

export async function setItemNote(itemId: string, note: string | null) {
  await db
    .update(schema.setlistItem)
    .set({ note: note?.trim() || null })
    .where(eq(schema.setlistItem.id, itemId));
}

/** Rewrite positions to match the given item order (ids must belong to the set). */
export async function reorderItems(setlistId: string, orderedItemIds: string[]) {
  const existing = await db
    .select({ id: schema.setlistItem.id })
    .from(schema.setlistItem)
    .where(eq(schema.setlistItem.setlistId, setlistId));
  const valid = new Set(existing.map((r) => r.id));
  // Only touch ids that really belong to this setlist; keep the caller's order.
  const order = orderedItemIds.filter((id) => valid.has(id));
  for (let i = 0; i < order.length; i++) {
    await db.update(schema.setlistItem).set({ position: i }).where(eq(schema.setlistItem.id, order[i]));
  }
  await touchSetlist(setlistId);
}

async function touchSetlist(setlistId: string) {
  await db.update(schema.setlist).set({ updatedAt: new Date() }).where(eq(schema.setlist.id, setlistId));
}

// ── Seeding: the live repertoire ─────────────────────────────────────────────

type SeedSong = { title: string; artist?: string; key: string };

// The band's repertoire. Album tracks come from their Spotify discography
// ("The Beginning", Uncle M Music, 2026); the live-only songs + the cover come
// from a real 35-min set the band played. Durations unknown — filled in the UI.
export const SEED_SONGS: SeedSong[] = [
  // Album — "The Beginning"
  { title: 'The End', key: 'album:1' },
  { title: 'Therapy', key: 'album:2' },
  { title: 'Strength In You', key: 'album:3' },
  { title: 'Accept Myself', key: 'album:4' },
  { title: 'Just Like Me', key: 'album:5' },
  { title: 'Leave A Light On', key: 'album:6' },
  { title: 'Back in Life', key: 'album:7' },
  { title: 'Forever', key: 'album:8' },
  { title: 'Before I Drown', key: 'album:9' },
  { title: 'Where Do We Go', key: 'album:10' },
  { title: 'The Beginning', key: 'album:11' },
  // Live-only (nicht auf dem Album)
  { title: 'Downfall', key: 'live:downfall' },
  { title: 'Promises', key: 'live:promises' },
  { title: 'So Sail On', key: 'live:so-sail-on' },
  { title: 'Live For Today', key: 'live:live-for-today' },
  // Cover
  { title: 'Boys of Summer', artist: 'The Ataris', key: 'cover:boys-of-summer' },
];

/** Idempotent: inserts any missing seed song (matched by sourceKey). */
export async function seedSongs() {
  const keys = SEED_SONGS.map((s) => s.key);
  const present = await db
    .select({ sourceKey: schema.song.sourceKey })
    .from(schema.song)
    .where(inArray(schema.song.sourceKey, keys));
  const have = new Set(present.map((r) => r.sourceKey));
  const missing = SEED_SONGS.filter((s) => !have.has(s.key));
  if (missing.length === 0) return 0;
  await db.insert(schema.song).values(
    missing.map((s) => ({
      id: randomUUID(),
      title: s.title,
      artist: s.artist ?? null,
      active: true,
      sourceKey: s.key,
    })),
  );
  return missing.length;
}

// A real 35-min set the band played — seeded once as a starting point.
const STARTER_SETLIST = {
  title: 'Live-Set (35 Min)',
  order: [
    'album:1', // The End
    'live:downfall',
    'live:promises',
    'album:3', // Strength In You
    'cover:boys-of-summer',
    'live:so-sail-on',
    'album:5', // Just Like Me
    'album:4', // Accept Myself
    'live:live-for-today',
    'album:6', // Leave A Light On
  ],
};

/** Idempotent: creates the starter setlist once (skips if the title exists). */
export async function seedStarterSetlist(userId?: string) {
  const [existing] = await db
    .select({ id: schema.setlist.id })
    .from(schema.setlist)
    .where(eq(schema.setlist.title, STARTER_SETLIST.title))
    .limit(1);
  if (existing) return false;
  const rows = await db
    .select({ id: schema.song.id, sourceKey: schema.song.sourceKey })
    .from(schema.song)
    .where(inArray(schema.song.sourceKey, STARTER_SETLIST.order));
  const byKey = new Map(rows.map((r) => [r.sourceKey, r.id]));
  const songIds = STARTER_SETLIST.order.map((k) => byKey.get(k)).filter((v): v is string => !!v);
  if (songIds.length === 0) return false;
  const setlistId = randomUUID();
  await db.insert(schema.setlist).values({ id: setlistId, title: STARTER_SETLIST.title, createdBy: userId ?? null });
  await db
    .insert(schema.setlistItem)
    .values(songIds.map((songId, i) => ({ id: randomUUID(), setlistId, songId, position: i })));
  return true;
}

// ── Formatting helpers (shared server/client) ───────────────────────────────

/** seconds → "m:ss" (or "" when unknown). */
export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** "m:ss" or "mm" → seconds, or null if blank/invalid. */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) * 60; // bare number = minutes
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
