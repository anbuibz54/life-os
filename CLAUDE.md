# Life OS — Learning Surface v0.1

Context file for Claude Code. Read this before making changes.
Framework rules live in `AGENTS.md` — this is Next.js 16, which differs from
older versions in ways that matter.

@AGENTS.md

## What this is

A personal knowledge platform. One shared spine (database, auth, AI context),
many domain surfaces on top. Learning is the first surface; workouts and
people-notes come later on the same spine.

The value is the shared context layer, not any individual domain. Existing apps
fail because they don't share context — that is the problem being solved.

Target users: people who learn across several domains. First two real users are
one developer and one designer. Domains are not user types — the same person has
many domains.

## Stack

- **Everything**: Next.js (App Router) + TypeScript, deployed on Vercel. PWA,
  installable, responsive. No native apps. One repo, one deploy — UI, REST, and
  MCP. Chosen for cost; the separate NestJS API was reversed, see DECISIONS.md.
- **Database**: Supabase Postgres, accessed via Drizzle ORM.
- **Auth**: Supabase Auth.
- **Storage**: Supabase Storage (S3-compatible, signed URLs).
- **Scheduling**: `ts-fsrs`. Do not hand-write spaced repetition scheduling.
- **MCP**: `@modelcontextprotocol/sdk`, streamable HTTP, bearer token per user.
  **Stateless** — serverless functions are ephemeral, so no session store and no
  long-lived SSE. One route under `src/app/api/mcp/`.

### Stack rules

- All database access goes through the service layer in `src/server/`. Never
  call Supabase directly from the browser. RLS stays on as a second layer, but
  the service layer is the single authorization path — two authorization models
  is how holes appear.
- **Nothing in `src/server/` imports from `next/*`.** Route handlers are thin:
  parse, authenticate, call a service, serialize. That boundary is what keeps a
  future extraction to a standalone API mechanical instead of a rewrite.
- Two connection URLs, both through the pooler; the **port** is what differs.
  `DATABASE_URL` is **transaction** mode (6543) for runtime. `DIRECT_URL` is
  **session** mode (5432) for Drizzle migrations. They are not interchangeable:
  transaction mode hands a backend to the next transaction mid-flight, which
  breaks DDL, prepared statements, and the advisory lock drizzle-kit takes.
  (The true direct host `db.<ref>.supabase.co` is *not* usable — Supabase
  dropped public IPv4 for it, so it does not resolve without the add-on.)
  Runtime must also pass `prepare: false`; transaction mode cannot cache them.
- Every foreign key gets an index.
- Migrations only go forward. No editing applied migrations.
- Structured logging and Sentry from day one, not after users arrive.

## Schema

### Core tables

**users** — id, email, created_at. (Supabase Auth backed.)

**domains** — id, key, name, field_defs (json).
Domains are rows, not migrations. Adding "Visual design" or "Workouts" later is
an insert, not a schema change.

**concepts** — id, user_id, domain_id, name, summary.
Stable topics. Many notes attach to one concept. Cards attach to concepts.

**notes** — id, user_id, concept_id (nullable), source_id (nullable), body,
source_channel, authored_by, created_at.
- `concept_id` is nullable **on purpose**. Capture must never block on
  classification. Unfiled notes are legitimate; the inbox catches them.
- `source_channel` is `web` or `mcp`. This measures whether MCP capture is
  actually used — a core hypothesis of the product.
- `authored_by` is `human` or `ai`. Self-tracking, not enforcement.
- Body is markdown. Renders images if present.

**cards** — id, concept_id, card_type, front, back.
Attached to concepts, never to notes. Otherwise you get five overlapping cards
about the same topic instead of one that improves.

**reviews** — id, card_id, rating, stability, difficulty, due_at.
Append-only, one row per review. Storing full history (not just current state)
means schedules can be re-derived if the algorithm changes, and bad cards can be
identified.

**sources** — id, user_id, kind, url, storage_key, title, extracted_text,
process_status, snoozed_until, archived_at, created_at.
- `kind` is `url` | `file` | `book` | `manual`. `url` and `storage_key` are both
  nullable; a URL source has one, a file source the other.
- `process_status` (`pending` | `done` | `failed`) is a seam for later AI
  extraction. In v0.1 everything is `pending` and nothing reads it.
- A URL is a source, not a note. The same paper pasted three times converges on
  one source.

**attachments** — id, user_id, storage_key, mime, bytes, created_at.
Images live in object storage; only the key is in Postgres. Max 5MB, downscale
client-side before upload. Presigned URLs — never proxy image bytes through the
API.

**daily_activity** — user_id, date, captured (bool), reviewed (bool).
Streaks derived by scanning notes and reviews gets slow. One row per user per day
stays cheap and is what a heatmap reads from.

### Deliberately NOT in v0.1

- No `related_to` table. Association edges come from embeddings later (pgvector
  is available on Supabase), derived for free, never hand-maintained.
- No `requires` table. The prerequisite DAG is the curated, sparse graph that
  answers "what should I learn next" — but it needs a real corpus to be worth
  anything. Build it in week six against 100 concepts, not week one against zero.
- No status columns on the inbox. Unfiled notes are `concept_id IS NULL`;
  unread sources are a left join with no notes. Derive state, don't maintain it.
