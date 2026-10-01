# Ideas

New feature ideas parked here, per `CLAUDE.md` ("If a new feature idea arrives
mid-build, it goes in `docs/ideas.md`, not into scope"). Nothing here is a
commitment.

---

## v0.2 — Study surface

**Problem, from evidence.** The app captures well and that is the whole loop today.
The corpus is now real (the `ai-engineering` domain, one note per lesson since
2026-09-05), and it **cannot be studied**:

- Concept page is a flat note list — no anchors, no reading order, no way to see the
  arc of a topic.
- No search. "What do I already know that touches this?" was the pitch; today the
  only answer path is scrolling `/concepts`.
- Domains have no UI. A new domain required `scripts/add-domain.mts` against the DB,
  and the only way to discover valid domains over MCP is to call `create_concept`
  with a wrong one and read the error (friction log, 2026-09-05).
- `create_note` has no optional `concept_id`, so notes captured by the mentor land
  unfiled even when the concept was just created (friction log, 2026-09-05).

**Candidate 1 — concept page reads like a lesson** (smallest useful change).
Notes in creation order with dates, markdown rendered as content, a small anchor list
at the top, cards section collapsed behind a toggle. No new tables, no migration.
Why first: it is the surface the daily review actually reads, and it needs zero schema.
Cost: ~2h. Risk: none beyond going against the "review is nearly drained of colour"
direction — keep it monochrome, serif for content.

**Candidate 2 — `create_note` optional `concept_id` + `list_domains` tool + domain
management in Settings.**
Why: three of the four friction entries from the first week are about capture being
awkward in ways the model cannot discover on its own. Domains as rows-not-migrations
is right; domains with no way to add one over MCP is not.
Cost: ~3h. Touches `src/server/mcp/server.ts`, `src/server/domains/service.ts`,
Settings page.

**Candidate 3 — search.**
Postgres full-text first (`to_tsvector` + GIN index on `notes.body`, plus concept
name), one box on the home surface, results show note excerpt + concept + domain.
Embeddings stay deferred; FTS answers "I know I wrote this down somewhere" for free.
**Conflicts with `CLAUDE.md`'s "Inbox and search later"** — read that as "not before
there is a corpus", and the corpus exists now. Do it only after candidate 1 has been
used for a week and search is still the thing that hurts.
Cost: ~4h including a migration.

**Candidate 4 — hygiene that only matters once 3 exists.** Deleted notes must not
appear in search results; soft-delete or reindex on delete. Index bloat and
`process_status` staleness in `sources` are the same class of problem.

**Not proposed, and unchanged from the deferred list**: embeddings / similarity
search, `related_to`, the prerequisite DAG, URL and file extraction, the agentic card
writer, the pet. They need a bigger corpus than the one that exists. This file does
not reopen them.

**Order if approved**: 1 → 2 → (wait a week) → 3 → 4. Total ~9h, which is about two
Saturday blocks. Anything beyond that waits for the corpus threshold in `CLAUDE.md`.

---

## Status — 2026-10-01

Approved and shipped together (see `CLAUDE.md` build order steps 11–13):

- **1 shipped** — `concepts/[id]` now reads as a page: notes first, oldest first,
  dates, `pre-wrap` bodies, an outline once there are three or more notes, and the
  cards collapsed behind a summary. No schema change.
- **2 shipped** — `create_note` takes an optional `concept_id`; `list_domains` is a
  sixth MCP tool; Account has a Domains section that adds a domain as a row (key
  derived from the name) with an accent picker. Also: the MCP address in Account now
  prefers `NEXT_PUBLIC_SITE_URL`, which is what stops it advertising the
  per-deployment hostname.
- **3 shipped, differently** — search is `ILIKE` over note bodies **and** the concept
  names notes are filed under, on `/search`, with no migration. Full-text with a GIN
  index was the plan; it is not worth a production DDL for a corpus this size, and
  the escape hatch to it is a single function (`searchNotes`) plus one migration.
  Revisit when a search actually measures slow, not before.
- **4 not applicable yet** — nothing deletes a note in this app, so there is no
  index to keep honest. It becomes real the day a delete ships, together with full
  text search.

Still deferred, unchanged: embeddings, `related_to`, the prerequisite DAG, URL and
file extraction, the agentic card writer, the pet.
