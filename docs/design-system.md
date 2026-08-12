# Design system

Companion to `CLAUDE.md`. That file says what the product does; this says what
it looks like and why. Read before adding a screen.

Direction chosen: **quiet middle** — serif for the thinking, sans for the
machinery. Navigation: **no chrome, grows in**.

---

## The two rules everything else follows

**1. Serif is for content, sans is for controls.**
Note bodies and card faces are set in Literata. Labels, buttons, counters,
timestamps and navigation are set in Geist. A card front is a sentence you have
to parse under time pressure, not a UI label — it earns reading type. Nothing
else does.

**2. Colour is carried by meaning, never by chrome.**
There is no brand accent. The single filled button on a screen is ink, not a
colour. Every hue in the system means something, which is what stops the palette
needing to be justified and maintained forever.

---

## Where colour comes from

Three sources, in order of how much of the screen they occupy:

**Domains.** Six hues, one per domain, assigned on the `domains` row — so adding
"Visual design" is still an insert, not a code change. They appear as a dot
beside notes, concepts, and cards. Equal lightness across the set so no domain
shouts.

This is the thesis made visible: one queue where you can see you are learning
across systems design and visual design at once. The spec forbids per-domain
*structure* — separate queues, mode pickers, per-domain streaks. It does not
forbid a domain having an identity inside the unified surface. Keep that
distinction; it is the difference between the product and Anki decks.

**The streak grid.** One hue, five steps (`--heat-0` … `--heat-4`). Measures the
loop completing, never capture volume.

**The user's own images.** Notes render markdown images. Much of what a designer
learns is screenshots and before/after pairs, so real content brings real colour.
Frame images generously rather than competing with them.

### Tuned per theme, not inverted

Dark values are lighter and less saturated than their light counterparts.
Saturated hues on a dark ground vibrate at low light, and low light is the
primary context — two hours on a weekday evening, phone in hand.

---

## What stays uncoloured, deliberately

| Surface | Rule | Why |
|---|---|---|
| Card types | All four render identically | Colour-coding them trains recall from the colour instead of the content |
| Rating buttons | Neutral, never red | A red "Again" makes honesty feel like failure, and people rate generously to avoid it — which corrupts FSRS, which is the product |
| Overdue counts | Plain text, never red | A backlog that looks like an alarm is an app you stop opening |
| Inbox | Count visible, tone flat | Deleting a link you stopped caring about is a correct outcome, not a failure |
| Review screen | One domain dot, nothing else | You are retrieving under pressure; everything else competes for the attention retrieval needs |

`--destructive` exists for genuine data loss and form errors only.

---

## The shell grows

There is no persistent navigation. `AppShell` takes a `destinations` array, and
each destination is a full-width row pinned to the bottom that appears only once
it is real: Review the day a card exists, Inbox the day something needs filing.
At zero notes it renders nothing but content.

| State | On screen |
|---|---|
| S0 — zero notes | Capture box, counters. No navigation. |
| S1 — notes, no concepts | Capture, note list. |
| S2 — first concept | Cards unlock. |
| S3 — first card | Review appears as a destination. |
| S4 — full | Review, Inbox, Search. |

Rejected: a tab bar that gains items. Tabs shift sideways as they appear, which
breaks muscle memory, and a one-item tab bar looks like a bug. More importantly
it shows the shape of an app you do not have yet — the exact thing
`DECISIONS.md` warns against under "empty state".

The cost, accepted: four shells to design instead of one. Worth it, because the
first week is the week people quit.

---

## Tokens

All in `src/app/globals.css`. Semantic names only — never reach for a raw hue in
a component.

- **Neutrals** carry a slight cool bias rather than being pure grey. Chosen, not
  inherited.
- **`--radius`** is `0.375rem`. Rounded-everything reads as unconsidered.
- **Dark mode** applies from `prefers-color-scheme` *or* an explicit `.dark`
  class, unless a `.light` ancestor overrides. Most components should use the
  semantic tokens and never need the `dark:` variant at all.

### Typefaces

| Role | Face | Used for |
|---|---|---|
| Content | Literata | Note bodies, card fronts and backs |
| UI | Geist | Labels, buttons, navigation, headings |
| Data | Geist Mono | Counters, timestamps, IDs — always `tabular-nums` |

Literata is drawn for long-form reading on screen, which is what this is.

---

## Components

shadcn/ui on Radix primitives, copied into `src/components/ui/` and owned here.
Verified working on Tailwind 4 and React 19.

The genuinely hard components in this app are not in any library: the searchable
concept picker, swipe-to-delete on the inbox, and the review rating control with
keyboard support. Radix supplies the focus management and combobox behaviour
underneath; the rest is ours.

Delete is one swipe with no confirmation, so **there is no destructive-action
modal pattern** — do not add one.
