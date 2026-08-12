import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CardFace } from '@/components/design/card-face'
import { DomainDot, DomainLabel, type DomainAccent } from '@/components/design/domain-dot'
import { DayDivider, NoteRow } from '@/components/design/note-row'
import { EmptyState, SessionEnd } from '@/components/design/states'
import { StreakGrid, type ActivityDay } from '@/components/design/streak-grid'
import { RatingDemo } from './rating-demo'

/**
 * Living reference for the design system.
 *
 * Development only — this is a mirror, not a product surface, and shipping it
 * would put an unfinished-looking page one URL guess away from a real user.
 *
 * Its job is to make drift visible. A design system that only exists in a
 * markdown file stops being true within a month; one you can look at does not.
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const domains = [
    { name: 'Systems design', accent: 1 as DomainAccent },
    { name: 'Databases', accent: 2 as DomainAccent },
    { name: 'Visual design', accent: 3 as DomainAccent },
    { name: 'Typography', accent: 4 as DomainAccent },
    { name: 'Algorithms', accent: 5 as DomainAccent },
    { name: 'Workouts', accent: 6 as DomainAccent },
  ]

  const days: ActivityDay[] = Array.from({ length: 28 }, (_, i) => {
    const date = `2026-07-${String(i + 1).padStart(2, '0')}`
    return { date, captured: i % 3 !== 0, reviewed: i % 4 !== 0 }
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-12">
      <header className="flex flex-col gap-2">
        <span className="t-marker">Development only</span>
        <h1 className="t-title">Design system</h1>
        <p className="t-ui text-muted-foreground text-pretty">
          Every token and component in one place. Rules and rationale live in
          docs/design/SYSTEM.md — this is what they look like.
        </p>
      </header>

      <Section title="Neutrals" note="Slightly cool-biased rather than pure grey.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Swatch className="bg-background" label="background" bordered />
          <Swatch className="bg-card" label="card" bordered />
          <Swatch className="bg-muted" label="muted" />
          <Swatch className="bg-primary" label="primary" />
        </div>
      </Section>

      <Section
        title="Domains"
        note="Six hues, equal lightness. Assigned on the domains row — never derived from a hash, so renaming a domain does not change its colour."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {domains.map((d) => (
            <DomainLabel key={d.accent} accent={d.accent} name={d.name} />
          ))}
        </div>
      </Section>

      <Section
        title="Streak"
        note="One hue, three levels. Intensity is loop completion, never volume — forty notes in a day is the same square as one."
      >
        <StreakGrid days={days} />
      </Section>

      <Section title="Type roles" note="Described by what a thing is, not by a stack of utilities.">
        <div className="flex flex-col gap-4 border-l border-border pl-4">
          <Role name=".t-title">
            <p className="t-title">Nothing captured yet.</p>
          </Role>
          <Role name=".t-card-front">
            <p className="t-card-front">B-tree or hash index?</p>
          </Role>
          <Role name=".t-card-back">
            <p className="t-card-back">
              Range queries and ordered scans: B-tree. Equality only: hash.
            </p>
          </Role>
          <Role name=".t-note">
            <p className="t-note">
              Cache-aside looks fine until the cache goes down, and then every read
              hits the database at once.
            </p>
          </Role>
          <Role name=".t-ui">
            <p className="t-ui">Attach this note to a concept</p>
          </Role>
          <Role name=".t-marker">
            <p className="t-marker">Discriminator · Databases</p>
          </Role>
          <Role name=".t-data">
            <p className="t-data">14:02 · 41 notes · 12 concepts</p>
          </Role>
        </div>
      </Section>

      <Section title="Controls" note="One filled control per screen. Everything else is outline or text.">
        <div className="flex flex-wrap gap-2">
          <Button>Capture</Button>
          <Button variant="outline">Continue with Google</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="outline" disabled>
            Working…
          </Button>
        </div>
        <div className="l-field max-w-sm">
          <Label htmlFor="d-email">Email</Label>
          <Input id="d-email" placeholder="you@example.com" />
        </div>
        <div className="l-field max-w-sm">
          <Label htmlFor="d-note">Note</Label>
          <Textarea id="d-note" placeholder="What did you learn?" rows={3} />
        </div>
      </Section>

      <Section
        title="Note rows"
        note="Rules, not gaps — this list gets long. An unfiled note has no dot and no warning; unfiled is legitimate, not debt."
      >
        <div className="l-rows">
          <DayDivider label="Today" />
          <NoteRow
            href="#"
            body="B-tree beats hash for range scans because the leaves are ordered."
            createdAt="14:02"
            domain={domains[1]}
          />
          <NoteRow
            href="#"
            body="Spacing scale felt wrong at 40 characters — the 8px step is too coarse for captions."
            createdAt="11:20"
            domain={domains[2]}
            hasImage
          />
          <NoteRow
            href="#"
            body="Not sure where this goes yet. Something about idempotency keys and retries."
            createdAt="09:41"
          />
        </div>
      </Section>

      <Section
        title="Review"
        note="One domain dot is the whole colour budget. All four card types render identically."
      >
        <div className="flex flex-col gap-6 rounded-md border border-border p-4">
          <CardFace
            cardType="discriminator"
            domain={domains[1]}
            front="B-tree or hash index?"
            back="Range queries and ordered scans: B-tree. Equality only: hash."
            revealed
          />
          <RatingDemo />
        </div>
        <p className="t-ui text-muted-foreground text-pretty">
          All four ratings are neutral, deliberately. A red “Again” makes honesty
          feel like failure, and people rate generously to avoid it — which
          corrupts the scheduling data the product runs on.
        </p>
      </Section>

      <Section title="States" note="An empty surface and a finished session are different things.">
        <div className="rounded-md border border-border px-4">
          <EmptyState title="No sources yet." action={<Button variant="outline">Add a link</Button>}>
            Paste a URL and it becomes a source. Write one sentence about it and it
            becomes a note.
          </EmptyState>
        </div>
        <div className="rounded-md border border-border px-4">
          <SessionEnd>
            Eight cards reviewed. Nothing else is due — come back tomorrow.
          </SessionEnd>
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-border pb-2">
        <h2 className="t-section">{title}</h2>
        {note ? <p className="t-ui text-muted-foreground text-pretty">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Role({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-data">{name}</span>
      {children}
    </div>
  )
}

function Swatch({
  className,
  label,
  bordered,
}: {
  className: string
  label: string
  bordered?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`h-12 rounded-md ${className} ${bordered ? 'border border-border' : ''}`}
      />
      <span className="t-data">{label}</span>
    </div>
  )
}
