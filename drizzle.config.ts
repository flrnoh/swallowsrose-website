import { defineConfig } from 'drizzle-kit';

// SQL migrations are generated from src/lib/db/schema.ts into ./drizzle.
// They apply to both PGlite (local) and Neon (prod) — identical Postgres DDL.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
});
