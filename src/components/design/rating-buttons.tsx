'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * The four FSRS ratings.
 *
 * ALL FOUR ARE NEUTRAL. Never colour "Again" red, and never make "Easy" green.
 * A red button makes honesty feel like failure, so people start rating
 * themselves generously to avoid pressing it — which corrupts the scheduling
 * data the entire product runs on. This is the single most load-bearing colour
 * decision in the system.
 *
 * Keys 1–4 mirror the buttons left to right. Reviewing is repetitive by
 * design, and a keyboard path is what keeps a session from feeling like work.
 */

export const RATINGS = [
  { value: 1, label: 'Again', key: '1' },
  { value: 2, label: 'Hard', key: '2' },
  { value: 3, label: 'Good', key: '3' },
  { value: 4, label: 'Easy', key: '4' },
] as const

export type Rating = (typeof RATINGS)[number]['value']

export function RatingButtons({
  onRate,
  disabled = false,
}: {
  onRate: (rating: Rating) => void
  disabled?: boolean
}) {
  useEffect(() => {
    if (disabled) return

    function onKey(event: KeyboardEvent) {
      // Don't hijack digits typed into an editable field — cards are editable
      // inline during review.
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const match = RATINGS.find((r) => r.key === event.key)
      if (!match) return

      event.preventDefault()
      onRate(match.value)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRate, disabled])

  return (
    <div className="mt-auto grid grid-cols-4 gap-2">
      {RATINGS.map((r) => (
        <Button
          key={r.value}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onRate(r.value)}
          className="h-11 flex-col gap-0.5"
        >
          <span className="text-sm">{r.label}</span>
          <span className="font-mono text-[0.625rem] text-muted-foreground">{r.key}</span>
        </Button>
      ))}
    </div>
  )
}
