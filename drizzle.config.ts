import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

/**
 * Migrations run against the DIRECT connection, never the pooler — DDL and
 * advisory locks do not survive transaction-mode pooling.
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
