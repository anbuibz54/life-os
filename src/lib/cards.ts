/**
 * Card vocabulary — shared by the server service, the web form, and later the
 * MCP tool descriptions.
 *
 * Deliberately free of any database or framework import so a client component
 * can use it without pulling Drizzle into the browser bundle. It is also the
 * reason the definition-card rule cannot drift between surfaces: there is one
 * copy of it, and everything that writes a card goes through it.
 */

export type CardType = 'signature' | 'discriminator' | 'tradeoff' | 'failure_mode'

/**
 * The four types, with the rule each one enforces on the writer.
 *
 * These strings are the teaching surface. The form shows them at the moment
 * someone is writing, which is the only moment the distinction is actionable.
 */
export const CARD_TYPES = [
  {
    value: 'signature',
    label: 'Signature',
    rule: 'Problem properties → technique. Describe the shape, never name the problem.',
    frontExample: 'Sorted array, find two numbers summing to a target',
    backExample: 'Two pointers from both ends. O(n), no extra space.',
  },
  {
    value: 'discriminator',
    label: 'Discriminator',
    rule: 'Two options → the deciding factor.',
    frontExample: 'B-tree or hash index?',
    backExample: 'Range queries and ordered scans: B-tree. Equality only: hash.',
  },
  {
    value: 'tradeoff',
    label: 'Tradeoff',
    rule: 'When *not* to use the thing.',
    frontExample: 'When would you not add an index?',
    backExample: 'Write-heavy tables, low-cardinality columns, small tables.',
  },
  {
    value: 'failure_mode',
    label: 'Failure mode',
    rule: 'What breaks when conditions change.',
    frontExample: 'Cache-aside, what happens when the cache goes down?',
    backExample: 'Every read hits the database at once. Thundering herd.',
  },
] as const satisfies ReadonlyArray<{
  value: CardType
  label: string
  rule: string
  frontExample: string
  backExample: string
}>

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  signature: 'Signature',
  discriminator: 'Discriminator',
  tradeoff: 'Tradeoff',
  failure_mode: 'Failure mode',
}

/**
 * Definition-card guard.
 *
 * "What is a B-tree?" builds recognition, and recognition is not what anyone is
 * here for — the goal is retrieval speed under pressure, which needs a
 * situation on the front and a decision on the back.
 *
 * Only matches the opening, so "Index or seq scan — what is the deciding
 * factor?" still passes.
 */
const DEFINITION_OPENERS = [
  /^what\s+is\b/i,
  /^what\s+are\b/i,
  /^what'?s\b/i,
  /^define\b/i,
  /^definition\s+of\b/i,
  /^describe\s+the\s+(concept|term|idea)\b/i,
]

export function isDefinitionFront(front: string): boolean {
  return DEFINITION_OPENERS.some((re) => re.test(front.trim()))
}

export const DEFINITION_REJECTION =
  'That is a definition card. Rewrite the front as a situation — the shape of a problem, a choice between two options, or what breaks when something changes.'
