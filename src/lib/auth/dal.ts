import 'server-only'

/**
 * Data access layer for auth.
 *
 * This is the real authorization boundary — `proxy.ts` only does an optimistic
 * redirect and can be bypassed. Anything that touches user data goes through
 * `requireUser()` here.
 *
 * Every function is wrapped in React's `cache()`, which memoises per render
 * pass. That is what makes "provision on every authenticated request" cheap:
 * a page rendering five components that each need the user resolves it once.
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { db } from '@/server/db'
import { provisionUser, type AppUser } from '@/server/auth/provision'
import { createClient } from '@/lib/supabase/server'

export type SessionUser = {
  /** The row in `public.users`. */
  user: AppUser
  /**
   * Whether this account can sign in with a password.
   *
   * False for someone who has only ever used Google or Microsoft. Drives the
   * prompt to add one — see `src/app/(auth)/set-password/page.tsx`.
   */
  hasPassword: boolean
  /** Providers linked to this account: 'email', 'google', 'azure'. */
  providers: string[]
}

/**
 * Resolve the caller, or null if signed out.
 *
 * Uses `getUser()` rather than `getSession()`: getSession trusts the cookie
 * without verifying it against the auth server, which makes it useless as an
 * authorization check.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) return null

  const providers = authUser.identities?.map((i) => i.provider) ?? []

  const user = await provisionUser(db, {
    id: authUser.id,
    email: authUser.email,
  })

  return {
    user,
    // An `email` identity is what Supabase creates for password auth. Someone
    // who signed up through Google has only a `google` identity until they add
    // a password, at which point an `email` identity appears alongside it.
    hasPassword: providers.includes('email'),
    providers,
  }
})

/**
 * Resolve the caller or send them to /login.
 *
 * Use this in every page, Server Action, and route handler that reads or
 * writes user data — not the optimistic proxy check.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getSessionUser()
  if (!session) redirect('/login')
  return session
})
