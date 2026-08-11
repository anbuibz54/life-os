# Decision log

Companion to `CLAUDE.md`. That file says *what*; this one says *why*, and what
was rejected. Read this before reopening a settled question.

---

## Product shape

### One platform, not many mini apps
**Considered**: build several small standalone apps, merge into a super app later.
**Rejected because**: that recreates the exact problem the platform exists to
solve. Hevy, MyFitnessPal, and Paprika each work fine — they fail because they
don't share context. Building five silos and merging later means five schemas,
five auth models, five deploys, and a merge that never happens on ~2h/evening.
**Chosen**: one spine (single database, auth, AI context) with small
independently-usable surfaces on top. Ship surfaces fast; the super app is what
emerges, not something assembled later.

### Why not just use Obsidian
Obsidian + an MCP server + the FSRS plugin would deliver ~80% of this in a
weekend. Genuinely considered and rejected — but for non-product reasons, which
is fine and worth being explicit about: the goal includes learning to build a
real client/server SaaS, owning the thing, and sharing it. That is a legitimate
driver. It just means the bar is "does it work and get used", not "is it
technically necessary".

### Positioning
**Not** "developers who use AI" (too narrow, and MCP-only capture excludes
non-devs). **Not** "everyone" (loses the differentiator entirely).
**Chosen**: people who learn across several domains and want one place for it.
The dev friend and the designer friend are not two personas — they're the same
person with different starting content. A dev wants to learn UI; a designer wants
to learn enough SQL to stop guessing. Domains are not user types.

### Known risk, accepted
MCP is a developer-shaped surface. Non-technical users won't configure a server.
The first two users both do, so this is fine for now — but adoption among
strangers should not be predicted from that sample. If the audience broadens, the
capture story needs another channel (share sheet, browser extension, bot), and
MCP becomes one channel among several rather than the core idea.

---

## The graph

### Two graphs, not one
The word "knowledge graph" hides two structures with completely different costs:

- **Association graph** ("this relates to that") — dense. Never hand-maintain
  it. Derive from embeddings: every note gets a vector, similarity gives weighted
  edges free, forever, at zero write-time cost. Answers *"what do I already know
  that touches this problem?"*
- **Prerequisite DAG** ("you need X before Y") — sparse, curated, and the only
  thing that can answer *"what should I learn next to solve this?"* Similarity
  search cannot answer that; order is the entire point.

**Consequence**: `related_to` as a hand-authored edge is pure cost and was cut.
Essentially one authored edge type is needed (`requires`), possibly a second
(`part_of`) for grouping.

This also dissolves the "defining edges on every new note is too complex"
problem — a new note usually attaches to zero or one prerequisite, and
prerequisite structure is stable per domain once built.

### Edges point at concepts, not notes
Otherwise the DAG churns every time a second note is written about the same
topic. Notes are journal entries; concepts are the stable nodes.

### Both deferred out of v0.1
Deliberate. Both need a real corpus to be worth anything — build against 100 real
concepts in week six, not zero concepts in week one.

---

## Notes vs concepts

**Decision**: two tables. A note is what was written (timestamped, journal-like).
A concept is stable ("B-tree indexes"). Many notes → one concept.

**Why it matters**: cards attached to notes produce five overlapping cards about
B-trees. Cards attached to concepts produce one card that improves as you learn
more. Prerequisite edges also stop churning.

**Cost accepted**: one confirmation step at capture (AI proposes concept, user
confirms or overrides). Same interaction as domain assignment, so not extra
friction. Stress-tested and accepted.

---

## Cards

### Why not AI-generated cards by default
Anki works partly *because* writing the card is the encoding work. Free-form AI
generation drifts toward definition cards — trivia that builds recognition, not
the retrieval speed actually wanted.

**Resolution**: AI drafts within four constrained templates; cards are editable
inline during review, which recovers the encoding work at a fraction of the
authoring cost.

### Why these four types
The stated goal is *retrieval speed under pressure* — interviews, real problems.
That rules out definitions and rules in problem-shape → solution-shape:
`signature`, `discriminator`, `tradeoff`, `failure_mode`.

Binding rule: **every front is a situation, every back is a decision.**

### The best card source isn't notes
It's failures — a LeetCode problem you couldn't solve, a design question you
fumbled. That's ground truth about a gap rather than a guess. A "got this wrong"
capture path is probably worth more than the whole note-to-card pipeline. Not in
v0.1, but worth building early.

### Spaced repetition has limits
Excellent for facts, mediocre for conceptual understanding. Duolingo's model
doesn't transfer cleanly — language has atomic, high-frequency, objectively
checkable units; "why a B-tree beats a hash index for range queries" doesn't
decompose that way. Hence: not every concept should produce cards.

---

## Schema philosophy

### Flexible / user-defined schema — rejected
**Argued for**: any user could adapt it; agent memory could learn what a user's
custom fields mean and reason over them later.
**Conceded**: agent memory genuinely does solve *interpretation*. That objection
was withdrawn.
**Still rejected because**: memory is a read-time solution to a write-time
problem. Schema constrains what gets stored; memory only interprets what's
already there. Intensity logged as `8`, then `"hard"`, then `"8/10 felt heavy"`
can be explained record-by-record but never aggregated. Cross-domain reasoning
("did sleep predict squat performance") is arithmetic over consistent values, not
comprehension of individual records. Generic forms are also slow to fill, which
breaks the fast-capture requirement.

