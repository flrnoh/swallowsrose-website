// Better Auth server instance — magic-link, invite-only.
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';
import { sendMagicLinkEmail } from './email';

export const auth = betterAuth({
  // In prod BETTER_AUTH_URL pins the origin; in dev it's left unset so Better
  // Auth infers the origin from the request (works on any localhost port).
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : undefined,
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-insecure-secret-change-me',
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  // No passwords anywhere — the only way in is a magic link to an invited member.
  emailAndPassword: { enabled: false },

  plugins: [
    magicLink({
      // Belt: even if a link were issued, verification never creates a new user.
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => {
        // Suspenders: invite-only. Only send to emails that are already members.
        const existing = await db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, email.toLowerCase()))
          .limit(1);

        if (existing.length === 0) {
          // Don't reveal membership to the requester; just drop it (log in dev).
          console.warn(`[auth] Magic-Link für unbekannte Mail ignoriert (invite-only): ${email}`);
          return;
        }
        await sendMagicLinkEmail({ email, url });
      },
    }),
  ],
});
