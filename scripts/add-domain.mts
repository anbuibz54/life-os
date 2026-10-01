/**
 * Adds one domain to the registry.
 *
 *   pnpm tsx --env-file=.env.local scripts/add-domain.mts <key> "<Name>" [accent 1-6]
 *
 * Normally you add a domain in Account → Domains, which is the surface for it
 * now. This stays for the two things that surface cannot do: choosing the `key`
 * by hand (the UI derives it from the name) and adding one on a machine with no
 * browser session. Idempotent on `key`.
 */

import { db } from '../src/server/db/index.ts'
import { domains } from '../src/server/db/schema.ts'
import { listDomains } from '../src/server/domains/service.ts'

const [key, name, accentArg] = process.argv.slice(2)
if (!key || !name) {
  console.error('usage: add-domain.mts <key> "<Name>" [accent 1-6]')
  process.exit(1)
}
const accent = Number(accentArg ?? 1)
if (!Number.isInteger(accent) || accent < 1 || accent > 6) {
  console.error('accent must be an integer 1-6 (palette slot)')
  process.exit(1)
}

const rows = await db
  .insert(domains)
  .values({ key, name, accent })
  .onConflictDoNothing({ target: domains.key })
  .returning()

console.log(rows.length ? `inserted ${key}` : `${key} already exists, nothing changed`)
for (const d of await listDomains(db)) {
  console.log(`  ${String(d.accent)}  ${d.key.padEnd(16)} ${d.name}`)
}

process.exit(0)
