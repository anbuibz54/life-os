import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/dal'
import { signOut } from '../(auth)/actions'

/**
 * Account.
 *
 * The one destination that is real from day one — everything else appears as
 * the corpus makes it true. Sign-out has to live somewhere reachable, and
 * burying it behind a gesture to protect the purity of an empty home screen
 * would be design serving itself.
 */
export default async function SettingsPage() {
  const { user, hasPassword, providers } = await requireUser()

  const methods = [
    hasPassword ? 'Email and password' : null,
    providers.includes('google') ? 'Google' : null,
    providers.includes('azure') ? 'Microsoft' : null,
  ].filter(Boolean) as string[]

  return (
    <AppShell>
      <header className="flex flex-col gap-2">
        <Link href="/" className="t-marker hover:text-foreground">
          ← Back
        </Link>
        <h1 className="t-title">Account</h1>
      </header>

      <dl className="l-rows text-sm">
        <div className="flex items-start justify-between gap-4 border-b border-border py-3">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-right break-all">{user.email}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 border-b border-border py-3">
          <dt className="text-muted-foreground">Sign-in</dt>
          <dd className="text-right">{methods.join(', ') || 'None'}</dd>
        </div>
      </dl>

      {!hasPassword ? (
        <Button variant="outline" asChild>
          <Link href="/set-password">Add a password</Link>
        </Button>
      ) : null}

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </AppShell>
  )
}
