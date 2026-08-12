import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Add a password</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          You signed in with {via} as {user.email}. Set a password and you can
          use either from now on.
        </p>
      </div>

      <SetPasswordForm />

      <Link
        href={skipTo}
        className="text-center text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-400"
      >
        Skip — keep using {via}
      </Link>
    </main>
  )
}
