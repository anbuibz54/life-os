# Life OS — design system

Canonical. If code and this file disagree, one of them is a bug — say which.

**Using this for a new screen:** paste this whole file, then describe the screen
and what it is for. Everything needed to make decisions consistently is here;
nothing else should have to be explained twice. `/design` in development renders
every token and component described below.

---

## 1. What the product is

A personal knowledge platform. You capture notes across several domains, they
attach to concepts, concepts produce flashcards, and the cards come back on a
spaced-repetition schedule. One shared spine, many domain surfaces on top.

Two facts about the user shape every screen:

- **It is used for about two hours on a weekday evening, on a phone.** Dark is
  the primary context. Mobile is the primary width.
- **They are one person with many domains**, not many user types. There is one
  capture box, one review queue, one streak. Never a domain picker, never a
  per-domain queue — that is Anki decks, and it is the thing this product exists
  not to be.

The failure mode being designed against is the **link graveyard**: an app that
accumulates saved things nobody reads. Anything that rewards volume makes it
worse.

---

## 2. Principles that decide arguments

When two options both look fine, these break the tie.

**Serif is content, sans is machinery.** Note bodies and card faces are set in
the reading face. Labels, buttons, counters, timestamps, navigation are set in
the UI face. A card front is a sentence parsed under time pressure — it earns
reading type. Nothing else does.

**Colour means something or it is absent.** There is no brand accent. The single
filled control on a screen is ink, not a hue. Every colour in the system encodes
a fact: which domain, how much activity. Decoration is not a reason.

**Derive state, do not decorate it.** Unfiled is `concept_id IS NULL`. Unread is
a source with no notes. These are facts, not statuses, and they get no badge, no
tint, and no warning.

**The ending is the reward.** The review queue empties and you are done. Never
add "review more". An endless feed is the compulsion pattern the product
rejects, and reaching zero is its strongest retention mechanic.

**Habit, not compulsion.** No streak-loss panic, no points, no leaderboards, no
guilt copy. The streak counts the loop completing, never volume.

**Two-second capture.** Capture must never block on classification, so anything
that makes writing a note slower loses by default.

---

## 3. Colour

### Where it comes from

| Source | Where it appears | Encodes |
|---|---|---|
| **Domains** | A dot beside notes, concepts, cards | Which domain |
| **Streak grid** | Home | Loop completion per day |
| **User images** | Note bodies | Real content |

Six domain hues at equal lightness, so no domain shouts. Assigned on the
`domains` row (`accent`, 1–6) — adding a domain stays an INSERT, and renaming
one does not change its colour.

The streak ramp is one hue, three levels: nothing, half the loop, both halves.
Not linear, and not volume-sensitive — forty notes in a day is the same square
as one.

### Tuned per theme, never inverted

Dark values are lighter and less saturated than their light counterparts.
Saturated hues vibrate on a dark ground at low light, and low light is the
primary context.

### What never gets colour

| Thing | Rule | Why |
|---|---|---|
| Rating buttons | All four neutral. Never a red "Again", never a green "Easy" | A red button makes honesty feel like failure. People rate generously to avoid it, which corrupts the FSRS data the product runs on. **The most load-bearing colour rule in the system.** |
| Card types | All four identical | Colour-coding them cues recall from the screen instead of the content |
| Overdue counts | Plain text | A backlog that looks like an alarm is an app you stop opening |
| Unfiled notes | No dot, no tint | Unfiled is legitimate, not debt |
| Inbox | Count visible, tone flat | Deleting a link you stopped caring about is a correct outcome |
| Review screen | One domain dot, nothing else | Retrieval under pressure; everything else competes for that attention |

`--destructive` is for genuine data loss and form errors only.

### Tokens

Semantic names only — never a raw hue in a component.

`--background` `--foreground` `--card` `--popover` `--primary` `--secondary`
`--muted` `--muted-foreground` `--accent` `--border` `--input` `--ring`
`--destructive` · `--domain-1…6` · `--heat-0…4`

Neutrals carry a slight cool bias. `--radius` is `0.375rem` — rounded-everything
reads as unconsidered.

