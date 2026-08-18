'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { rateCardAction } from '@/app/_actions/review'
import { CardFace } from '@/components/design/card-face'
import { RatingButtons, type Rating } from '@/components/design/rating-buttons'
import { SessionEnd } from '@/components/design/states'
import { asAccent } from '@/components/design/domain-dot'
import { Button } from '@/components/ui/button'
import type { CardType } from '@/lib/cards'

export type ReviewCard = {
  id: string
  cardType: CardType
  front: string
  back: string
  concept: { name: string; domain: { name: string; accent: number } }
}

/**
 * One pass through the due queue.
 *
 * The whole queue is loaded up front and advanced locally, so answering a card
 * never waits on the network. Review is repetitive by design; a round trip
 * between every card turns a two-minute session into a chore, and a chore gets
 * skipped tomorrow.
 *
 * Rating fires without being awaited and the next card appears immediately.
 * The write is not in doubt — it is the user's own card and the transaction is
 * small — and making someone watch a spinner to be told what they already know
 * costs more than the rare failure does. Failures surface quietly at the end
 * rather than interrupting the run.
 *
 * The session has a real ending. When the queue empties you are done, and
 * there is deliberately no way to ask for more.
 */
export function ReviewSession({ queue }: { queue: ReviewCard[] }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [failed, setFailed] = useState(0)

  const card = queue[index]
  const done = index >= queue.length

  const onRate = useCallback(
    (rating: Rating) => {
      if (!card) return
      const localDate = new Date().toLocaleDateString('en-CA')

      void rateCardAction({ cardId: card.id, rating, localDate }).then((r) => {
        if (r.error) setFailed((n) => n + 1)
      })

      setRevealed(false)
      setIndex((i) => i + 1)
    },
    [card],
  )

  // Space or Enter reveals. Both, because the muscle memory differs by person
  // and neither means anything else on this screen.
  useEffect(() => {
    if (done || revealed) return

    function onKey(event: KeyboardEvent) {
      if (event.key !== ' ' && event.key !== 'Enter') return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|BUTTON)$/.test(target.tagName)) return
      event.preventDefault()
      setRevealed(true)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, revealed])

  if (done) {
    return (
      <SessionEnd>
        {queue.length} {queue.length === 1 ? 'card' : 'cards'} reviewed. Nothing
        else is due — come back tomorrow.
        {failed > 0 ? (
          <>
            {' '}
            <span className="text-destructive">
              {failed} {failed === 1 ? 'rating' : 'ratings'} did not save.
            </span>
          </>
        ) : null}
      </SessionEnd>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="t-marker hover:text-foreground">
          ← Done for now
        </Link>
        {/* A countdown to a real ending, not a score. */}
        <span className="t-data">
          {queue.length - index} left
        </span>
      </div>

      <CardFace
        cardType={card.cardType}
        domain={{
          name: card.concept.domain.name,
          accent: asAccent(card.concept.domain.accent),
        }}
        front={card.front}
        back={card.back}
        revealed={revealed}
      />

      {revealed ? (
        <RatingButtons onRate={onRate} />
      ) : (
        <Button variant="outline" className="mt-auto h-11" onClick={() => setRevealed(true)}>
          Show answer
        </Button>
      )}
    </div>
  )
}
