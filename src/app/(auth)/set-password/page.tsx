import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { AuthHeading } from '../_components/auth-heading'
import { SetPasswordForm } from '../_components/set-password-form'

/**
 * Offered once, right after a first sign-in through Google or Microsoft.
 *
 * Deliberately skippable. Hard-gating a password here would defeat the point
 * of one-click sign-in, and the account already works without one — this is
 * about making the *other* method available, not about completing a profile.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const { user, hasPassword, providers } = await requireUser()

  // Nothing to do — they already have one.
  if (hasPassword) redirect(next?.startsWith('/') ? next : '/')

  const via = providers.includes('azure') ? 'Microsoft' : 'Google'
  const skipTo = next?.startsWith('/') ? next : '/'

  return (
    <>
      <AuthHeading title="Add a password">
        You signed in with {via} as {user.email}. Set a password and you can use
        either from now on.
      </AuthHeading>

      <SetPasswordForm />

      <Link
        href={skipTo}
        className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:no-underline"
      >
        Skip — keep using {via}
      </Link>
    </>
  )
}