Dark applies from `prefers-color-scheme` **or** an explicit `.dark` class,
unless a `.light` ancestor overrides. Use semantic tokens and you will rarely
need the `dark:` variant.

---

## 4. Typography

| Role | Face | Used for |
|---|---|---|
| Content | Literata | Note bodies, card fronts and backs |
| UI | Geist | Labels, buttons, navigation, headings |
| Data | Geist Mono | Counters, timestamps, IDs — always tabular |

Literata is drawn for long-form screen reading, which is what this is.

### Semantic classes — use these, not utility stacks

| Class | What it is |
|---|---|
| `.t-title` | Screen title. Serif — the only serif in the chrome |
| `.t-card-front` | A situation. The largest content type |
| `.t-card-back` | A decision. Quieter, same face |
| `.t-note` | Note body. Markdown renders into this |
| `.t-ui` | Default UI text: rows, descriptions, links |
| `.t-section` | Section heading inside a screen |
| `.t-marker` | Uppercase marker: day dividers, card type, domain name |
| `.t-data` | Numbers and timestamps, tabular |

`.t-card-front` survives a scale change. `text-xl font-serif leading-snug` does
not, and drifts the moment someone types it from memory.

---

## 5. Layout

Mobile-first. `max-w-md` for product screens, `px-5`.

| Class | What it does |
|---|---|
| `.l-screen` | Screen width and horizontal padding |
| `.l-stack` | Vertical rhythm between blocks (`gap-5`) |
| `.l-field` | A label and its control (`gap-2`) |
| `.l-rows` | A list separated by rules, not gaps |

**Lists use rules, not cards.** These lists get long, and a dense list reads
faster than a stack of boxes.

### The review session

The whole due queue loads up front and advances locally. Review is repetitive by
design, and a round trip between every card turns a two-minute session into a
chore — a chore gets skipped tomorrow.

Ratings fire without being awaited and the next card appears immediately. The
write is not in doubt: it is the user's own card, in a small transaction. Making
someone watch a spinner to be told what they already know costs more than the
rare failure does, so failures surface quietly at the end instead of
interrupting the run.

Space and Enter both reveal; 1–4 rate. Neither key means anything else here.

The screen has no destinations in its shell. Leaving mid-session should be a
deliberate act, not a row you brush past on the way to the rating buttons.

**The ending is designed.** When the queue empties you are done, and there is no
control anywhere that asks for more cards. Reaching zero is the reward.

### Authoring differs from recall

`CardComposer` shows a different rule and different examples per card type.
`CardFace` renders all four types identically. That is not an inconsistency —
they are opposite problems.

While writing, the difference between a discriminator and a failure mode is
exactly what you need to see; it is the constraint that makes the card good. A
rule in a document nobody rereads does not stop a bad card being written, so it
has to be on screen at the moment of writing.

While reviewing, that same difference is something to lean on instead of
thinking, so it disappears. Anything that lets you recall from the shape of the
screen is training the wrong thing.

The definition-card rule is enforced in one place — `src/lib/cards.ts`, which
has no database or framework import — so the web form and the MCP tool cannot
drift on what ships. It is a hard rejection, not a warning: a warning people can
click past is the same as no rule.

### Filing, in one selection

The concept picker offers matching concepts *and* "Create … in ‹domain›" rows
for every domain, in the same list. Filing into a brand-new concept therefore
costs the same as filing into an existing one: type, arrow, Enter.

The rejected alternative — create a concept, find it again, then file into it —
turns a five-second decision into a chore, and filing is already the step people
skip. Everything the inbox is for depends on this staying cheap.

Create rows are suppressed when the typed name already exists. Two concepts
called "B-tree indexes" is the exact failure this surface prevents.

**Elevation is nearly flat.** Borders, not shadows. Shadow is reserved for
things that genuinely float — popovers, sheets.

### The shell grows

There is no persistent navigation. `AppShell` takes a `destinations` array; each
appears only once it is real. At zero notes it renders no navigation at all.

