'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { createToken, revokeToken } from '@/server/mcp/tokens'

export type TokenResult = { token: string | null; error: string | null }

/**
 * Mint an MCP token.
 *
 * The plaintext comes back exactly once, in this return value. It is never
 * stored and cannot be recovered — losing it means minting another.
 */
export async function mintToken(_prev: TokenResult, formData: FormData): Promise<TokenResult> {
  const { user } = await requireUser()

  const parsed = z
    .string()
    .trim()
    .min(1, 'Give it a name so you know what to revoke later.')
    .max(60, 'That name is too long.')
    .safeParse(formData.get('name'))

  if (!parsed.success) return { token: null, error: parsed.error.issues[0].message }

  const { token } = await createToken(db, user.id, parsed.data)

  revalidatePath('/settings')
  return { token, error: null }
}

export async function revokeTokenAction(tokenId: string): Promise<void> {
  const { user } = await requireUser()
  const parsed = z.uuid().safeParse(tokenId)
  if (!parsed.success) return

  await revokeToken(db, user.id, parsed.data)
  revalidatePath('/settings')
}
