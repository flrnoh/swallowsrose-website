// Drizzle schema for the member area.
//
// The four core tables (user/session/account/verification) are Better Auth's
// required models — column names follow Better Auth's Drizzle convention.
// We extend `user` with band-specific fields (role, instrument) plus invite
// bookkeeping (invitedAt/activatedAt) that we manage ourselves.
import { pgTable, text, timestamp, boolean, integer, unique } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // — Band-specific —
  // 'bandleader' | 'member' | 'sub'  (Rollen-Rechte kommen später drauf)
  role: text('role').notNull().default('member'),
  instrument: text('instrument'),
  // Invite bookkeeping: set when we seed/invite; activatedAt on first login.
  invitedAt: timestamp('invited_at'),
  activatedAt: timestamp('activated_at'),
  // Secret token for this member's personal iCal subscription feed.
  icalToken: text('ical_token').unique(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Shared band calendar. Public events also feed the marketing site's tour list.
export const event = pgTable('event', {
  id: text('id').primaryKey(),
  // 'gig' | 'probe' | 'sonstiges'
  type: text('type').notNull().default('sonstiges'),
  title: text('title').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at'),
  allDay: boolean('all_day').notNull().default(false),
  location: text('location'),
  city: text('city'),
  ticketUrl: text('ticket_url'),
  notes: text('notes'),
  // Public events surface on swallowsrose.com's tour calendar.
  isPublic: boolean('is_public').notNull().default(false),
  // Booking pipeline (gigs): anfrage → angebot → bestaetigt → gespielt / abgesagt.
  // Non-gig events stay 'bestaetigt' (they're real dates, not inquiries).
  status: text('status').notNull().default('bestaetigt'),
  fee: integer('fee'), // Gage in whole euros
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  // Deterministic key for idempotent seeding (e.g. legacy tour dates); null for
  // member-created events.
  sourceKey: text('source_key').unique(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Per-member availability for an event (gig/probe). One response per member.
export const availability = pgTable(
  'availability',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'ja' | 'vielleicht' | 'nein'
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.eventId, t.userId)],
);

// Day sheet for a confirmed gig — the load-in/schedule/logistics info the band
// needs on show day. One optional sheet per event (unique eventId).
export const gigSheet = pgTable('gig_sheet', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .unique()
    .references(() => event.id, { onDelete: 'cascade' }),
  // Schedule — free text (e.g. "16:00", "ab 17 Uhr", "TBC"); relative to the gig day.
  loadIn: text('load_in'),
  soundcheck: text('soundcheck'),
  doors: text('doors'),
  stageTime: text('stage_time'),
  setLength: text('set_length'),
  // Logistics
  address: text('address'), // full venue address for navigation
  parking: text('parking'),
  accommodation: text('accommodation'),
  catering: text('catering'),
  backline: text('backline'), // provided backline / tech
  // On-site contact (separate from the booking contact on the gig itself)
  contactOnSite: text('contact_on_site'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Song library — the band's repertoire. Setlists are built from these rows.
export const song = pgTable('song', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist'), // null = own song (Swallow's Rose); set for covers
  durationSeconds: integer('duration_seconds'), // null = unknown
  notes: text('notes'), // tuning, key, cues …
  active: boolean('active').notNull().default(true),
  // Deterministic key for idempotent seeding (album tracks); null for
  // member-added songs.
  sourceKey: text('source_key').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// A named, ordered setlist — optionally tied to a gig (event).
export const setlist = pgTable('setlist', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  eventId: text('event_id').references(() => event.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Ordered songs within a setlist. position = 0-based order; a song may repeat.
export const setlistItem = pgTable('setlist_item', {
  id: text('id').primaryKey(),
  setlistId: text('setlist_id')
    .notNull()
    .references(() => setlist.id, { onDelete: 'cascade' }),
  songId: text('song_id')
    .notNull()
    .references(() => song.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  note: text('note'), // per-slot cue (e.g. "Ansage", "tune down")
});

export const schema = {
  user,
  session,
  account,
  verification,
  event,
  availability,
  gigSheet,
  song,
  setlist,
  setlistItem,
};
