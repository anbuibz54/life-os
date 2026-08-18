import { AppShell, Counters, type Destination } from '@/components/app-shell'
import { NotesSurface, type NoteView } from '@/components/capture/notes-surface'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { countNotes, listNotes } from '@/server/notes/service'
import { countConcepts, listConcepts } from '@/server/concepts/service'
import { listDomains } from '@/server/domains/service'
import { recentActivity, streakFrom, todayInZone } from '@/server/activity/service'
import { countCards } from '@/server/cards/service'
import { countDue } from '@/server/review/service'

/**
 * Home — the capture surface.
 *
 * Progressive unlock: at zero notes this is a capture box and three counters.
 * Concepts appears as a destination the moment the first one exists; Review
 * and Inbox join it when a card exists and when something needs filing.
 *
 * The counters are visible from note one. They are small accumulation signals,
 * not scores: plain text, no colour, never celebrated.
 */
export default async function Home() {
  const { user } = await requireUser()

  const [notes, noteCount, conceptCount, cardCount, dueCount, concepts, domains, activity] =
    await Promise.all([
      listNotes(db, user.id, { limit: 50 }),
      countNotes(db, user.id),
      countConcepts(db, user.id),
      countCards(db, user.id),
      countDue(db, user.id),
      // The picker filters client-side, so it needs the whole set. At the point
      // this stops being reasonable, filing has bigger problems than latency.
      listConcepts(db, user.id, { limit: 200 }),
      listDomains(db),
      recentActivity(db, user.id),
    ])

  const streak = streakFrom(activity, todayInZone())

  const initialNotes: NoteView[] = notes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    concept: n.concept,
  }))

  const destinations: Destination[] = []
  // Review unlocks at the first card and then stays. When nothing is due it
  // shows no number and the screen behind it is the "done" state — which is
  // the reward, not an empty tab.
  if (cardCount > 0) {
    destinations.push({
      href: '/review',
      label: 'Review',
      count: dueCount > 0 ? dueCount : undefined,
    })
  }
  if (conceptCount > 0) {
    destinations.push({ href: '/concepts', label: 'Concepts', count: conceptCount })
  }
  destinations.push({ href: '/settings', label: 'Account' })

  return (
    <AppShell destinations={destinations}>
      <NotesSurface
        initialNotes={initialNotes}
        concepts={concepts.map((c) => ({
          id: c.id,
          name: c.name,
          domain: { name: c.domain.name, accent: c.domain.accent },
          noteCount: c.noteCount,
        }))}
        domains={domains.map((d) => ({ id: d.id, name: d.name, accent: d.accent }))}
      />

      <Counters
        items={[
          `${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`,
          `${conceptCount} ${conceptCount === 1 ? 'concept' : 'concepts'}`,
          `streak ${streak}`,
        ]}
      />
    </AppShell>
  )
}
