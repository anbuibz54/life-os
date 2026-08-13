/**
 * Concepts.
 *
 * The stable nodes. Many notes attach to one concept; cards attach to concepts,
 * never to notes — otherwise you get five overlapping cards about B-trees
 * instead of one that improves as you learn more.
 *
 * No `next/*` imports.
 */

import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { concepts, domains, notes } from '../db/schema'

export type Concept = typeof concepts.$inferSelect

/** A concept with the display data every surface needs alongside it. */
export type ConceptView = {
  id: string
  name: string
  summary: string | null
  domain: { id: string; name: string; accent: number }
  noteCount: number
}

export const createConceptInput = z.object({
  name: z.string().trim().min(1, 'A concept needs a name.').max(200, 'That name is too long.'),
  domainId: z.uuid('Pick a domain.'),
  summary: z.string().trim().max(2000).optional(),
})

export type CreateConceptInput = z.infer<typeof createConceptInput>

/**
 * Search within a user's own concepts.
 *
 * This is what makes classification possible — the picker and the MCP
 * `list_concepts` tool both read it before anything decides where a note goes.
 * Backed by `concepts_user_name_idx`.
 */
export async function listConcepts(
  db: Db,
  userId: string,
  { search, limit = 50 }: { search?: string; limit?: number } = {},
): Promise<ConceptView[]> {
  const term = search?.trim()

  const rows = await db
    .select({
      id: concepts.id,
      name: concepts.name,
      summary: concepts.summary,
      domainId: domains.id,
      domainName: domains.name,
      domainAccent: domains.accent,
      noteCount: sql<number>`(
        select count(*)::int from ${notes} where ${notes.conceptId} = ${concepts.id}
      )`,
    })
    .from(concepts)
    .innerJoin(domains, eq(concepts.domainId, domains.id))
    .where(
      term
        ? and(eq(concepts.userId, userId), ilike(concepts.name, `%${term}%`))
        : eq(concepts.userId, userId),
    )
    .orderBy(asc(concepts.name))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    summary: r.summary,
    domain: { id: r.domainId, name: r.domainName, accent: r.domainAccent },
    noteCount: r.noteCount,
  }))
}

export async function countConcepts(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(concepts)
    .where(eq(concepts.userId, userId))

  return row?.count ?? 0
}

export async function createConcept(
  db: Db,
  userId: string,
  input: CreateConceptInput,
): Promise<Concept> {
  const [row] = await db
    .insert(concepts)
    .values({
      userId,
      name: input.name,
      domainId: input.domainId,
      summary: input.summary ?? null,
    })
    .returning()

  return row
}

/** Ownership check. Concepts are per-user; a foreign id must not resolve. */
export async function findConcept(
  db: Db,
  userId: string,
  conceptId: string,
): Promise<Concept | undefined> {
  const [row] = await db
    .select()
    .from(concepts)
    .where(and(eq(concepts.id, conceptId), eq(concepts.userId, userId)))
    .limit(1)

  return row
}
