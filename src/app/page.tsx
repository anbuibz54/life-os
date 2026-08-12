import { AppShell, Counters } from '@/components/app-shell'
import { NotesSurface, type NoteView } from '@/components/capture/notes-surface'
import { requireUser } from '@/lib/auth/dal'
import { db } from '@/server/db'
import { countNotes, listNotes } from '@/server/notes/service'
import { recentActivity, streakFrom, todayInZone } from '@/server/activity/service'

/**
 * Home — the capture surface.
 *
 * Progressive unlock: at zero notes this is a capture box and three counters,
 * and nothing else. No navigation, because there is nowhere real to go yet.
 * Destinations appear as they become true — Review once a card exists, Inbox
 * once something needs filing.
 *
 * The counters are visible from note one. They are small accumulation signals,
 * not scores: plain text, no colour, never celebrated.
 */
export default async function Home() {
  const { user } = await requireUser()

  const [notes, noteCount, activity] = await Promise.all([
    listNotes(db, user.id, { limit: 50 }),
    countNotes(db, user.id),
    recentActivity(db, user.id),
  ])

  const streak = streakFrom(activity, todayInZone())

  const initialNotes: NoteView[] = notes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <AppShell
      // Settings is the one destination that is real from day one. Review and
      // Inbox join it when a card exists and when something needs filing.
      destinations={[{ href: '/settings', label: 'Account' }]}
    >
      <NotesSurface initialNotes={initialNotes} />

      <Counters
        items={[
          `${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`,
          '0 concepts',
          `streak ${streak}`,
        ]}
      />
    </AppShell>
  )
}
