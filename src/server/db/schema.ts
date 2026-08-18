/**
 * Life OS — v0.1 schema.
 *
 * Rules this file follows (see CLAUDE.md):
 *  - Every foreign key gets an index.
 *  - Migrations only go forward. Never edit an applied migration.
 *  - Derive state where it is cheap; cache it only where a hot query needs it,
 *    and say so out loud when we do.
 *
 * Nothing here imports from `next/*`. This layer does not know it is being
 * served by Next.js, which is what keeps a later extraction mechanical.
 */

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Four card types, no more. Every front is a situation, every back is a
 * decision. A front starting with "what is" is a definition card and does not
 * ship — that rule lives in the MCP tool description and in review, not in a
 * database constraint, because it is a judgement call.
 */
export const cardTypeEnum = pgEnum('card_type', [
  'signature',
  'discriminator',
  'tradeoff',
  'failure_mode',
])

/** Measures whether MCP capture is actually used — a core product hypothesis. */
export const sourceChannelEnum = pgEnum('source_channel', ['web', 'mcp'])

/**
 * Self-tracking, not enforcement. With AI running in the user's own client the
 * effort gate cannot be enforced; this measures it honestly instead.
 */
export const authoredByEnum = pgEnum('authored_by', ['human', 'ai'])

export const sourceKindEnum = pgEnum('source_kind', ['url', 'file', 'book', 'manual'])

/** A seam for later AI extraction. In v0.1 everything is `pending`, nothing reads it. */
export const processStatusEnum = pgEnum('process_status', ['pending', 'done', 'failed'])

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors `auth.users`, which Supabase owns. `id` is the auth user's id.
 *
 * Deliberately no cross-schema foreign key to `auth.users` here: Drizzle would
 * have to own a table it does not manage, and the migration then needs
 * elevated grants. The row is created on first authenticated request instead.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_idx').on(t.email),
])

/* -------------------------------------------------------------------------- */
/* Domains                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Domains are rows, not migrations. Adding "Visual design" or "Workouts" later
 * is an INSERT, not a schema change. `fieldDefs` is the registry the UI reads to
 * render forms and the AI reads to know what exists — this is the middle path
 * between hard-coded schemas and arbitrary user-defined JSON (see DECISIONS.md).
 *
 * Global, not per-user: domains are shared vocabulary.
 */
export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  fieldDefs: jsonb('field_defs').notNull().default(sql`'{}'::jsonb`),
  /**
   * Which of the six palette slots this domain wears (1–6). Stored rather than
   * hashed from the key so it stays stable when a domain is renamed, and can
   * be changed by hand when two adjacent domains land on similar hues.
   * See docs/design/SYSTEM.md.
   */
  accent: smallint('accent').notNull().default(1),
}, (t) => [
  uniqueIndex('domains_key_idx').on(t.key),
])

/* -------------------------------------------------------------------------- */
/* Concepts                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Stable topics. Many notes attach to one concept; cards attach to concepts,
 * never to notes. Attaching cards to notes gives you five overlapping cards
 * about B-trees instead of one that improves as you learn more.
 */
export const concepts = pgTable('concepts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id').notNull().references(() => domains.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('concepts_domain_id_idx').on(t.domainId),
  // `list_concepts` searches by name within a user — the AI reads this before
  // classifying, so it runs on essentially every MCP capture. `user_id` leads,
  // so this also serves as the index on that foreign key; a separate
  // `(user_id)` index would be redundant read-side and pure cost write-side.
  index('concepts_user_name_idx').on(t.userId, t.name),
])

/* -------------------------------------------------------------------------- */
/* Sources                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A URL is a source, not a note. The same paper pasted three times converges on
 * one source. `url` and `storageKey` are both nullable — a URL source has one, a
 * file source the other.
 *
 * No `status` column: unread is "zero notes attached", derived by a left join.
 */
export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: sourceKindEnum('kind').notNull(),
  url: text('url'),
  storageKey: text('storage_key'),
  title: text('title'),
  extractedText: text('extracted_text'),
  processStatus: processStatusEnum('process_status').notNull().default('pending'),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sources_user_id_idx').on(t.userId),
  // The inbox reads live sources only; archived rows stay searchable but drop
  // out of this index entirely. Sources untouched for 30 days auto-archive.
  index('sources_user_live_idx')
    .on(t.userId, t.createdAt)
    .where(sql`${t.archivedAt} is null`),
])

/* -------------------------------------------------------------------------- */
/* Notes                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * What was written — timestamped, journal-like. Body is markdown and renders
 * images if present.
 *
 * `conceptId` is nullable ON PURPOSE. Capture must never block on
 * classification; if it blocks mid-conversation, capture stops being used.
 * Unfiled notes are legitimate and the inbox catches them.
 */
export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  sourceChannel: sourceChannelEnum('source_channel').notNull().default('web'),
  authoredBy: authoredByEnum('authored_by').notNull().default('human'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notes_user_created_idx').on(t.userId, t.createdAt),
  index('notes_concept_id_idx').on(t.conceptId),
  index('notes_source_id_idx').on(t.sourceId),
  // Inbox lane one: unfiled notes. Partial index so the scan stays proportional
  // to the backlog, not to the corpus.
  index('notes_unfiled_idx')
    .on(t.userId, t.createdAt)
    .where(sql`${t.conceptId} is null`),
])

