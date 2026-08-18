'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { rateCard, ratingInput } from '@/server/review/service'
import { markActivity, todayInZone } from '@/server/activity/service'

export type RateOutcome = { error: string | null }

/**
 * Record one review.
 *
 * Marks the review half of the loop for the day. `localDate` comes from the
 * browser for the same reason capture does — the streak rolls over at the
 * user's midnight, not UTC's.
 */
export async function rateCardAction(input: {
  cardId: string
  rating: number
  localDate?: string
}): Promise<RateOutcome> {
  const { user } = await requireUser()

  const parsed = z
    .object({ cardId: z.uuid(), rating: ratingInput })
    .safeParse({ cardId: input.cardId, rating: input.rating })

  if (!parsed.success) return { error: 'That rating did not make sense.' }

  const result = await rateCard(db, user.id, parsed.data.cardId, parsed.data.rating)
  if (!result.ok) return { error: 'That card no longer exists.' }

  await markActivity(db, user.id, todayInZone(input.localDate), 'reviewed')

  revalidatePath('/')
  revalidatePath('/review')
  return { error: null }
}
