import { cn } from '@/lib/utils'

/**
 * The one place domain colour appears.
 *
 * Six hues, assigned on the `domains` row, so adding a domain stays an insert.
 * A dot rather than a fill or a bar: it reads at a glance in a list without
 * tinting the surface behind the text, which would hurt reading.
 *
 * Never use this to signal state — colour here means "which domain", nothing
 * else. Overdue, failing, and unread are all communicated without colour.
 */

export type DomainAccent = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Narrows a smallint from the database to a palette slot.
 *
 * Postgres will happily hold a 7 that the palette has no colour for. Wrapping
 * rather than throwing: a domain rendering in the wrong colour is a much
 * smaller problem than a screen that will not render at all.
 */
export function asAccent(value: number): DomainAccent {
  const slot = ((Math.trunc(value) - 1) % 6 + 6) % 6 + 1
  return slot as DomainAccent
}

const ACCENT: Record<DomainAccent, string> = {
  1: 'bg-domain-1',
  2: 'bg-domain-2',
  3: 'bg-domain-3',
  4: 'bg-domain-4',
  5: 'bg-domain-5',
  6: 'bg-domain-6',
}

export function DomainDot({
  accent,
  name,
  className,
}: {
  accent: DomainAccent
  /** Domain name. Used as the accessible label — colour alone is never the signal. */
  name: string
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn('size-2 shrink-0 rounded-full', ACCENT[accent], className)}
    />
  )
}

/** Dot plus name, for headers and filters where the label is spelled out. */
export function DomainLabel({ accent, name }: { accent: DomainAccent; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', ACCENT[accent])} />
      <span className="t-marker">{name}</span>
    </span>
  )
}