/* -------------------------------------------------------------------------- */
/* Cards                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Attached to concepts, never to notes.
 *
 * FSRS current state lives here; `reviews` is the append-only history. This is
 * a deliberate exception to "derive state, don't maintain it" (which was a rule
 * about the inbox): the due-queue query runs every session and is the app's
 * hot path, and deriving it means DISTINCT ON over a log that only grows. Both
 * are written in one transaction, so they cannot drift. The log still carries
 * everything needed to re-derive schedules if the algorithm changes.
 *
 * No `userId` here on purpose. Ownership reaches cards through `concepts`, and
 * one authorization path is the rule — a second copy of ownership is a second
 * thing to get wrong. Cost: the due-queue query joins `concepts`. If that ever
 * measures slow, denormalise then, with the join as the reference implementation.
 */
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  conceptId: uuid('concept_id').notNull().references(() => concepts.id, { onDelete: 'cascade' }),
  cardType: cardTypeEnum('card_type').notNull(),
  front: text('front').notNull(),
  back: text('back').notNull(),

  // --- FSRS state, owned by ts-fsrs. Do not hand-write scheduling. ---
  /** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: smallint('state').notNull().default(0),
  due: timestamp('due', { withTimezone: true }).notNull().defaultNow(),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsedDays: integer('elapsed_days').notNull().default(0),
  scheduledDays: integer('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  /**
   * How far through the learning/relearning steps this card is. ts-fsrs 5.x
   * carries it on its Card and reads it back on the next review; without it
   * persisted, short-term scheduling restarts its steps every time.
   */
  learningSteps: integer('learning_steps').notNull().default(0),
  lastReview: timestamp('last_review', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cards_concept_id_idx').on(t.conceptId),
  // The due queue: one queue across all domains, ordered by due date.
  index('cards_due_idx').on(t.due),
])

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Append-only, one row per review. Never updated, never deleted.
 *
 * Storing full history rather than only current state means schedules can be
 * re-derived if the algorithm changes, and bad cards can be identified: a card
 * wrong >60% of the time after 5+ reviews is usually badly written, not hard —
 * flag it for rewrite instead of letting FSRS grind it forever. That flag is a
 * query over this table, not a column.
 *
 * The post-review FSRS state is duplicated here so re-derivation does not need
 * to replay the scheduler to know what it decided at the time.
 */
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  /** ts-fsrs Rating: 1 Again, 2 Hard, 3 Good, 4 Easy. */
  rating: smallint('rating').notNull(),
  /** ts-fsrs State after this review. */
  state: smallint('state').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  elapsedDays: integer('elapsed_days').notNull(),
  scheduledDays: integer('scheduled_days').notNull(),
  learningSteps: integer('learning_steps').notNull().default(0),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Card history in order — what the card-health query reads. `card_id` leads,
  // so this is also the index on that foreign key.
  index('reviews_card_reviewed_idx').on(t.cardId, t.reviewedAt),
])

/* -------------------------------------------------------------------------- */
/* Attachments                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Images live in object storage; only the key is in Postgres. Max 5MB,
 * downscaled client-side before upload. Serve via presigned URLs — never proxy
 * image bytes through the API.
 */
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('attachments_user_id_idx').on(t.userId),
])

/* -------------------------------------------------------------------------- */
/* MCP tokens                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Bearer tokens for the MCP endpoint. One row per token, several per user.
 *
 * NOT the `api_keys` table the spec rules out. That exclusion is about AI
 * provider keys — inference runs in the user's own client, so the platform
 * holds no provider credentials and pays no inference cost. These are the
 * opposite direction: they let the user's client prove who it is to us, and
 * the MCP section requires them explicitly.
 *
 * Only the SHA-256 hash is stored. The plaintext is shown once at creation and
 * is unrecoverable afterwards — a token table that can be read is a table that
 * can be leaked, and there is no reason for the server to ever need it back.
 *
 * `lastUsedAt` is what makes an abandoned token obvious. `revokedAt` is a soft
 * delete so a revoked token stays visibly revoked rather than silently absent.
 */
export const mcpTokens = pgTable('mcp_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** SHA-256 of the plaintext, hex. Unique so a lookup is one index hit. */
  tokenHash: text('token_hash').notNull(),
  /** Whose client this is — "laptop", "phone". Helps decide what to revoke. */
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [
  // The auth path on every single MCP call: hash the header, find this row.
  uniqueIndex('mcp_tokens_hash_idx').on(t.tokenHash),
  index('mcp_tokens_user_idx').on(t.userId, t.createdAt),
])

/* -------------------------------------------------------------------------- */
/* Daily activity                                                              */
/* -------------------------------------------------------------------------- */

/**
 * One row per user per day. Deriving streaks by scanning notes and reviews gets
 * slow; this stays cheap and is what the heatmap reads from.
 *
 * The streak counts the LOOP COMPLETING, not volume — never reward capture
 * volume, that is how you get a link graveyard.
 */
export const dailyActivity = pgTable('daily_activity', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  captured: boolean('captured').notNull().default(false),
  reviewed: boolean('reviewed').notNull().default(false),
}, (t) => [
  // Composite key, not a surrogate id: one row per user per day *is* the
  // identity. It also gives the upsert target for `on conflict do update`.
  // Leading `user_id` doubles as the index on that foreign key.
  primaryKey({ columns: [t.userId, t.date] }),
])
