import Link from 'next/link'
import { signUp } from '../actions'
import { CredentialsForm } from '../_components/credentials-form'
import { OAuthButtons } from '../_components/oauth-buttons'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          You can add the other sign-in method later.
        </p>
      </div>

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
        action={signUp}
        submitLabel="Create account"
        next={next}
        autoComplete="new-password"
      />

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Already have one?{' '}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  )
}
