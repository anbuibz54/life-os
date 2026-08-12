import Link from 'next/link'

/**
 * The shell, approach 1 — "no chrome, grows in".
 *
 * There is no persistent navigation. Destinations are full-width rows pinned
 * to the bottom, and each one appears only once it is real: Review the day a
 * card exists, Inbox the day something needs filing. At zero notes this
 * renders nothing but the content, which is the point — day one should feel
 * like a finished small product, not a stripped-down big one.
 *
 * Counts are shown plainly and never turn red. A backlog that looks like an
 * alarm is an app you stop opening.
 */

export type Destination = {
  href: string
  label: string
  /** Omitted when there is nothing to count. Zero is not worth rendering. */
  count?: number
}

export function AppShell({
  children,
  destinations = [],
}: {
  children: React.ReactNode
  destinations?: Destination[]
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-5 px-5 pt-8 pb-6">{children}</main>

      {destinations.length > 0 ? (
        <nav className="flex flex-col border-t border-border">
          {destinations.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="flex items-center justify-between px-5 py-3.5 text-sm not-last:border-b not-last:border-border hover:bg-accent"
            >
              <span>{d.label}</span>
              {typeof d.count === 'number' ? (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {d.count}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

/**
 * The small accumulation signals, visible from note one. Mono and tabular so
 * the digits do not jitter as they change.
 */
export function Counters({ items }: { items: string[] }) {
  return (
    <p className="mt-auto border-t border-border pt-4 font-mono text-xs tabular-nums text-muted-foreground">
      {items.join(' · ')}
    </p>
  )
}
