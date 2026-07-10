// One-time-ish import of the legacy static tour dates (src/data/site.ts) into
// the events table as public gigs. Idempotent via sourceKey — safe to re-run on
// every deploy. Once these live in the DB, manage them from /backend/kalender.
import { randomUUID } from 'node:crypto';
import { db, schema } from '../src/lib/db/index.ts';
import { tourDates } from '../src/data/site.ts';

export async function seedTourDates() {
  for (const d of tourDates) {
    await db
      .insert(schema.event)
      .values({
        id: randomUUID(),
        type: 'gig',
        title: d.venue,
        startAt: new Date(`${d.date}T00:00:00.000Z`),
        allDay: true,
        location: d.venue,
        city: d.city,
        ticketUrl: d.ticketUrl || null,
        notes: d.noteDE || null,
        isPublic: true,
        sourceKey: `site:${d.date}:${d.city}`,
      })
      .onConflictDoNothing({ target: schema.event.sourceKey });
  }
  console.log(`  ✓ ${tourDates.length} Tour-Termine abgeglichen (öffentlich)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedTourDates();
  process.exit(0);
}