**Chosen middle path**: hard-coded opinionated schemas, but schema *definitions*
stored in a `domains` table. AI reads the registry to know what exists; the UI
reads it to render forms. Extensibility without arbitrary JSON — and if
user-defined fields are ever wanted, the mechanism already exists.

---

## AI placement

### AI runs in the user's client, not the platform
No inference cost, no billing, no keys to encrypt. Concept proposal, card
drafting, and source extraction all happen through MCP in the user's own Claude.

**Consequences accepted**:
- MCP becomes load-bearing in v0.1, not an add-on — it's the only path to any AI
  behaviour.
- Web capture is manual: pick a concept from a searchable list. Probably faster
  than confirming a suggestion anyway.
- The MCP tool surface must cover more than capture (five tools, see CLAUDE.md).

### BYOK (user's own API key stored in the platform) — considered, then dropped
Superseded by the above. If it ever returns: encrypt at rest, never log, show
spend per operation.

---

## The link-hoarding problem

Link hoarding is the main failure mode of every PKM tool. Building an answer to
it is a genuine differentiator. Several mechanisms were considered:

### Charging money for AI extraction — rejected
The intent was to make the lazy path feel expensive. But users read paid features
as *premium*, so this signals the opposite: AI extraction becomes the aspirational
option. It also means revenue grows precisely when the product is failing at its
purpose. (Charging honestly to recover inference cost is fine — just don't dress
cost recovery up as pedagogy.)

### "Did you read it?" survey prompts — rejected
Self-report is unreliable, and it's friction at the worst moment. The data
already answers it: a source with zero notes attached is unread, or read without
thought — same thing for these purposes. Measure behaviour, don't ask.

### Warnings and nagging — rejected
An app that scolds you about your backlog is an app you avoid opening, which
kills the daily capture habit everything else depends on.

### Effort gate — chosen
Want AI extraction on a source? Write one sentence of your own first. Free,
instant, friction exactly where it belongs. Same logic as card design: AI drafts,
human thinks.

**Caveat**: with AI in the user's client, this **cannot be enforced** — their
Claude can write notes directly through the tools. It's a norm, not a mechanism.
`authored_by` on notes measures it honestly instead.

### Shape, not scolding — chosen
Unattached sources live in a separate inbox lane. Count visible, no red badge.
Auto-archive at 30 days. If it grows to fifty, that's visible information rather
than a lecture.

---

## Engagement design

**Habit ≠ compulsion.** Habit is cue → routine → reward with low friction, and
serves the user. Compulsion is variable reward and loss aversion, and serves
engagement metrics.

For a learning tool, compulsion actively breaks the product. Duolingo is the
proof: streak pressure makes people do trivial lessons to protect a number.
Applied here, that's reviewing easy cards to keep a streak alive while learning
nothing — optimising the metric that lies to you.

**Filter used throughout**: the stated goal is "is it really useful", not "does
it earn". That rules a lot in and out.

**Strongest genuine retention mechanic**: the endowment effect. Six months of
your own notes beats any streak. Counter-intuitively, easy export *increases*
retention — no lock-in anxiety, so no reason to leave early.

**Finite queue matters.** FSRS gives a real ending for free. Apps that never let
you finish get closed mid-session, and closing mid-session is what breaks habits.
Reaching zero is Anki's biggest retention advantage over infinite-content apps.

### Pet idea — deferred, with rules
Arrived after the spec closed. Nothing in the loop depends on it.
- Bad version: pet gets sad when you're away. That's a guilt notification with a
  face — and the face makes it work *better*, which is the problem.
- Good version: pet is a **readout of the corpus**. Grows from what you've built,
  stays put when you're away. Never sick, sad, or dying.
- "Feed by new knowledge" rewards capture volume — the metric explicitly not
  being rewarded. Feed on **loop completion** instead.
- Custom user-uploaded forms mean moderation and abuse handling. Presets first.

**Test**: if the app is still in use after three weeks, the pet is worth
building. If not, the pet wouldn't have saved it.

---

## Empty state

The gap: day one is all effort, no reward. FSRS won't schedule anything for a
day, so the review screen — the whole payoff — stays empty most of week one. This
is where learning apps lose people.

**Options considered**: backfill from the existing Obsidian vault; override FSRS
so the first card is reviewable the same day; make capture itself feel like
progress; design the empty screen as a starting point.

**Chosen**: progressive unlock. Never show an empty review tab — surfaces appear
as they become real, gated at *one* (one concept, one card), not twenty. Small
accumulation signals visible from note one.

**Warning attached**: optimising for capture volume is how you get the link
graveyard the inbox exists to prevent. Reward the loop completing, not the count.
And don't promise a graph you can't show yet — someone shown a mockup of a
beautiful graph they don't have will feel the gap. Show the loop working end to
end on day one instead.

---

## Designer stress test

