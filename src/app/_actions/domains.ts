'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { createDomain, createDomainInput } from '@/server/domains/service'

export type DomainResult = { created: string | null; error: string | null }

/**
 * Add a domain.
 *
 * Domains are global rows, not per-user, so there is nothing to scope to the
 * caller beyond being signed in — but this still goes through `requireUser`
 * for the same reason every other action does: one authorization path.
 *
 * "Already exists" is reported from the insert itself (the unique index on
 * `key`), not from a read first. Two adds for "Databases" at the same moment
 * would both pass a read check.
 */
export async function addDomain(
  _prev: DomainResult,
  formData: FormData,
): Promise<DomainResult> {
  await requireUser()

  const parsed = createDomainInput.safeParse({
    name: formData.get('name'),
    accent: formData.get('accent') ?? 1,
  })

  if (!parsed.success) {
    return { created: null, error: parsed.error.issues[0].message }
  }

  const domain = await createDomain(db, parsed.data)
  if (!domain) {
    return { created: null, error: `"${parsed.data.name}" already exists.` }
  }

  // The picker on the capture screen reads the domain list, so a new domain has
  // to reach `/` as well as the page it was added from.
  revalidatePath('/settings')
  revalidatePath('/')
  return { created: domain.name, error: null }
}
