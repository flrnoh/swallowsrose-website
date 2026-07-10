// Database connection factory.
//
// Prod (Vercel): a real DATABASE_URL is set → Neon serverless driver.
// Local dev: no DATABASE_URL → in-process PGlite persisted under ./.pglite,
// so the whole login flow runs without provisioning anything.
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { neon } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import { schema } from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

// PGlite persists to disk locally; a single shared instance per process.
let pgliteClient: PGlite | undefined;

function makeDb() {
  if (DATABASE_URL) {
    return drizzleNeon(neon(DATABASE_URL), { schema });
  }
  pgliteClient ??= new PGlite('./.pglite');
  return drizzlePglite(pgliteClient, { schema });
}

export const usingPglite = !DATABASE_URL;
export const db = makeDb();
export { schema };
