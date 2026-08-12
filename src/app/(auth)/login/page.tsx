import Link from 'next/link'
import { signIn } from '../actions'
import { CredentialsForm } from '../_components/credentials-form'
import { OAuthButtons } from '../_components/oauth-buttons'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; checkEmail?: string }>
}) {
  const { next, error, checkEmail } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Either method works, whichever you set up.
        </p>
      </div>

      {checkEmail ? (
        <p
          role="status"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Check your email for a confirmation link. If that address is already
          registered, sign in instead.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <OAuthButtons next={next} />

      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
        or
        <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
      </div>

      <CredentialsForm
        action={signIn}
        submitLabel="Sign in"
        next={next}
        autoComplete="current-password"
      />

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        No account yet?{' '}
        <Link href="/signup" className="underline underline-offset-4">
          Create one
        </Link>
      </p>
    </main>
  )
}
