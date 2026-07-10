// Applies the generated SQL migrations to the active database.
//   local:  npm run db:setup            → PGlite (./.pglite)
//   prod:   DATABASE_URL=... npm run db:setup   → Neon
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { db, usingPglite } from '../src/lib/db/index.ts';

const opts = { migrationsFolder: './drizzle' };

if (usingPglite) {
  await migratePglite(db as never, opts);
  console.log('✓ PGlite schema applied (local ./.pglite)');
} else {
  await migrateNeon(db as never, opts);
  console.log('✓ Neon schema applied');
}
process.exit(0);