Walked a UX designer through the design as a check. Results:

**Works**: all four card types transfer cleanly. Failure-mode cards may be *more*
valuable for designers ("what breaks when this label is 40 characters in
German?") than for developers.

**Breaks**:
1. **Visual content** — much of the knowledge is screenshots, before/after pairs,
   spacing values. Text-only bodies lose most of it. → Image support moved into
   v0.1. Markdown bodies render images; the card pipeline gets it free.
2. **Answers are less crisp** — "when to use a modal" genuinely depends. Drilling
   contextual judgment into flashcards risks memorising dogma. → If the honest
   answer is "it depends", it's note-ready, not card-ready.
3. **MCP fits worse** — she lives in Figma, not a terminal. Accepted rather than
   designed around.

**Validated**: the `domains` registry held up under a user it wasn't designed
for. "Visual design" is a row, not a code change.

---

## Stack decisions

### Supabase over Neon + R2 + Better Auth
Three services collapse into one (Postgres, auth, storage). At ~2h/evening that
matters more than any component being marginally better. Bonus: `pgvector` is
available for the deferred similarity search — embeddings live in the same
database, no extra service.

### NestJS separate API over Next.js fullstack — REVERSED 2026-08-11
> **Superseded.** See *Next.js fullstack, on cost* below. The reasoning here is
> kept because it still describes what the reversal gives up.

**Considered**: Next.js API routes serving UI, REST, and MCP from one repo —
fastest path to running code, shared types, one deploy.
**Chosen instead**: NestJS on Railway/Fly, separate from the Next.js frontend.
The stated goal was learning the server side properly and building something that
holds up — Nest forces module structure, DI, guards, pipes, and DTO validation,
which is annoying at 500 lines and the reason a codebase survives 50,000. It's
also the most common serious Node backend in job listings.

MCP also fits a persistent process better than serverless functions, which have
execution timeouts.

**Cost accepted**: 2–3 extra evenings before the first feature works (CORS, cross
-origin tokens, two deploys, env vars in two places).

**Honest caveat recorded**: framework choice is close to irrelevant for actual
scale. What breaks systems is missing indexes, N+1 queries, no migration
discipline, and no visibility when things fail. Those habits matter more than
this decision did.

### Hono — the alternative if Nest feels heavy
Objectively lighter, better for a small service. Rejected only because the goal
was learning depth over speed.

### Next.js fullstack, on cost — chosen 2026-08-11
**Trigger**: hosting price. A separate API has to run somewhere that isn't free —
Railway has no free tier, Fly wants a card for a machine that stays up. Next.js
on Vercel Hobby plus Supabase free is $0/month, and $0 is the difference between
a project that survives a gap in motivation and one that gets deleted when a
card declines.

**What this gives up**, stated plainly so it isn't rediscovered as a surprise:
- The Nest learning goal. DI, guards, pipes, and module structure were the actual
  reason Nest won; that lesson is deferred, not obtained some other way.
- Serverless constraints on MCP. See below.

**What it does not give up**: the boundary. Route handlers stay thin and
delegate to a service layer under `src/server/` that never imports anything from
`next/*`. Business logic, schema, and validation know nothing about the
transport. Extraction to a real API later is then mostly mechanical — move the
service layer, re-wrap it in controllers — rather than a rewrite.

**Consequence for MCP**: it runs stateless. Serverless functions are ephemeral,
so no in-memory session store and no long-lived SSE connection — each call
authenticates by bearer token and stands alone. Vercel Hobby caps a function at
60s, which is comfortable for five tools that are all short database operations.
It would not be comfortable for the deferred AI extraction of URLs and files;
that work needs a queue or a real process, and the decision arrives with it.

**Revisit when**: MCP needs long-lived connections, extraction work lands, or
the project earns money and Hobby's non-commercial term stops applying.

---

## Meta

### Portfolio argument — conceded
Initial position: an unfinished platform is a worse portfolio piece than one
finished small thing. **Withdrawn.** A growing project shown honestly with its
current state reads as normal, not embarrassing, and the learning accrues while
building.

### Scope discipline — the live risk
This is the third or fourth concurrent project (life OS v0.1 mid-schema, a
6-month system design + LeetCode roadmap, now this). The recurring pattern:
**plans expand when concrete work feels uncomfortable.** New tracks, new tools,
new products appear precisely when the boring work is next.

The platform framing genuinely resolves the life-OS conflict — workouts become a
later surface on the same spine rather than a competing project. But the pattern
should be watched during the build. New ideas go to `docs/ideas.md`.

### Life OS schema work disposition
- **Folds in now**: the domain registry idea (already in v0.1 schema), the
  users/auth model.
- **Park as design doc** (`docs/deferred/workouts-schema.md`): exercise + muscle
  activation schema, cardio nullable duration/distance, people-notes schema.
- **Needs rethink, and this is the important one**: local-first SQLite was the
  founding assumption of life OS, and the platform decision quietly killed it.
  Multi-user, mobile browser, and MCP hitting a server from anywhere all point at
  a hosted database. Single-user assumptions become multi-tenant rows. Write this
  down or it gets rediscovered painfully when the workouts surface is built.
