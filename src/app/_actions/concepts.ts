'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { createConcept, createConceptInput, findConcept } from '@/server/concepts/service'
import { fileNote } from '@/server/notes/service'

export type FileResult = { error: string | null }

/**
 * File a note under an existing concept.
 *
 * The concept is resolved through `findConcept`, which is scoped to the
 * caller — so a guessed id belonging to someone else resolves to nothing
 * rather than quietly succeeding.
 */
export async function fileNoteUnderConcept(
  noteId: string,
  conceptId: string,
): Promise<FileResult> {
  const { user } = await requireUser()

  const parsed = z.object({ noteId: z.uuid(), conceptId: z.uuid() }).safeParse({ noteId, conceptId })
  if (!parsed.success) return { error: 'That note or concept does not look right.' }

  const concept = await findConcept(db, user.id, parsed.data.conceptId)
  if (!concept) return { error: 'That concept no longer exists.' }

  const ok = await fileNote(db, user.id, parsed.data.noteId, concept.id)
  if (!ok) return { error: 'That note no longer exists.' }

  revalidatePath('/')
  revalidatePath('/concepts')
  return { error: null }
}

/**
 * Create a concept and file the note under it, in one action.
 *
 * One step on purpose. Making someone create a concept, find it again, and
 * then file into it turns a five-second decision into a chore, and filing is
 * already the part people skip.
 */
export async function createConceptAndFile(
  noteId: string,
  input: { name: string; domainId: string },
): Promise<FileResult> {
  const { user } = await requireUser()

  const parsedNote = z.uuid().safeParse(noteId)
  if (!parsedNote.success) return { error: 'That note does not look right.' }

  const parsed = createConceptInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const concept = await createConcept(db, user.id, parsed.data)

  const ok = await fileNote(db, user.id, parsedNote.data, concept.id)
  if (!ok) return { error: 'That note no longer exists.' }

  revalidatePath('/')
  revalidatePath('/concepts')
  return { error: null }
}

/** Unfile a note. Unfiled is a legitimate state, so this is not a failure path. */
export async function unfileNote(noteId: string): Promise<FileResult> {
  const { user } = await requireUser()

  const parsed = z.uuid().safeParse(noteId)
  if (!parsed.success) return { error: 'That note does not look right.' }

  await fileNote(db, user.id, parsed.data, null)

  revalidatePath('/')
  revalidatePath('/concepts')
  return { error: null }
}
