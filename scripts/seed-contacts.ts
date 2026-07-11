// Reconcile the crew address book (/backend/kontakte). Idempotent over
// sourceKey — existing contacts are kept; safe to re-run on every deploy.
//   local:  npx tsx scripts/seed-contacts.ts   (uses the dev fallback)
//   deploy: runs from scripts/deploy-setup.ts inside the Vercel build
//
// This repo is PUBLIC, so real third-party contact data (promoter/band emails
// and phone numbers) must NOT live here. In prod the address book comes from the
// CREW_CONTACTS env var (a JSON array of SeedContact — see src/data/contacts.ts).
// Locally we fall back to a harmless dev list.
import { randomUUID } from 'node:crypto';
import { db, schema } from '../src/lib/db/index.ts';
import { DEV_CONTACTS, type SeedContact } from '../src/data/contacts.ts';

function contacts(): SeedContact[] {
  const raw = process.env.CREW_CONTACTS;
  if (!raw) return DEV_CONTACTS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed as SeedContact[];
    console.warn('CREW_CONTACTS ist leer / kein Array — nutze Dev-Fallback.');
  } catch {
    console.warn('CREW_CONTACTS ist kein gültiges JSON — nutze Dev-Fallback.');
  }
  return DEV_CONTACTS;
}

export async function seedContacts() {
  const list = contacts();
  for (const c of list) {
    await db
      .insert(schema.contact)
      .values({
        id: randomUUID(),
        name: c.name,
        kind: c.kind,
        person: c.person ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        instagram: c.instagram ?? null,
        city: c.city ?? null,
        notes: c.notes ?? null,
        sourceKey: c.sourceKey,
      })
      .onConflictDoNothing({ target: schema.contact.sourceKey });
  }
  console.log(`  ✓ ${list.length} Kontakte abgeglichen`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedContacts();
  process.exit(0);
}