| State | On screen |
|---|---|
| S0 — zero notes | Capture box, counters. No navigation |
| S1 — notes, no concepts | Capture, note list |
| S2 — first concept | Cards unlock |
| S3 — first card | Review appears as a destination |
| S4 — full | Review, Inbox, Search |

Rejected: a tab bar that gains items. Tabs shift sideways and break muscle
memory, a one-item tab bar looks like a bug, and it shows the shape of an app
you do not have yet.

---

## 6. Motion

Motion confirms that something happened. It is never decorative.

- State changes: 150ms, ease-out.
- Enters: 200ms, ease-out.
- The one orchestrated moment is a note landing after capture. Nothing else
  needs choreography.
- `prefers-reduced-motion` is honoured globally in `globals.css`.

No parallax, no scroll-triggered reveals, no ambient animation.

---

## 7. Components

### From shadcn/ui (Radix), in `src/components/ui/`

`button` `input` `label` `textarea` `badge` `skeleton` `dialog` `command`
`sonner`

Owned here — edit them freely. Verified on Tailwind 4 and React 19.

### Product components, in `src/components/design/`

| Component | Rules |
|---|---|
| `DomainDot` / `DomainLabel` | The only place domain colour appears. Always carries the domain name as an accessible label — colour alone is never the signal |
| `StreakGrid` | Intensity is loop completion. Takes `{date, captured, reviewed}` and does the mapping itself, so the rule cannot be got wrong at a call site |
| `CardFace` | All four types identical. Reserves the answer's space before reveal, so buttons do not shift under a reaching thumb |
| `RatingButtons` | Four neutral buttons, keys 1–4. Ignores keystrokes in editable fields — cards are editable inline during review |
| `NoteRow` / `DayDivider` | Rules not gaps, body clamped to two lines, unfiled notes aligned with filed ones. A row carrying an `action` is never a link — a button inside an anchor swallows the tap |
| `ConceptPicker` | Creating a concept and choosing its domain is **one selection**. cmdk's filtering is off, because it would hide the create rows exactly when they matter |
| `CardComposer` | Type first, and that type's rule stays on screen while you write. Examples are placeholders, never prefilled values |
| `ReviewSession` | The queue loads once and advances locally — answering never waits on the network. Ratings fire without being awaited |
| `EmptyState` | A surface with nothing in it yet |
| `SessionEnd` | The queue is empty and you are done. Deliberately has no "review more" |
| `AppShell` / `Counters` | Navigation that grows; accumulation signals in tabular mono |

### Shell

`AppShell` wraps every signed-in screen. `Counters` shows the small accumulation
signals — visible from note one.

---

## 8. Voice

Write from the user's side of the screen.

- **Active, specific, no apologies.** "Capture", then "Captured".
- **Errors say what went wrong and what to do.** Never "Something went wrong".
- **No guilt.** Never "You haven't reviewed in 3 days". State facts, not
  judgements.
- **Never celebrate volume.** "41 notes" is a fact. "41 notes — amazing!" is a
  slot machine.
- **Deleting is fine.** No "Are you sure?", no "This cannot be undone" over a
  link someone stopped caring about.
- Sentence case everywhere except `.t-marker`.

---

## 9. Hard rules

Violating one of these is a bug, not a preference.

1. Rating buttons are never coloured.
2. No red badges, no notification dots, no "!" affordances.
3. Delete is one action with no confirmation dialog. **There is no
   destructive-action modal pattern in this product** — do not add one.
4. Never show a surface that is not real yet.
5. No per-domain queues, streaks, or mode pickers.
6. Never reward capture volume.
7. No infinite feeds. Every session has an ending.
8. Colour is never the only carrier of meaning — always a label or text too.
9. Capture never blocks on classification.
10. Images are never proxied through the API; presigned URLs only.

---

## 10. Not yet designed

Deliberately open — these need a real screen before they can be got right.

- **Swipe-to-delete** on inbox rows. Needs a real list and a real thumb.
- **Markdown rendering** inside `.t-note`, including image sizing.
- **Card editing inline during review** — the interaction that recovers the
  encoding work AI drafting removes.
- **Light theme review**, which has had less scrutiny than dark.
