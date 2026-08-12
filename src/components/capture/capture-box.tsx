'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * The capture box.
 *
 * Two-second capture is the requirement everything here serves:
 *
 *  - Enter submits. Shift+Enter makes a new line. A one-line thought is the
 *    dominant case by a wide margin, and making the fast path require a
 *    modifier taxes every capture to serve the rare multi-line one.
 *  - It never asks which concept. Filing happens later, from the inbox.
 *    A box that interrupts to ask "about what?" stops being used.
 *  - The field clears and refocuses immediately, so a second thought can
 *    follow the first without touching the mouse.
 *
 * Not autofocused. On a phone that would throw the keyboard up every time you
 * opened the app just to read what you wrote yesterday.
 */
export function CaptureBox({
  onCapture,
  pending,
}: {
  onCapture: (body: string) => void
  pending: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [empty, setEmpty] = useState(true)

  function submit() {
    const body = ref.current?.value.trim()
    if (!body) return

    onCapture(body)

    if (ref.current) {
      ref.current.value = ''
      ref.current.style.height = 'auto'
      ref.current.focus()
    }
    setEmpty(true)
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={ref}
        name="body"
        rows={2}
        placeholder="What did you learn?"
        aria-label="Capture a note"
        onInput={(e) => {
          const el = e.currentTarget
          setEmpty(!el.value.trim())
          // Grow with the content rather than scrolling inside two rows.
          el.style.height = 'auto'
          el.style.height = `${Math.min(el.scrollHeight, 320)}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        // Height is managed in `onInput` rather than with `field-sizing:
        // content`, which Safari and Firefox do not support yet. Setting both
        // would mean the textarea grew differently depending on the browser.
        className="t-note w-full resize-none border-b border-border bg-transparent pb-2 outline-none placeholder:text-muted-foreground focus:border-foreground"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="t-data" aria-hidden>
          {empty ? 'Enter to capture' : 'Enter to capture · Shift+Enter for a new line'}
        </span>
        <Button type="submit" size="sm" disabled={empty || pending}>
          {pending ? 'Saving…' : 'Capture'}
        </Button>
      </div>
    </form>
  )
}
