/**
 * Database client.
 *
 * Runtime uses the Supabase POOLER url; Drizzle migrations use the DIRECT url.
 * Migrations break on transaction-mode pooling, so the two are not
 * interchangeable — see `drizzle.config.ts`.
 *
 * No `next/*` imports. This module is transport-agnostic on purpose.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill in the ' +
      'Supabase pooler connection string.',
  )
}

/**
 * `prepare: false` is required by Supabase's transaction pooler — prepared
 * statements do not survive a connection being handed to another transaction.
 *
 * `max: 1` because each serverless invocation is its own short-lived process;
 * the pooler does the actual pooling. A larger pool here just multiplies
 * connections by the number of concurrent invocations.
 */
function createClient() {
  return postgres(connectionString!, { prepare: false, max: 1 })
}

/**
 * Reuse the client across hot reloads in dev. Without this, every edit opens a
 * new pool and the connection limit is reached in about a minute.
 */
const globalForDb = globalThis as unknown as {
  __lifeosDbClient?: ReturnType<typeof createClient>
}

const client = globalForDb.__lifeosDbClient ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__lifeosDbClient = client
}

export const db = drizzle(client, { schema })

export { schema }
export type Db = typeof db
