import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit is a plain CLI, so it does not inherit Next.js's env loading.
// `.env.local` first (where real credentials live, gitignored), `.env` after.
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

/**
 * Migrations run against DIRECT_URL — session-mode pooling (port 5432), never
 * transaction mode (6543). DDL, prepared statements, and the advisory lock
 * drizzle-kit takes do not survive a connection being handed between
 * transactions. See .env.local for why this is not the true direct host.
 *
 * `pnpm db:generate` writes SQL into ./drizzle and needs no database.
 * `pnpm db:migrate` applies it and does.
 *
 * Migrations only go forward. Never edit one that has been applied.
 */
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL ?? '',
  },
  strict: true,
  verbose: true,
})
