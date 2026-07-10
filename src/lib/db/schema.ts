// Drizzle schema for the member area.
//
// The four core tables (user/session/account/verification) are Better Auth's
// required models — column names follow Better Auth's Drizzle convention.
// We extend `user` with band-specific fields (role, instrument) plus invite
// bookkeeping (invitedAt/activatedAt) that we manage ourselves.
import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

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

export const schema = { user, session, account, verification, event };
