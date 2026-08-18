/**
 * The MCP tool surface.
 *
 * Five tools. **The descriptions are the prompt** — they are the only thing
 * steering a model that cannot see this codebase, so they carry the product's
 * rules in prose rather than assuming any are obvious.
 *
 * Deliberately absent: `get_due_cards`. Reviewing in a chat window is a bad
 * experience — no rating buttons, no scheduling feedback, no sense of an
 * ending. Review belongs in the app.
 *
 * No `next/*` imports. The transport is wired up in the route handler.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Db } from '../db'
import type { Principal } from './tokens'
import { createNote, listNotesForConcept } from '../notes/service'
import { createConcept, findConcept, listConcepts } from '../concepts/service'
import { listDomains } from '../domains/service'
import { createCard, createCardInput } from '../cards/service'
import { markActivity, todayInZone } from '../activity/service'
import { CARD_TYPES } from '@/lib/cards'

const CARD_TYPE_GUIDE = CARD_TYPES.map(
  (t) => `- "${t.value}" — ${t.rule} e.g. front: "${t.frontExample}" back: "${t.backExample}"`,
).join('\n')

function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }] }
}

export function buildMcpServer(db: Db, principal: Principal, baseUrl: string) {
  const server = new McpServer(
    { name: 'life-os', version: '0.1.0' },
    {
      instructions: [
        "Life OS is the user's personal knowledge base: notes attach to concepts, concepts produce spaced-repetition cards.",
        '',
        'Capture is cheap and should stay that way — when the user says something worth keeping, call create_note immediately. Never ask which concept it belongs to first; filing happens later in the app, and a note with no concept is a completely normal note.',
        '',
        'Before creating a concept, call list_concepts and reuse an existing one. Duplicate concepts are the main way this database degrades, and nothing merges them later.',
        '',
        'Before drafting cards, call get_notes_for_concept so you do not write a card that repeats one already there.',
      ].join('\n'),
    },
  )

  /* ------------------------------------------------------------------ */

  server.registerTool(
    'create_note',
    {
      title: 'Capture a note',
      description: [
        "Save a note to the user's knowledge base. Use this whenever they learn, realise, or decide something worth keeping.",
        '',
        'Only `body` is required. **Never ask the user which concept it belongs to before calling this** — capture must not block on classification. An unfiled note is a normal, healthy note; the user files it later in the app.',
        '',
        "Body is markdown. Prefer the user's own words over a tidied summary: the phrasing they used is part of what they will recognise later.",
        '',
        'If you are recording something you inferred or drafted rather than something the user said, set authored_by to "ai" so their corpus stays honest about its own provenance.',
      ].join('\n'),
      inputSchema: {
        body: z
          .string()
          .min(1)
          .describe("The note, in markdown. The user's own words where possible."),
        authored_by: z
          .enum(['human', 'ai'])
          .optional()
          .describe('"human" (default) if this is the user\'s own thinking; "ai" if you drafted it.'),
      },
    },
    async ({ body, authored_by }) => {
      const note = await createNote(db, principal.userId, {
        body,
        sourceChannel: 'mcp',
        authoredBy: authored_by ?? 'human',
      })
      // MCP capture counts toward the streak exactly like web capture does.
      // Server date, since a tool call carries no timezone.
      await markActivity(db, principal.userId, todayInZone(), 'captured')

      return text(`Captured note ${note.id}\n${baseUrl}/`)
    },
  )

  /* ------------------------------------------------------------------ */

  server.registerTool(
    'list_concepts',
    {
      title: 'List concepts',
      description: [
        "List the user's existing concepts, optionally filtered by a search term.",
        '',
        '**Call this before create_concept, every time.** Reusing an existing concept is almost always right — duplicates ("B-trees" and "B-tree indexes") are the main way this knowledge base degrades, and nothing merges them later.',
        '',
        'Also useful for answering "what do I already know about X?".',
      ].join('\n'),
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe('Case-insensitive substring match on the concept name. Omit to list everything.'),
      },
    },
    async ({ search }) => {
      const found = await listConcepts(db, principal.userId, { search, limit: 100 })
      if (found.length === 0) {
        return text(search ? `No concepts match "${search}".` : 'No concepts yet.')
      }
      return text(
        found.map((c) => `${c.id}  ${c.name}  [${c.domain.name}]  ${c.noteCount} notes`).join('\n'),
      )
    },
  )

  /* ------------------------------------------------------------------ */

  server.registerTool(
    'create_concept',
    {
      title: 'Create a concept',
      description: [
        'Create a new concept — a stable topic that notes attach to and cards hang off.',
        '',
        '**Call list_concepts first** and reuse a match if there is one.',
        '',
        'Name it the way the user would search for it later, not the way a textbook would title it. Concepts are topics ("B-tree indexes", "Modal dialogs"), not questions and not sentences.',
      ].join('\n'),
      inputSchema: {
        name: z.string().min(1).describe('Topic name, e.g. "B-tree indexes".'),
        domain: z
          .string()
          .min(1)
          .describe('Domain key or name. Pass a wrong value once and the error lists the valid options.'),
        summary: z.string().optional().describe('One or two sentences. Optional.'),
      },
    },
    async ({ name, domain, summary }) => {
      const domains = await listDomains(db)
      const needle = domain.trim().toLowerCase()
      const match = domains.find(
        (d) => d.key.toLowerCase() === needle || d.name.toLowerCase() === needle,
      )

      if (!match) {
        return text(
          `No domain "${domain}". Available:\n` +
            domains.map((d) => `- ${d.key} (${d.name})`).join('\n'),
        )
      }

      const concept = await createConcept(db, principal.userId, {
        name,
        domainId: match.id,
        summary,
      })

      return text(
        `Created concept "${concept.name}" in ${match.name}\n${concept.id}\n${baseUrl}/concepts/${concept.id}`,
      )
    },
  )

  /* ------------------------------------------------------------------ */

  server.registerTool(
    'get_notes_for_concept',
    {
      title: 'Read the notes under a concept',
      description: [
        'Return every note filed under one concept, oldest first.',
        '',
        '**Call this before drafting cards.** It is the only way to avoid writing a card that duplicates one the user already has, and to ground a card in what they actually wrote rather than in general knowledge.',
      ].join('\n'),
      inputSchema: {
        concept_id: z.string().describe('Concept id, from list_concepts or create_concept.'),
      },
    },
    async ({ concept_id }) => {
      const concept = await findConcept(db, principal.userId, concept_id)
      if (!concept) return text(`No concept ${concept_id}.`)

      const found = await listNotesForConcept(db, principal.userId, concept.id)
      if (found.length === 0) return text(`"${concept.name}" has no notes yet.`)

      return text(
        `${found.length} note(s) under "${concept.name}":\n\n` +
          found.map((n) => `[${n.createdAt.toISOString().slice(0, 10)}] ${n.body}`).join('\n\n'),
      )
    },
  )

  /* ------------------------------------------------------------------ */

  server.registerTool(
    'create_card',
    {
      title: 'Write a review card',
      description: [
        'Create a spaced-repetition card under a concept. Call get_notes_for_concept first.',
        '',
        '**Every front is a situation. Every back is a decision.** The goal is retrieval speed under pressure — an interview, a real problem — not recognition.',
        '',
        '**Definition cards are rejected and will not save.** If the front starts with "what is", "what are", or "define", it is a definition card. Rewrite it as a situation. "What is a B-tree?" is wrong; "B-tree or hash index?" is right.',
        '',
        'The four types:',
        CARD_TYPE_GUIDE,
        '',
        '**Not every concept should produce cards.** If the honest answer is "it depends", the material is note-ready, not card-ready — say so to the user instead of forcing a card. A card that teaches false confidence is worse than no card.',
      ].join('\n'),
      inputSchema: {
        concept_id: z.string().describe('Concept id the card belongs to.'),
        card_type: z
          .enum(['signature', 'discriminator', 'tradeoff', 'failure_mode'])
          .describe('One of the four types described above.'),
        front: z.string().min(1).describe('A situation. Never "what is ...".'),
        back: z.string().min(1).describe('A decision — what to do and why.'),
      },
    },
    async ({ concept_id, card_type, front, back }) => {
      // Validated here rather than letting the service throw, so the
      // definition-card rejection comes back as a message the model can act
      // on. Same schema the web form uses, so the two cannot drift.
      const parsed = createCardInput.safeParse({
        conceptId: concept_id,
        cardType: card_type,
        front,
        back,
      })

      if (!parsed.success) return text(`Rejected: ${parsed.error.issues[0].message}`)

      const card = await createCard(db, principal.userId, parsed.data)
      if (!card) return text(`No concept ${concept_id}.`)

      return text(`Created ${card.cardType} card ${card.id}\n${baseUrl}/concepts/${concept_id}`)
    },
  )

  return server
}
