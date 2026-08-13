/**
 * Domains.
 *
 * Rows, not migrations — adding "Visual design" later is an INSERT, and the
 * registry is what the UI reads to render pickers and what the AI reads to
 * know what exists.
 *
 * Global rather than per-user: domains are shared vocabulary. Two people both
 * learning databases should be using the same word for it, and a per-user copy
 * would make that accidental.
 *
 * No `next/*` imports.
 */

import { asc } from 'drizzle-orm'
import type { Db } from '../db'
import { domains } from '../db/schema'

export type Domain = typeof domains.$inferSelect

export async function listDomains(db: Db): Promise<Domain[]> {
  return db.select().from(domains).orderBy(asc(domains.name))
}

/**
 * The starter registry.
 *
 * Six, matching the six palette slots, and spread deliberately across both
 * first users — a developer and a designer are the same person with different
 * starting content, so the seed has to look like home to both.
 *
 * Seeding is idempotent on `key`, so running it again is safe and renaming a
 * domain in the dashboard will not be undone by a redeploy.
 */
export const STARTER_DOMAINS = [
  { key: 'systems-design', name: 'Systems design', accent: 1 },
  { key: 'databases', name: 'Databases', accent: 2 },
  { key: 'visual-design', name: 'Visual design', accent: 3 },
  { key: 'typography', name: 'Typography', accent: 4 },
  { key: 'algorithms', name: 'Algorithms', accent: 5 },
  { key: 'frontend', name: 'Frontend', accent: 6 },
] as const

export async function seedDomains(db: Db): Promise<number> {
  const rows = await db
    .insert(domains)
    .values([...STARTER_DOMAINS])
    .onConflictDoNothing({ target: domains.key })
    .returning()

  return rows.length
}
