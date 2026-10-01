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

import { asc, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { concepts, domains } from '../db/schema'

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

/**
 * Machine key derived from the name.
 *
 * Derived rather than asked for: `key` exists so MCP callers and the seed can
 * name a domain stably, and it is not something a person should have to invent
 * while adding "Workouts" to their own app. Renaming a domain later leaves the
 * key alone, which is the point of having both.
 */
export function domainKeyFrom(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export const createDomainInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'A domain needs a name.')
    .max(60, 'That name is too long.')
    .refine((n) => domainKeyFrom(n).length > 0, 'That name needs a letter or a number.'),
  /** Palette slot 1–6. See docs/design/SYSTEM.md. */
  accent: z.coerce.number().int().min(1).max(6).default(1),
})

export type CreateDomainInput = z.infer<typeof createDomainInput>

/**
 * Add a domain. Global, so the only failure is "already there".
 *
 * `onConflictDoNothing` on the derived key rather than a SELECT-then-INSERT:
 * two callers adding "Databases" at once would race, and a unique index is the
 * one place that race can actually be settled.
 *
 * Returns null when the key already exists — the caller decides whether that
 * is an error or simply the outcome.
 */
export async function createDomain(
  db: Db,
  input: CreateDomainInput,
): Promise<Domain | null> {
  const [row] = await db
    .insert(domains)
    .values({
      key: domainKeyFrom(input.name),
      name: input.name.trim(),
      accent: input.accent,
    })
    .onConflictDoNothing({ target: domains.key })
    .returning()

  return row ?? null
}

/** How many concepts each domain carries — the only count the picker needs. */
export async function countConceptsByDomain(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ domainId: concepts.domainId, count: sql<number>`count(*)::int` })
    .from(concepts)
    .groupBy(concepts.domainId)

  return new Map(rows.map((r) => [r.domainId, r.count]))
}
