import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { DomainDot, asAccent } from '@/components/design/domain-dot'
import { NoteRow } from '@/components/design/note-row'
import { EmptyState } from '@/components/design/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { searchNotes, type NoteWithConcept } from '@/server/notes/service'
import { listConcepts, type ConceptView } from '@/server/concepts/service'
import { timed } from '@/server/logger'

/**
 * Search — reading the corpus back.
 *
 * A plain GET form, no client state: a search is a URL, so it survives the back
 * button, can be bookmarked, and needs no JavaScript to work.
 *
 * Results are notes first, because a note is what someone remembers writing —
 * "I wrote something about idle connections" is the actual query. Concepts come
 * second and smaller: "that topic exists" is a different question from "show me
 * what I wrote", and mixing the two makes the useful answer harder to find.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const term = q?.trim() ?? ''
  const { user } = await requireUser()

  let results: { notes: NoteWithConcept[]; concepts: ConceptView[] } = {
    notes: [],
    concepts: [],
  }

  if (term.length > 0) {
    const [notes, concepts] = await timed('search.load', () =>
      Promise.all([
        searchNotes(db, user.id, term),
        listConcepts(db, user.id, { search: term, limit: 20 }),
      ]),
    )
    results = { notes, concepts }
  }

  const nothingFound =
    term.length > 0 && results.notes.length === 0 && results.concepts.length === 0

  return (
    <AppShell destinations={[{ href: '/concepts', label: 'All concepts' }, { href: '/', label: 'Capture' }]}>
      <header className="flex flex-col gap-2">
        <Link href="/" className="t-marker hover:text-foreground">
          ← Back
        </Link>
        <h1 className="t-title">Search</h1>
      </header>

      <form action="/search" method="get" className="flex items-end gap-2">
        <div className="l-field flex-1">
          <Label htmlFor="q">Words from the note, or a concept name</Label>
          <Input
            id="q"
            name="q"
            defaultValue={term}
            placeholder="idle connections"
            autoFocus
            maxLength={200}
          />
        </div>
        <Button type="submit">Find</Button>
      </form>

      {term.length === 0 ? (
        <p className="t-ui text-muted-foreground text-pretty">
          Matches the words in a note, and the name of the concept it is filed
          under — so a note that never uses the word is still found by its topic.
        </p>
      ) : nothingFound ? (
        <EmptyState title={`Nothing matches “${term}”.`}>
          That is a normal answer for a young corpus, not a failure. Search only
          covers what has been written down.
        </EmptyState>
      ) : (
        <>
          {results.concepts.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="t-section">
                Concepts <span className="t-data">{results.concepts.length}</span>
              </h2>
              <ul className="l-rows">
                {results.concepts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/concepts/${c.id}`}
                      className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0 hover:bg-accent focus-visible:bg-accent"
                    >
                      <DomainDot accent={asAccent(c.domain.accent)} name={c.domain.name} />
                      <span className="t-ui min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="t-data shrink-0">{c.noteCount} notes</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <h2 className="t-section">
              Notes <span className="t-data">{results.notes.length}</span>
            </h2>
            {results.notes.length === 0 ? (
              <p className="t-ui text-muted-foreground">
                No note body matches. The concepts above are where the topic lives.
              </p>
            ) : (
              <div className="l-rows -mt-2">
                {results.notes.map((n) => (
                  <NoteRow
                    key={n.id}
                    body={n.body}
                    createdAt={n.createdAt.toISOString().slice(0, 10)}
                    concept={n.concept ?? undefined}
                    href={n.concept ? `/concepts/${n.concept.id}#note-${n.id}` : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  )
}
