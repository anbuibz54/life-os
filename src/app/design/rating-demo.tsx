'use client'

import { useState } from 'react'
import { RatingButtons, type Rating } from '@/components/design/rating-buttons'

/** Gallery-only wrapper so the rating control can be pressed and keyed. */
export function RatingDemo() {
  const [last, setLast] = useState<Rating | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <RatingButtons onRate={setLast} />
      <p className="t-data">
        {last ? `rated ${last} — keys 1–4 work too` : 'press a button, or keys 1–4'}
      </p>
    </div>
  )
}
