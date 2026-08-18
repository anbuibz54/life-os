/**
 * Daily activity and the streak.
 *
 * One row per user per day. Deriving streaks by scanning notes and reviews
 * gets slow; this stays cheap and is what the heatmap reads from.
 *
 * No `next/*` imports.
 */

import { and, desc, eq, gte } from 'drizzle-orm'
import type { Db } from '../db'
import { dailyActivity } from '../db/schema'

export type ActivityRow = typeof dailyActivity.$inferSelect

/**
 * Which day a capture belongs to.
 *
 * KNOWN LIMITATION. The caller passes the user's local date, because the
 * server has no idea what timezone they are in and UTC would roll the day over
 * mid-evening for anyone east of London — including the first real user. This
 * is trusted input, which is fine: it is the user's own streak, and lying to
 * it only cheats themselves.
 *
 * The real fix is a timezone on the user row. Not in v0.1; when it lands, this
 * function is the only place that needs to change.
 */
export function todayInZone(localDate?: string): string {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) return localDate
  return new Date().toISOString().slice(0, 10)
}

/** Mark one half of the loop done for a day. Idempotent. */
export async function markActivity(
  db: Db,
  userId: string,
  date: string,
  half: 'captured' | 'reviewed',
): Promise<void> {
  await db
    .insert(dailyActivity)
    .values({ userId, date, [half]: true })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.date],
      set: { [half]: true },
    })
}

/** Most recent activity rows, newest first. */
export async function recentActivity(
  db: Db,
  userId: string,
  days = 28,
): Promise<ActivityRow[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  return db
    .select()
    .from(dailyActivity)
    .where(
      and(
        eq(dailyActivity.userId, userId),
        gte(dailyActivity.date, since.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(desc(dailyActivity.date))
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Consecutive days ending today (or yesterday, if today has not happened yet).
 *
 * Counting from yesterday matters: a streak that breaks at midnight before
 * you have had a chance to act is a countdown timer, and countdown timers are
 * the compulsion mechanic this product rejects.
 *
 * SETTLED, now that review exists. A day counts when EITHER half of the loop
 * happened, and requiring both was considered and rejected.
 *
 * The rejected version punishes a day when nothing was due — you cannot review
 * an empty queue, so the streak would break for doing everything available to
 * you. That is a countdown timer with extra steps, and countdown timers are the
 * compulsion mechanic this product refuses. It would also push people to review
 * easy cards to protect a number, which is the exact Duolingo failure the
 * decision log names.
 *
 * What the rule still refuses to do is count volume: forty notes is one day,
 * the same as one note.
 */
export function streakFrom(rows: ActivityRow[], today: string): number {
  const active = new Set(
    rows.filter((r) => r.captured || r.reviewed).map((r) => r.date),
  )

  let cursor = active.has(today) ? today : previousDay(today)
  let streak = 0

  while (active.has(cursor)) {
    streak += 1
    cursor = previousDay(cursor)
  }

  return streak
}
