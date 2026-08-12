'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { captureNote } from '@/app/_actions/notes'
import { CaptureBox } from './capture-box'
import { DayDivider, NoteRow } from '@/components/design/note-row'
import { FormError } from '@/app/(auth)/_components/form-error'

export type NoteView = {
  id: string
  body: string
  /** ISO string — Dates do not survive the server/client boundary intact. */
  createdAt: string
}

/**
 * Capture box plus the notes it produces.
 *
 * These live in one client component so a captured note can appear instantly
 * rather than after a round trip. Two-second capture is a promise about how it
 * *feels*, and waiting for the server to answer before showing your own words
 * breaks it even when the request is fast.
 */
export function NotesSurface({ initialNotes }: { initialNotes: NoteView[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [notes, addOptimistic] = useOptimistic(
    initialNotes,
    (state: NoteView[], body: string) => [
      { id: `pending-${state.length}`, body, createdAt: new Date().toISOString() },
      ...state,
    ],
  )

  function onCapture(body: string) {
    setError(null)
    startTransition(async () => {
      addOptimistic(body)
      // The browser's own date, so the streak rolls over at the user's
      // midnight rather than UTC's. `en-CA` formats as YYYY-MM-DD.
      const localDate = new Date().toLocaleDateString('en-CA')
      const result = await captureNote({ body, localDate })
      if (result.error) setError(result.error)
    })
  }

  const groups = groupByDay(notes)

  return (
    <>
      <CaptureBox onCapture={onCapture} pending={pending} />
      <FormError>{error}</FormError>

      {groups.length > 0 ? (
        <div className="l-rows">
          {groups.map(([label, items]) => (
            <section key={label} className="l-rows">
              <DayDivider label={label} />
              {items.map((note) => (
                <NoteRow key={note.id} body={note.body} createdAt={timeOf(note.createdAt)} />
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </>
  )
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Groups by the viewer's local day, not the server's. */
function groupByDay(notes: NoteView[]): [string, NoteView[]][] {
  const today = new Date().toLocaleDateString('en-CA')
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA')
  })()

  const buckets = new Map<string, NoteView[]>()

  for (const note of notes) {
    const key = new Date(note.createdAt).toLocaleDateString('en-CA')
    const existing = buckets.get(key)
    if (existing) existing.push(note)
    else buckets.set(key, [note])
  }

  return [...buckets.entries()].map(([key, items]) => {
    if (key === today) return ['Today', items]
    if (key === yesterday) return ['Yesterday', items]
    return [
      new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
      items,
    ]
  })
}
