'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthFormState = { error: string | null }

/** Providers we support. Microsoft is `azure` in Supabase's vocabulary. */
export type OAuthProvider = 'google' | 'azure'

const credentials = z.object({
  email: z.email('That does not look like an email address.'),
  // Deliberately only a length floor. Composition rules (a digit, a symbol,
  // a capital) push people toward "Password1!" and are worse than length.
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

async function siteOrigin() {
  const h = await headers()
  // Behind Vercel's proxy the forwarded headers are the truthful ones.
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const protocol = h.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${host}`
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Deliberately not distinguishing "no such user" from "wrong password" —
    // that difference is an account-enumeration oracle.
    return { error: 'Incorrect email or password.' }
  }

  const next = formData.get('next')
  revalidatePath('/', 'layout')
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/')
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const origin = await siteOrigin()

  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    return { error: error.message }
  }

  // Supabase returns success here whether or not the address was already
  // registered, again to avoid enumeration. The copy has to work for both.
  redirect('/login?checkEmail=1')
}

export async function signInWithProvider(provider: OAuthProvider, next?: string) {
  const supabase = await createClient()
  const origin = await siteOrigin()

  const callback = new URL('/auth/callback', origin)
  if (next?.startsWith('/')) callback.searchParams.set('next', next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  })

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent('Could not reach that provider.')}`)
  }

  redirect(data.url)
}

/**
 * Add (or change) a password on an account that already has a session.
 *
 * This is what makes Google/Microsoft accounts able to fall back to email and
 * password later. Supabase attaches an `email` identity to the existing user
 * rather than creating a second one.
 */
export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z
    .object({ password: z.string().min(8, 'Password must be at least 8 characters.') })
    .safeParse({ password: formData.get('password') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  if (formData.get('password') !== formData.get('confirm')) {
    return { error: 'The two passwords do not match.' }
  }

  const supabase = await createClient()

  // Requires a live session; there is no path here for a signed-out caller.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
