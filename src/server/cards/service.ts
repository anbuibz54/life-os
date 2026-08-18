/**
 * Cards.
 *
 * Attached to concepts, never to notes. Cards on notes give you five
 * overlapping cards about B-trees; cards on concepts give you one that
 * improves as you learn more.
 *
 * No `next/*` imports.
 */

import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { isDefinitionFront, DEFINITION_REJECTION } from '@/lib/cards'
import type { Db } from '../db'
import { cards, concepts } from '../db/schema'

export type Card = typeof cards.$inferSelect
export type { CardType } from '@/lib/cards'
export { CARD_TYPES, isDefinitionFront } from '@/lib/cards'

export const createCardInput = z.object({
  conceptId: z.uuid(),
  cardType: z.enum(['signature', 'discriminator', 'tradeoff', 'failure_mode']),
  front: z
    .string()
    .trim()
    .min(1, 'The front needs a situation.')
    .max(1000, 'That front is too long to read under time pressure.')
    .refine((v) => !isDefinitionFront(v), { message: DEFINITION_REJECTION }),
  back: z
    .string()
    .trim()
    .min(1, 'The back needs a decision.')
    .max(2000, 'That back is too long to recall.'),
})

export type CreateCardInput = z.infer<typeof createCardInput>

/**
 * Create a card under a concept the caller owns.
 *
 * Ownership is proved by the SELECT rather than trusted from the argument:
 * `conceptId` arrives from the client, and cards have no `user_id` of their
 * own — they reach ownership through the concept, which is the single
 * authorization path.
 */
export async function createCard(
  db: Db,
  userId: string,
  input: CreateCardInput,
): Promise<Card | null> {
  const [owned] = await db
    .select({ id: concepts.id })
    .from(concepts)
    .where(and(eq(concepts.id, input.conceptId), eq(concepts.userId, userId)))
    .limit(1)

  if (!owned) return null

  const [row] = await db
    .insert(cards)
    .values({
      conceptId: owned.id,
      cardType: input.cardType,
      front: input.front,
      back: input.back,
      // FSRS state comes from the column defaults: state 0 (new), due now. A
      // card you just wrote is reviewable today, which matters in week one
      // when the queue would otherwise be empty.
    })
    .returning()

  return row
}

export async function listCardsForConcept(
  db: Db,
  userId: string,
  conceptId: string,
): Promise<Card[]> {
  return db
    .select({
      id: cards.id,
      conceptId: cards.conceptId,
      cardType: cards.cardType,
      front: cards.front,
      back: cards.back,
      state: cards.state,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      reps: cards.reps,
      lapses: cards.lapses,
      lastReview: cards.lastReview,
      createdAt: cards.createdAt,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(and(eq(cards.conceptId, conceptId), eq(concepts.userId, userId)))
    .orderBy(asc(cards.createdAt))
}

/** Total across every domain — one corpus, not one per domain. */
export async function countCards(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(eq(concepts.userId, userId))

  return row?.count ?? 0
}

/** Card counts per concept, for list surfaces. */
export async function cardCountsByConcept(
  db: Db,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ conceptId: cards.conceptId, count: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(eq(concepts.userId, userId))
    .groupBy(cards.conceptId)

  return new Map(rows.map((r) => [r.conceptId, r.count]))
}

/** Delete, scoped through the concept. Returns false when it was not theirs. */
export async function deleteCard(db: Db, userId: string, cardId: string): Promise<boolean> {
  const [owned] = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(and(eq(cards.id, cardId), eq(concepts.userId, userId)))
    .limit(1)

  if (!owned) return false

  await db.delete(cards).where(eq(cards.id, owned.id))
  return true
}