- No `api_keys` table. AI runs in the user's own client via MCP; the platform
  holds no keys and pays no inference cost.
  (`mcp_tokens` is **not** this table and does not contradict it: those are
  bearer tokens letting the user's client prove who it is to us — the opposite
  direction — and the MCP section requires them. Only a SHA-256 hash is stored;
  the plaintext is shown once and is unrecoverable.)

## Card types

Four types only. **Every front is a situation. Every back is a decision.**
If a front starts with "what is", it is a definition card and does not ship.

1. **signature** — problem properties → technique.
   Front describes *shape*, never names the problem.
   > Sorted array, find two numbers summing to a target
   > → Two pointers from both ends. O(n), no extra space.

2. **discriminator** — two options → the deciding factor.
   > B-tree or hash index?
   > → Range queries and ordered scans: B-tree. Equality only: hash.

3. **tradeoff** — when *not* to use the thing.
   > When would you not add an index?
   > → Write-heavy tables, low-cardinality columns, small tables.

4. **failure_mode** — what breaks when conditions change.
   > Cache-aside, what happens when the cache goes down?
   > → Every read hits the database at once. Thundering herd.

**Not every concept should produce cards.** If the honest answer is "it
depends", it is note-ready, not card-ready. Forcing it teaches false confidence.

**Card health**: a card wrong >60% of the time after 5+ reviews is usually badly
written, not hard. Flag for rewrite rather than letting FSRS grind it forever.

## MCP tool surface

Five tools. Tool descriptions are the prompt — most tuning effort goes here.

- `create_note` — body required, everything else optional. **Must never require
  a concept.** If it blocks mid-conversation, capture stops being used.
- `list_concepts` — with search filter. This is what makes classification
  possible; the AI reads existing concepts before deciding.
- `create_concept` — name, domain, summary.
- `get_notes_for_concept` — read before drafting cards, to avoid duplicates.
- `create_card` — concept_id, type, front, back. Description must name the four
  types and explicitly forbid definition cards.

Not included: `get_due_cards`. Reviewing in a chat window is a bad experience —
no rating buttons, no scheduling feedback. Review belongs in the app.

Every write returns the created ID and a URL.

Auth: per-user bearer token in the MCP config, checked on every call, scoped to
that user's rows.

## UX principles

Visual language, tokens, and the colour rules live in `docs/design/SYSTEM.md`.
Direction: serif for content, sans for controls; colour carried by domains,
never by chrome; review is nearly drained of it.

**Progressive unlock.** Never show an empty review tab. Surfaces appear as they
become real: zero notes → one capture box. First concept → cards unlock. First
card → review unlocks. Inbox and search later. Gate at one, not twenty.

**Always visible from note one**: note count, concept count, streak at one. Small
signals that something is accumulating.

**Inbox, two lanes** (same surface, different actions):
- *Unfiled notes* (`concept_id IS NULL`) — attach to concept, create concept, or
  delete. Low debt; the thinking was done.
- *Unread sources* (zero notes attached) — write a sentence (promotes it to a
  note), snooze, or delete. This is the real debt.

Delete is one swipe, no confirmation, no guilt copy. Deleting a link you no
longer care about is a **correct outcome**, not a failure. Sources untouched for
30 days auto-archive — still searchable, out of the inbox. No nagging.

Triage happens *after* review, never before. Optional, capped at three items.

**Health metric**: ratio of sources with ≥1 note to total sources. Below 50% and
the app is a link graveyard.

### Engagement — habit, not compulsion

Keep: same-time cue with one quiet reminder, a **clear session end** (queue
empties, you are done today), visible accumulation of your own corpus, two-second
capture, easy export (no lock-in anxiety means no reason to leave early).

Avoid: streak-loss panic (drives fake reviews of easy cards), guilt
notifications, points and leaderboards, endless card feeds.

Streak counts the **loop completing**, not volume. One freeze day per week.

**Never reward capture volume.** That is how you get a link graveyard.

### Cross-domain from day one

One review queue across all domains. One capture box with no mode picker. One
streak covering everything. If review is per-domain, this is just Anki decks and
the entire thesis is lost.

## Build order

Each step usable before the next begins. Steps 1–6 are the loop — stopping after
6 still leaves a working product.

1. Schema and migrations
2. Auth, one user
3. Capture and list notes
4. Concepts, attach notes
5. Cards, four types
6. Review with FSRS
7. MCP endpoint, five tools
8. Deploy, install on phone
9. Images (paste/drop → upload → markdown in body)
10. Inbox, streak

## Deferred — do not build yet

- Graph visualization
- Prerequisite DAG (`requires` edges)
- Embedding similarity search / "what do I know that solves this"
- AI extraction of URLs and files into notes
- Pet / gamification layer. Rules if it ever gets built: it is a **readout of the
  corpus**, never a dependent creature. Never sad, sick, or dying — that is a
  guilt notification with a face. Feeds on **loop completion**, not capture
  volume. Preset forms before user uploads.
- Native mobile apps
- Billing of any kind
- Workouts and people-notes surfaces (see `docs/deferred/workouts-schema.md`)

## Standing constraints

- ~2 hours per weekday evening, more on weekends. Scope accordingly.
- Known pattern: plans expand when concrete work feels uncomfortable — new
  tracks, new tools, new products appear. If a new feature idea arrives
  mid-build, it goes in `docs/ideas.md`, not into scope.
- Prefer understanding *why* over just output. Schema tradeoffs and architectural
  rationale get documented inline.
