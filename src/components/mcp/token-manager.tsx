'use client'

import { useActionState } from 'react'
import { mintToken, revokeTokenAction, type TokenResult } from '@/app/_actions/tokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from '@/app/(auth)/_components/form-error'

export type TokenSummary = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

const initial: TokenResult = { token: null, error: null }

/**
 * MCP tokens.
 *
 * The plaintext appears once, here, and never again — the server keeps only a
 * hash. That is stated plainly rather than hidden behind a copy button,
 * because someone who closes this screen without copying it needs to know
 * immediately that the fix is a new token, not a support request.
 *
 * `lastUsedAt` is shown because it is the only thing that makes an abandoned
 * token visible. A token nobody has used in months is a token to revoke.
 */
export function TokenManager({ tokens, mcpUrl }: { tokens: TokenSummary[]; mcpUrl: string }) {
  const [state, formAction, pending] = useActionState(mintToken, initial)

  const live = tokens.filter((t) => !t.revokedAt)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="t-section">MCP access</h2>
        <p className="t-ui text-muted-foreground text-pretty">
          Connect your own AI client so it can capture notes and draft cards
          into this account. Reviewing stays in the app.
        </p>
      </div>

      {state.token ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <span className="t-marker">Copy this now — it is not shown again</span>
          <code className="font-mono text-xs break-all">{state.token}</code>
          <p className="t-ui text-muted-foreground text-pretty">
            Add it to your client as a bearer token for{' '}
            <code className="font-mono text-xs break-all">{mcpUrl}</code>
          </p>
        </div>
      ) : null}

      <form action={formAction} className="flex items-end gap-2">
        <div className="l-field flex-1">
          <Label htmlFor="token-name">New token</Label>
          <Input id="token-name" name="name" placeholder="Laptop" required maxLength={60} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </form>

      <FormError>{state.error}</FormError>

      {live.length > 0 ? (
        <ul className="l-rows">
          {live.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="t-ui block truncate">{t.name}</span>
                <span className="t-data">
                  {t.lastUsedAt ? `last used ${t.lastUsedAt}` : 'never used'}
                </span>
              </span>
              <form action={revokeTokenAction.bind(null, t.id)}>
                {/* No confirmation. Revoking a token you are unsure about is
                    the correct instinct, and minting another is free. */}
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  Revoke
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-ui text-muted-foreground">No tokens yet.</p>
      )}
    </section>
  )
}
