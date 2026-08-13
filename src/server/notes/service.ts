/**
 * Notes service.
 *
 * All database access for notes goes through here. Route handlers and Server
 * Actions stay thin: parse, authenticate, call one of these, serialize.
 *
 * No `next/*` imports.
 */

import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { concepts, domains, notes } from '../db/schema'

export type Note = typeof notes.$inferSelect

/**
 * Capture input.
 *
 * `conceptId` is absent here on purpose — capture must never block on
 * classification. Filing happens later, from the inbox. A capture path that
 * asks "which concept?" mid-thought stops being used, and an unused capture
 * box makes every other feature worthless.
 */
export const createNoteInput = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something first.')
    // Generous. A note is a thought, not an essay, but truncating someone's
    // paste is worse than storing a long row.
    .max(20_000, 'That note is too long to store.'),
  sourceChannel: z.enum(['web', 'mcp']).default('web'),
  authoredBy: z.enum(['human', 'ai']).default('human'),
  sourceId: z.uuid().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteInput>

export async function createNote(
  db: Db,
  userId: string,
  input: CreateNoteInput,
): Promise<Note> {
  const [row] = await db
    .insert(notes)
    .values({
      userId,
      body: input.body,
      sourceChannel: input.sourceChannel,
      authoredBy: input.authoredBy,
      sourceId: input.sourceId ?? null,
      // conceptId deliberately left null.
    })
    .returning()

  return row
}

/** A note with the concept it is filed under, if any. */
export type NoteWithConcept = {
  id: string
  body: string
  createdAt: Date
  concept: { id: string; name: string; domain: { name: string; accent: number } } | null
}

/**
 * Most recent notes first.
 *
 * Keyset pagination rather than OFFSET: this list only grows, and OFFSET makes
 * the database walk every skipped row. `createdAt` is indexed with `userId`.
 *
 * LEFT joins, because an unfiled note is the normal case, not an error.
 */
export async function listNotes(
  db: Db,
  userId: string,
  { limit = 50, before }: { limit?: number; before?: Date } = {},
): Promise<NoteWithConcept[]> {
  const rows = await db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      conceptId: concepts.id,
      conceptName: concepts.name,
      domainName: domains.name,
      domainAccent: domains.accent,
    })
    .from(notes)
    .leftJoin(concepts, eq(notes.conceptId, concepts.id))
    .leftJoin(domains, eq(concepts.domainId, domains.id))
    .where(
      before
        ? and(eq(notes.userId, userId), lt(notes.createdAt, before))
        : eq(notes.userId, userId),
    )
    .orderBy(desc(notes.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    concept:
      r.conceptId && r.conceptName && r.domainName != null && r.domainAccent != null
        ? {
            id: r.conceptId,
            name: r.conceptName,
            domain: { name: r.domainName, accent: r.domainAccent },
          }
        : null,
  }))
}

/** Notes filed under one concept, oldest first — this reads as a history. */
export async function listNotesForConcept(
  db: Db,
  userId: string,
  conceptId: string,
): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.conceptId, conceptId)))
    .orderBy(notes.createdAt)
}

/**
 * File a note under a concept, or unfile it with `null`.
 *
 * Both ids are scoped to the caller. The `userId` predicate on the UPDATE is
 * what stops one user filing another's note, and the caller is expected to
 * have already resolved `conceptId` through `findConcept` for the same reason
 * — a foreign concept id must not become reachable by guessing.
 *
 * Returns false when nothing matched, which means the note was not theirs.
 */
export async function fileNote(
  db: Db,
  userId: string,
  noteId: string,
  conceptId: string | null,
): Promise<boolean> {
  const updated = await db
    .update(notes)
    .set({ conceptId })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning({ id: notes.id })

  return updated.length > 0
}

export async function countNotes(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notes)
    .where(eq(notes.userId, userId))

  return row?.count ?? 0
}

/**
 * Unfiled notes — inbox lane one. Backed by the partial index
 * `notes_unfiled_idx`, so this stays proportional to the backlog rather than
 * to the whole corpus.
 */
export async function countUnfiledNotes(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.conceptId)))

  return row?.count ?? 0
}
