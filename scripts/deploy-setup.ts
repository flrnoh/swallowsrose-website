// Runs at the start of the Vercel build (see the `vercel-build` npm script).
// This is where DATABASE_URL actually exists — the Vercel env vars are
// "sensitive" (write-only) and can't be pulled locally, so migrations run here.
//
// Non-fatal by design: a DB hiccup must never break the (static) marketing
// site deploy. On failure it logs and exits 0 so `astro build` still runs;
// the member area would then error until the DB is reachable.
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { db, usingPglite } from '../src/lib/db/index.ts';
import { seedMembers } from './seed-members.ts';
import { seedTourDates } from './seed-tourdates.ts';
import { seedSetlistData } from './seed-songs.ts';
import { seedContacts } from './seed-contacts.ts';

async function main() {
  if (usingPglite) {
    console.log('[deploy-setup] kein DATABASE_URL — übersprungen (Build ohne DB).');
    return;
  }
  await migrateNeon(db as never, { migrationsFolder: './drizzle' });
  console.log('[deploy-setup] ✓ Neon-Schema aktuell.');
  await seedMembers();
  await seedTourDates();
  await seedSetlistData();
  await seedContacts();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[deploy-setup] fehlgeschlagen — Build läuft trotzdem weiter:', err);
    process.exit(0);
  });
