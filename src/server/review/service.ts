/**
 * Review, scheduled by FSRS.
 *
 * `ts-fsrs` owns every scheduling decision. Nothing here computes an interval,
 * a stability, or a due date by hand — that is the single rule this module
 * exists to keep.
 *
 * No `next/*` imports.
 */

import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import { createEmptyCard, fsrs, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import { z } from 'zod'
import type { Db } from '../db'
import { cards, concepts, domains, reviews } from '../db/schema'
import type { CardType } from '@/lib/cards'

/** One scheduler for the process. Default parameters until there is data to tune on. */
const scheduler = fsrs()

/** Ratings a person can give. `Manual` (0) is excluded — it is not a judgement. */
export const ratingInput = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

export type ReviewRating = z.infer<typeof ratingInput>

export type DueCard = {
  id: string
  cardType: CardType
  front: string
  back: string
  due: Date
  reps: number
  concept: { id: string; name: string; domain: { name: string; accent: number } }
}

/**
 * The queue: everything due now, across every domain.
 *
 * ONE queue. Not one per domain, not filtered by domain, with no picker
 * anywhere near it. If review is per-domain this is just Anki decks and the
 * entire cross-domain thesis is lost.
 *
 * Ordered by due date so the most overdue is answered first.
 */
export async function listDueCards(
  db: Db,
  userId: string,
  { now = new Date(), limit = 100 }: { now?: Date; limit?: number } = {},
): Promise<DueCard[]> {
  const rows = await db
    .select({
      id: cards.id,
      cardType: cards.cardType,
      front: cards.front,
      back: cards.back,
      due: cards.due,
      reps: cards.reps,
      conceptId: concepts.id,
      conceptName: concepts.name,
      domainName: domains.name,
      domainAccent: domains.accent,
    })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .innerJoin(domains, eq(concepts.domainId, domains.id))
    .where(and(eq(concepts.userId, userId), lte(cards.due, now)))
    .orderBy(asc(cards.due))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    cardType: r.cardType,
    front: r.front,
    back: r.back,
    due: r.due,
    reps: r.reps,
    concept: {
      id: r.conceptId,
      name: r.conceptName,
      domain: { name: r.domainName, accent: r.domainAccent },
    },
  }))
}

export async function countDue(db: Db, userId: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(and(eq(concepts.userId, userId), lte(cards.due, now)))

  return row?.count ?? 0
}

/** Our row → the shape ts-fsrs expects. Field names differ; the values do not. */
function toFsrsCard(row: typeof cards.$inferSelect): FsrsCard {
  const empty = createEmptyCard(row.createdAt)
  return {
    ...empty,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ?? undefined,
  }
}

export type RateResult =
  | { ok: true; nextDue: Date; state: State }
  | { ok: false; reason: 'not-found' }

/**
 * Record one review.
 *
 * Two writes that must not diverge, so they run in a transaction: the card's
 * current FSRS state, and an append-only row in `reviews`. The log carries the
 * full post-review state, which is what lets a schedule be re-derived if the
 * algorithm changes, and what makes card health answerable without a column.
 *
 * Ownership reaches the card through its concept — cards have no `user_id`,
 * and that stays the single authorization path.
 */
export async function rateCard(
  db: Db,
  userId: string,
  cardId: string,
  rating: ReviewRating,
  now = new Date(),
): Promise<RateResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(cards)
      .innerJoin(concepts, eq(cards.conceptId, concepts.id))
      .where(and(eq(cards.id, cardId), eq(concepts.userId, userId)))
      .limit(1)

    if (!row) return { ok: false, reason: 'not-found' } as const

    const current = row.cards
    const { card: next, log } = scheduler.next(toFsrsCard(current), now, rating as Grade)

    await tx
      .update(cards)
      .set({
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsed_days,
        scheduledDays: next.scheduled_days,
        learningSteps: next.learning_steps,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        lastReview: next.last_review ?? now,
      })
      .where(eq(cards.id, current.id))

    // Append-only. Never updated, never deleted.
    await tx.insert(reviews).values({
      cardId: current.id,
      rating,
      state: next.state,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: log.elapsed_days,
      scheduledDays: next.scheduled_days,
      learningSteps: next.learning_steps,
      dueAt: next.due,
      reviewedAt: now,
    })

    return { ok: true, nextDue: next.due, state: next.state } as const
  })
}

export type UnhealthyCard = {
  cardId: string
  front: string
  conceptName: string
  reps: number
  againRate: number
}

/**
 * Cards that are probably badly written rather than hard.
 *
 * Wrong more than 60% of the time after 5+ reviews. Flag for a rewrite instead
 * of letting FSRS grind on them forever — a card you keep failing is usually
 * asking the wrong question, and no amount of scheduling fixes that.
 *
 * A query over the append-only log, not a column. Nothing to maintain, and it
 * stays correct if the threshold changes.
 */
export async function unhealthyCards(
  db: Db,
  userId: string,
  { minReviews = 5, againRate = 0.6 }: { minReviews?: number; againRate?: number } = {},
): Promise<UnhealthyCard[]> {
  const rows = await db
    .select({
      cardId: cards.id,
      front: cards.front,
      conceptName: concepts.name,
      total: sql<number>`count(${reviews.id})::int`,
      again: sql<number>`count(*) filter (where ${reviews.rating} = 1)::int`,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(concepts, eq(cards.conceptId, concepts.id))
    .where(eq(concepts.userId, userId))
    .groupBy(cards.id, cards.front, concepts.name)
    .having(sql`count(${reviews.id}) >= ${minReviews}`)
    .orderBy(desc(sql`count(*) filter (where ${reviews.rating} = 1)::float / count(${reviews.id})`))

  return rows
    .map((r) => ({
      cardId: r.cardId,
      front: r.front,
      conceptName: r.conceptName,
      reps: r.total,
      againRate: r.total > 0 ? r.again / r.total : 0,
    }))
    .filter((r) => r.againRate > againRate)
}
