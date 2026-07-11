// Seeds the song library (album + live repertoire) and, on a fresh DB, the
// real 35-min starter setlist. Idempotent via sourceKey / title — safe to
// re-run on every deploy. Afterwards the band manages everything from
// /backend/setlists.
import { seedSongs, seedStarterSetlist } from '../src/lib/setlists.ts';

export async function seedSetlistData() {
  const added = await seedSongs();
  const madeSet = await seedStarterSetlist();
  console.log(`  ✓ Songbibliothek abgeglichen (${added} neu)${madeSet ? ', Starter-Setlist angelegt' : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedSetlistData();
  process.exit(0);
}
