import { requireUser } from '@/lib/auth/dal'
import { signOut } from './(auth)/actions'

/**
 * Placeholder home. Step 2 only proves the loop: a session exists, the
 * `public.users` row was provisioned from it, and sign-out works.
 *
 * Step 3 replaces this with the capture box. Per progressive unlock, zero
 * notes means exactly one thing on screen — a place to write — plus the small
 * accumulation signals (note count, concept count, streak).
 */
export default async function Home() {
  const { user, hasPassword, providers } = await requireUser()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Signed in</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">User row</dt>
        <dd className="font-mono text-xs">{user.id}</dd>
        <dt className="text-neutral-500">Sign-in methods</dt>
        <dd>{providers.join(', ') || 'none'}</dd>
      </dl>

      {!hasPassword ? (
        <a
          href="/set-password"
          className="rounded-md border border-neutral-300 px-3 py-2 text-center text-sm dark:border-neutral-700"
        >
          Add a password
        </a>
      ) : null}

      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Sign out
        </button>
      </form>
    </main>
  )
}
