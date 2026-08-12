'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { requireUser } from '@/lib/auth/dal'
import { createNote, createNoteInput } from '@/server/notes/service'
import { markActivity, todayInZone } from '@/server/activity/service'

export type CaptureResult = { error: string | null }

/**
 * Capture a note from the web.
 *
 * Thin by design: authenticate, validate, call the service, revalidate. No
 * business logic here — that lives in `src/server/`, which knows nothing about
 * Next.js.
 *
 * `localDate` comes from the browser so the streak rolls over at the user's
 * midnight rather than UTC's. See `todayInZone`.
 */
export async function captureNote(input: {
  body: string
  localDate?: string
}): Promise<CaptureResult> {
  const { user } = await requireUser()

  const parsed = createNoteInput.safeParse({
    body: input.body,
    sourceChannel: 'web',
    authoredBy: 'human',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await createNote(db, user.id, parsed.data)
  await markActivity(db, user.id, todayInZone(input.localDate), 'captured')

  revalidatePath('/')
  return { error: null }
}
