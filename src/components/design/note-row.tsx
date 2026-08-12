import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DomainDot, type DomainAccent } from './domain-dot'

/**
 * One note in a list.
 *
 * Rows are separated by rules, not gaps — a dense list reads faster than a
 * stack of cards, and this list gets long. Body text is clamped to two lines;
 * the full note lives on its own screen.
 *
 * An unfiled note (no concept yet) is shown plainly, with no warning colour
 * and no badge. Unfiled is a legitimate state, not debt — capture must never
 * block on classification, so the result of that cannot look like a mistake.
 *
 * `href` is optional. Until a note detail screen exists, a row that looks
 * clickable and goes nowhere is worse than a row that does not invite the tap.
 */

export type NoteRowProps = {
  body: string
  createdAt: string
  href?: string
  domain?: { name: string; accent: DomainAccent }
  /** True when the note has an image in its body. */
  hasImage?: boolean
}

export function NoteRow({ href, body, createdAt, domain, hasImage }: NoteRowProps) {
  const content = (
    <>
      {domain ? (
        <DomainDot accent={domain.accent} name={domain.name} className="mt-1.5" />
      ) : (
        // Keeps unfiled notes aligned with filed ones. No dot, no placeholder
        // colour, no implication that something is missing.
        <span aria-hidden className="mt-1.5 size-2 shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        <span className="t-ui line-clamp-2 block">{body}</span>
        {hasImage ? <span className="t-marker mt-1 block">Image</span> : null}
      </span>

      <time className="t-data mt-0.5 shrink-0">{createdAt}</time>
    </>
  )

  const shared = 'flex items-start gap-3 py-3 not-last:border-b not-last:border-border'

  if (!href) {
    return <div className={shared}>{content}</div>
  }

  return (
    <Link
      href={href}
      className={cn(shared, 'hover:bg-accent focus-visible:bg-accent')}
    >
      {content}
    </Link>
  )
}

/** Day separator inside a note list. */
export function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <span className="t-marker">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}
