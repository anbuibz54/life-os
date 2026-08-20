import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Where OAuth providers and email confirmation links land.
 *
 * Exchanges the one-time code for a session cookie, then routes onward:
 * someone who arrived via Google or Microsoft and has no password yet is
 * offered the chance to add one, so that next time either method works.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const safeNext = next?.startsWith('/') ? next : '/'

  // Providers report user-facing failures (consent denied, misconfigured
  // client) as query params rather than a failed exchange.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, origin),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('That sign-in link is incomplete.')}`, origin),
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('That sign-in link has expired. Try again.')}`,
        origin,
      ),
    )
  }

  /**
   * A provider can return an identity with no email address — both providers
   * have "Allow users without an email" enabled in Supabase. This app cannot
   * use such an account: `users.email` is NOT NULL and every surface is keyed
   * to it. Sign the session out here rather than leaving a half-authenticated
   * state that no screen will accept.
   */
  if (!data.user?.email) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          'That account did not share an email address, which this app needs. Try another sign-in method.',
        )}`,
        origin,
      ),
    )
  }

  // No `email` identity means password sign-in is not available on this
  // account yet — it was created through Google or Microsoft.
  const hasPassword = data.user?.identities?.some((i) => i.provider === 'email') ?? false

  if (!hasPassword) {
    const setPassword = new URL('/set-password', origin)
    if (safeNext !== '/') setPassword.searchParams.set('next', safeNext)
    return NextResponse.redirect(setPassword)
  }

  return NextResponse.redirect(new URL(safeNext, origin))
}
