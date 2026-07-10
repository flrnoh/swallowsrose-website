// Reconcile the band roster. Idempotent — existing members are kept.
//   local:  npm run db:seed         (uses the dev fallback below)
//   deploy: runs from scripts/deploy-setup.ts inside the Vercel build
//
// This repo is PUBLIC, so real member emails must NOT live here. In prod the
// roster comes from the CREW_MEMBERS env var (a JSON array). Locally we fall
// back to a harmless dev list.
import { randomUUID } from 'node:crypto';
import { db, schema } from '../src/lib/db/index.ts';

export type Seed = {
  name: string;
  email: string;
  role: 'bandleader' | 'member' | 'sub';
  instrument: string;
};

// Dev-only fallback — no real addresses. Prod overrides via CREW_MEMBERS.
const DEV_ROSTER: Seed[] = [
  { name: 'Florian (Dev)', email: 'bandleader@example.test', role: 'bandleader', instrument: 'Management' },
  { name: 'Dev Mitglied', email: 'member@example.test', role: 'member', instrument: 'Test' },
];

function roster(): Seed[] {
  const raw = process.env.CREW_MEMBERS;
  if (!raw) return DEV_ROSTER;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed as Seed[];
    console.warn('CREW_MEMBERS ist leer / kein Array — nutze Dev-Fallback.');
  } catch {
    console.warn('CREW_MEMBERS ist kein gültiges JSON — nutze Dev-Fallback.');
  }
  return DEV_ROSTER;
}

export async function seedMembers(): Promise<void> {
  const members = roster();
  for (const m of members) {
    await db
      .insert(schema.user)
      .values({
        id: randomUUID(),
        name: m.name,
        email: m.email.toLowerCase(),
        emailVerified: false,
        role: m.role,
        instrument: m.instrument,
        invitedAt: new Date(),
      })
      .onConflictDoNothing({ target: schema.user.email });
    console.log(`  ✓ ${m.name} <${m.email}> (${m.role})`);
  }
  console.log(`\nFertig — ${members.length} Mitglied(er) abgeglichen (bestehende übersprungen).`);
}

// Direct CLI invocation: npm run db:seed
if (import.meta.url === `file://${process.argv[1]}`) {
  await seedMembers();
  process.exit(0);
}
