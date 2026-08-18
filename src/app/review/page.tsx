import { AppShell } from '@/components/app-shell'
import { ReviewSession, type ReviewCard } from '@/components/review/review-session'
import { SessionEnd } from '@/components/design/states'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { listDueCards } from '@/server/review/service'

/**
 * Review.
 *
 * One queue across every domain — no picker, no filter, no per-domain split.
 * Colour is nearly gone here by design: a single domain dot, and nothing else
 * competing for the attention retrieval needs.
 *
 * No destinations in the shell. Leaving is a deliberate act during a session,
 * not a row you brush past on the way to the rating buttons.
 */
export default async function ReviewPage() {
  const { user } = await requireUser()
  const due = await listDueCards(db, user.id)

  const queue: ReviewCard[] = due.map((c) => ({
    id: c.id,
    cardType: c.cardType,
    front: c.front,
    back: c.back,
    concept: { name: c.concept.name, domain: c.concept.domain },
  }))

  return (
    <AppShell>
      {queue.length === 0 ? (
        <SessionEnd title="Nothing due.">
          The queue is empty. This is the point — reaching zero is the whole
          reward, and there is no way to ask for more.
        </SessionEnd>
      ) : (
        <ReviewSession queue={queue} />
      )}
    </AppShell>
  )
}
