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
 * Notes first, cards second — the notes are the thinking and the cards are what
 * survived it. This is the screen the corpus is read on, so the notes read like
 * a page rather than a log: oldest first, dates on the left of each entry,
 * blank lines and line breaks preserved, and an outline at the top once there
 * are enough notes to lose your place in.
 *
 * Cards are collapsed. They are what you will be asked, not what you came here
 * to read, and a screen that opens on its own answers gives away the retrieval
 * practice the cards exist to create. Writing a card while the notes are on
 * screen is still the way to avoid drafting one that repeats what is there.
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
          Notes <span className="t-data">{notes.length}</span>
        </h2>

        {notes.length === 0 ? (
          <p className="t-ui text-muted-foreground">Nothing filed here yet.</p>
        ) : (
          <>
            {/* An outline only once the list is long enough to need one. Below
                that it is a table of contents for three paragraphs. */}
            {notes.length >= 3 ? (
              <ol className="flex flex-col gap-1.5 border-b border-border pb-3">
                {notes.map((note, i) => (
                  <li key={note.id} className="flex gap-2">
                    <span className="t-data shrink-0 tabular-nums">{i + 1}</span>
                    <a
                      href={`#note-${note.id}`}
                      className="t-ui min-w-0 flex-1 truncate hover:text-foreground focus-visible:text-foreground"
                    >
                      {outlineLabel(note.body)}
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}

            <ul className="l-rows">
              {notes.map((note) => (
                <li
                  key={note.id}
                  id={`note-${note.id}`}
                  // Clears the top of the viewport when an outline link jumps
                  // here, so the note's date is not hidden under the edge.
                  className="scroll-mt-4 border-b border-border py-4 last:border-b-0"
                >
                  <time className="t-data block">{note.createdAt.toISOString().slice(0, 10)}</time>
                  {/* Markdown is stored, not rendered — there is no markdown
                      dependency in this app, and note bodies are the user's own
                      text. `pre-wrap` keeps the line breaks and lists they
                      wrote, which is most of what makes a note readable. */}
                  <p className="t-note mt-1.5 text-base whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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
          <details className="border-b border-border pb-3">
            <summary className="t-marker cursor-pointer hover:text-foreground">
              Show {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </summary>
            <ul className="l-rows mt-2">
              {cards.map((card) => (
                <li key={card.id} className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
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
          </details>
        )}

        <CardComposer conceptId={concept.id} />
      </section>
    </AppShell>
  )
}

/**
 * One line of a note, for the outline.
 *
 * The first non-blank line, with a leading markdown heading marker stripped —
 * a note that starts with "## Cache invalidation" should read as "Cache
 * invalidation" in a list of contents, not as syntax.
 */
function outlineLabel(body: string): string {
  const line = body.split('\n').find((l) => l.trim().length > 0) ?? ''
  const plain = line.replace(/^#+\s*/, '').replace(/^[-*]\s+/, '').trim()
  return plain.length > 80 ? `${plain.slice(0, 79)}…` : plain || '(empty note)'
}
