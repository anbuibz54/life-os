import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { CardComposer } from '@/components/cards/card-composer'
import { DomainDot, asAccent } from '@/components/design/domain-dot'
import { Button } from '@/components/ui/button'
import { CARD_TYPE_LABEL } from '@/lib/cards'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { getConceptView } from '@/server/concepts/service'
import { listCardsForConcept } from '@/server/cards/service'
import { listNotesForConcept } from '@/server/notes/service'
import { removeCardForm } from '@/app/_actions/cards'

/**
 * One concept: what you have written about it, and what you will be asked.
 *
 * Notes first, cards second, in reading order — the notes are the thinking and
 * the cards are what survived it. Writing a card while the notes are on screen
 * is also the only way to avoid drafting one that repeats what is already
 * there.
 */
export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user } = await requireUser()

  const concept = await getConceptView(db, user.id, id)
  // Covers both "does not exist" and "is not yours" — a foreign id must not be
  // distinguishable from a missing one.
  if (!concept) notFound()

  const [cards, notes] = await Promise.all([
    listCardsForConcept(db, user.id, concept.id),
    listNotesForConcept(db, user.id, concept.id),
  ])

  return (
    <AppShell destinations={[{ href: '/concepts', label: 'All concepts' }, { href: '/', label: 'Capture' }]}>
      <header className="flex flex-col gap-2">
        <Link href="/concepts" className="t-marker hover:text-foreground">
          ← Concepts
        </Link>
        <div className="flex items-center gap-2">
          <DomainDot accent={asAccent(concept.domain.accent)} name={concept.domain.name} />
          <span className="t-marker">{concept.domain.name}</span>
        </div>
        <h1 className="t-title">{concept.name}</h1>
        {concept.summary ? (
          <p className="t-note text-muted-foreground">{concept.summary}</p>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="t-section">
          Cards{' '}
          <span className="t-data">
            {cards.length === 0 ? 'none yet' : cards.length}
          </span>
        </h2>

        {cards.length === 0 ? (
          <p className="t-ui text-muted-foreground text-pretty">
            Not every concept should produce cards. If the honest answer is “it
            depends”, this is note-ready, not card-ready — forcing a card here
            teaches false confidence.
          </p>
        ) : (
          <ul className="l-rows">
            {cards.map((card) => (
              <li key={card.id} className="flex flex-col gap-1 border-b border-border py-3">
                <span className="t-marker">{CARD_TYPE_LABEL[card.cardType]}</span>
                <p className="t-card-front text-base">{card.front}</p>
                <p className="t-card-back text-sm">{card.back}</p>
                <form action={removeCardForm.bind(null, card.id, concept.id)} className="mt-1">
                  {/* No confirmation. There is no destructive-action modal in
                      this product — deleting a card you got wrong is correct. */}
                  <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <CardComposer conceptId={concept.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="t-section">
          Notes <span className="t-data">{notes.length}</span>
        </h2>

        {notes.length === 0 ? (
          <p className="t-ui text-muted-foreground">Nothing filed here yet.</p>
        ) : (
          <ul className="l-rows">
            {notes.map((note) => (
              <li key={note.id} className="border-b border-border py-3 last:border-b-0">
                <p className="t-note text-base">{note.body}</p>
                <time className="t-data mt-1 block">
                  {note.createdAt.toISOString().slice(0, 10)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}
