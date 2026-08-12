import { Button } from '@/components/ui/button'
import { AppShell, Counters } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/dal'
import { signOut } from './(auth)/actions'

/**
 * Home at state S0.
 *
 * Step 2 only proves the loop: a session exists, the `public.users` row was
 * provisioned from it, and sign-out works. Step 3 replaces the placeholder
 * below with the capture box — and passes real destinations to AppShell as
 * they become real.
 */
export default async function Home() {
  const { user, hasPassword } = await requireUser()

  return (
    <AppShell destinations={[]}>
      <h1 className="font-serif text-2xl leading-tight tracking-tight">
        Nothing captured yet.
      </h1>

      <p className="prose-note text-sm text-muted-foreground text-pretty">
        The capture box lands here in step 3. Until then this page exists to
        prove the session resolves and the user row is provisioned from it.
      </p>

      <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Signed in</dt>
        <dd className="break-all">{user.email}</dd>
        <dt className="text-muted-foreground">User row</dt>
        <dd className="font-mono text-xs break-all text-muted-foreground">{user.id}</dd>
      </dl>

      <div className="flex flex-col gap-2">
        {!hasPassword ? (
          <Button variant="outline" asChild>
            <a href="/set-password">Add a password</a>
          </Button>
        ) : null}

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>

      <Counters items={['0 notes', '0 concepts', 'streak 0']} />
    </AppShell>
  )
}
