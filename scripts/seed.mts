/**
 * Seeds the domain registry.
 *
 *   pnpm db:seed
 *
 * Idempotent on `key`, so it is safe to run after every deploy and will not
 * undo a domain someone renamed by hand.
 */

import { db } from '../src/server/db/index.ts'
import { listDomains, seedDomains } from '../src/server/domains/service.ts'

const inserted = await seedDomains(db)
const all = await listDomains(db)

console.log(`inserted ${inserted} domain${inserted === 1 ? '' : 's'}`)
for (const d of all) {
  console.log(`  ${String(d.accent)}  ${d.key.padEnd(16)} ${d.name}`)
}

process.exit(0)
