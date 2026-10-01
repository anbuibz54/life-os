import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/dal'
import { signOut } from '../(auth)/actions'
import { TokenManager, type TokenSummary } from '@/components/mcp/token-manager'
import { DomainManager, type DomainSummary } from '@/components/domains/domain-manager'
import { db } from '@/server/db'
import { listTokens } from '@/server/mcp/tokens'
import { countConceptsByDomain, listDomains } from '@/server/domains/service'
import { headers } from 'next/headers'

/**
 * Account.
 *
 * The one destination that is real from day one — everything else appears as
 * the corpus makes it true. Sign-out has to live somewhere reachable, and
 * burying it behind a gesture to protect the purity of an empty home screen
 * would be design serving itself.
 *
 * Two things a user cannot work out from anywhere else live here: the domains
 * their corpus is filed under, and the address to give an MCP client.
 */
export default async function SettingsPage() {
  const { user, hasPassword, providers } = await requireUser()
  const [rows, domains, conceptCounts, h] = await Promise.all([
    listTokens(db, user.id),
    listDomains(db),
    countConceptsByDomain(db),
    headers(),
  ])

  /**
   * The address to connect an MCP client to.
   *
   * `NEXT_PUBLIC_SITE_URL` wins when it is set, because a Vercel deployment
   * serves the request from a per-deployment hostname (`life-os-<hash>-….vercel.app`)
   * and that hostname is not what the user should paste into their client — it
   * changes on every deploy. Setting the variable to the production domain is
   * the fix; falling back to the request host keeps local development working
   * with no configuration.
   */
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const protocol = h.get('x-forwarded-proto') ?? 'http'
  const mcpUrl = `${configuredUrl ?? `${protocol}://${host}`}/api/mcp`

  const tokens: TokenSummary[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt.toISOString().slice(0, 10),
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString().slice(0, 10) : null,
    revokedAt: t.revokedAt ? t.revokedAt.toISOString().slice(0, 10) : null,
  }))

  const domainRows: DomainSummary[] = domains.map((d) => ({
    id: d.id,
    key: d.key,
    name: d.name,
    accent: d.accent,
    conceptCount: conceptCounts.get(d.id) ?? 0,
  }))

  // First unused palette slot, so adding two domains in a row does not give
  // them the same hue. Past six, wrap — the palette is six and colour is a
  // label, not an identity.
  const usedAccents = new Set(domains.map((d) => d.accent))
  const defaultAccent = [1, 2, 3, 4, 5, 6].find((slot) => !usedAccents.has(slot)) ?? domains.length + 1

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

      <TokenManager tokens={tokens} mcpUrl={mcpUrl} />

      <DomainManager domains={domainRows} defaultAccent={defaultAccent} />

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
