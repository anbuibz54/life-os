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
 * `max: 1` was wrong, and the way it was wrong is worth keeping written down.
 *
 * The reasoning was that each serverless invocation is its own short-lived
 * process, so the pooler should do the pooling. That ignores concurrency
 * *inside* one invocation: a Server Component doing `Promise.all` over eight
 * queries is eight concurrent queries on one pool, and the home page does
 * exactly that. Every query was fast alone (~180ms) and the page hung forever.
 *
 * Measured against this project's pooler, with a 20s ceiling:
 *
 *   transaction (6543)  max=1  n=8    hangs, reproducibly
 *   transaction (6543)  max=5  n=20   hangs, reproducibly
 *   transaction (6543)  max=20 n=21   ok
 *   session     (5432)  max=5  n=50   ok
 *   session     (5432)  max=3  n=100  ok
 *
 * So transaction mode survives light oversubscription and hangs once the queue
 * deepens, while session mode queues happily at 33x. Tuning `max` to stay
 * under an unknown cliff is not a fix — the failure mode is a hang, not an
 * error, so it would come back silently the day a page grows one more query.
 * Runtime therefore uses the SESSION pooler; see .env.local.
 *
 * `prepare: false` is kept: it is required by transaction mode and harmless in
 * session mode, so the setting stays correct if runtime moves back.
 *
 * `max: 5` is comfortably above the busiest page's eight-query fan-out once
 * queuing actually works, and small enough that a burst of invocations does
 * not exhaust the pooler.
 */
function createClient() {
  return postgres(connectionString!, { prepare: false, max: 5 })
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
