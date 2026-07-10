// Crew (member) management — shared helpers for the /backend/mitglieder page
// and the /api/crew/* endpoints. Every mutation is bandleader-only.
import { and, eq, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { db, schema } from './db';

export const ROLES = ['bandleader', 'member', 'sub'] as const;
export type Role = (typeof ROLES)[number];

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  instrument: string | null;
  active: boolean;
};

/** Returns the signed-in user only if they are a bandleader, else null. */
export async function requireBandleader(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== 'bandleader') return null;
  return user;
}

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      instrument: schema.user.instrument,
      emailVerified: schema.user.emailVerified,
    })
    .from(schema.user)
    .orderBy(schema.user.name);
  // "active" = has logged in at least once (Better Auth verifies the email on
  // the first successful magic-link); otherwise the invite is still pending.
  return rows.map(({ emailVerified, ...r }) => ({ ...r, active: emailVerified }));
}

/** Insert a member (idempotent) and send them a login/invite link. */
export async function inviteMember(
  input: { name: string; email: string; role: Role; instrument?: string },
  origin: string,
) {
  const email = input.email.trim().toLowerCase();
  await db
    .insert(schema.user)
    .values({
      id: randomUUID(),
      name: input.name.trim(),
      email,
      emailVerified: false,
      role: input.role,
      instrument: input.instrument?.trim() || null,
      invitedAt: new Date(),
    })
    .onConflictDoNothing({ target: schema.user.email });

  // Send the magic-link mail via the exact same path as the login: hand the
  // auth handler a real Request (full URL → origin derivation works with or
  // without BETTER_AUTH_URL, local and prod). The member now exists, so the
  // invite-only guard in auth.ts passes.
  const res = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ email, callbackURL: '/backend' }),
    }),
  );
  if (!res.ok) {
    throw new Error(`magic-link send failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

export async function setRole(userId: string, role: Role) {
  await db.update(schema.user).set({ role }).where(eq(schema.user.id, userId));
}

/** Remove a member — never the caller themselves (avoid self-lockout). */
export async function removeMember(userId: string, callerId: string) {
  if (userId === callerId) throw new Error('self-remove');
  await db.delete(schema.user).where(and(eq(schema.user.id, userId), ne(schema.user.id, callerId)));
}
