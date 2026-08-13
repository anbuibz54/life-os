import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { DomainDot, asAccent } from '@/components/design/domain-dot'
import { EmptyState } from '@/components/design/states'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { listConcepts } from '@/server/concepts/service'

/**
 * Concepts — the stable nodes.
 *
 * Grouped by domain, because seeing "four things under Databases, one under
 * Typography" is the cross-domain picture the product exists to give you. One
 * flat alphabetical list would hide it.
 *
 * Note counts are shown plainly. A concept with one note is not failing at
 * anything, so nothing here is tinted or flagged.
 */
export default async function ConceptsPage() {
  const { user } = await requireUser()
  const concepts = await listConcepts(db, user.id, { limit: 200 })

  const byDomain = new Map<string, typeof concepts>()
  for (const c of concepts) {
    const existing = byDomain.get(c.domain.name)
    if (existing) existing.push(c)
    else byDomain.set(c.domain.name, [c])
  }

  const groups = [...byDomain.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <AppShell destinations={[{ href: '/', label: 'Capture' }]}>
      <header className="flex flex-col gap-2">
        <Link href="/" className="t-marker hover:text-foreground">
          ← Back
        </Link>
        <h1 className="t-title">Concepts</h1>
      </header>

      {concepts.length === 0 ? (
        <EmptyState title="No concepts yet.">
          File a note from the capture screen and the concept you file it under
          shows up here.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([domainName, items]) => (
            <section key={domainName} className="flex flex-col">
              <div className="flex items-center gap-2 pb-1">
                <DomainDot accent={asAccent(items[0].domain.accent)} name={domainName} />
                <span className="t-marker">{domainName}</span>
              </div>

              <div className="l-rows">
                {items.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-baseline justify-between gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <span className="t-ui min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="t-data shrink-0">
                      {c.noteCount} {c.noteCount === 1 ? 'note' : 'notes'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  )
}
