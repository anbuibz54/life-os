'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { createCard, createCardInput, deleteCard } from '@/server/cards/service'

export type CardResult = { error: string | null }

/**
 * Write a card under a concept.
 *
 * The definition-card rule lives in the service's input schema, not here, so
 * the web form and the MCP tool cannot drift apart on what ships.
 */
export async function addCard(input: {
  conceptId: string
  cardType: string
  front: string
  back: string
}): Promise<CardResult> {
  const { user } = await requireUser()

  const parsed = createCardInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const card = await createCard(db, user.id, parsed.data)
  if (!card) return { error: 'That concept no longer exists.' }

  revalidatePath('/')
  revalidatePath('/concepts')
  revalidatePath(`/concepts/${parsed.data.conceptId}`)
  return { error: null }
}

/** Delete a card. No confirmation anywhere in this product. */
export async function removeCard(cardId: string, conceptId: string): Promise<CardResult> {
  const { user } = await requireUser()

  const parsed = z.uuid().safeParse(cardId)
  if (!parsed.success) return { error: 'That card does not look right.' }

  const ok = await deleteCard(db, user.id, parsed.data)
  if (!ok) return { error: 'That card no longer exists.' }

  revalidatePath('/')
  revalidatePath('/concepts')
  revalidatePath(`/concepts/${conceptId}`)
  return { error: null }
}

/**
 * Form-shaped wrapper. A `<form action>` must resolve to void, and this page
 * has no error surface — a failed delete means the card is already gone, which
 * is the outcome the click was asking for anyway.
 */
export async function removeCardForm(cardId: string, conceptId: string): Promise<void> {
  await removeCard(cardId, conceptId)
}
