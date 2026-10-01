'use client'

import { useActionState } from 'react'
import { addDomain, type DomainResult } from '@/app/_actions/domains'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DomainDot, asAccent, type DomainAccent } from '@/components/design/domain-dot'
import { FormError } from '@/app/(auth)/_components/form-error'

export type DomainSummary = {
  id: string
  key: string
  name: string
  accent: number
  conceptCount: number
}

const ACCENT_SLOTS: DomainAccent[] = [1, 2, 3, 4, 5, 6]

const initial: DomainResult = { created: null, error: null }

/**
 * Domains.
 *
 * The list is shown because it is the vocabulary the whole corpus is filed
 * under — a user who cannot see their domains cannot tell whether a note went
 * somewhere sensible. The count is concepts, not notes: a domain with concepts
 * and no notes under them is normal, not a gap.
 *
 * Adding one is a row, not a migration, which is why this form exists at all
 * instead of the list being a deploy-time constant.
 */
export function DomainManager({
  domains,
  defaultAccent,
}: {
  domains: DomainSummary[]
  /** First unused palette slot, so two new domains do not land on one hue. */
  defaultAccent: number
}) {
  const [state, formAction, pending] = useActionState(addDomain, initial)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="t-section">Domains</h2>
        <p className="t-ui text-muted-foreground text-pretty">
          Domains are the vocabulary concepts are filed under, shared across every
          user. Adding one is a row, not a schema change.
        </p>
      </div>

      {domains.length === 0 ? (
        <p className="t-ui text-muted-foreground">No domains yet.</p>
      ) : (
        <ul className="l-rows">
          {domains.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <DomainDot accent={asAccent(d.accent)} name={d.name} />
                <span className="min-w-0">
                  <span className="t-ui block truncate">{d.name}</span>
                  <span className="t-data">{d.key}</span>
                </span>
              </span>
              <span className="t-data shrink-0">{d.conceptCount}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <div className="l-field">
          <Label htmlFor="domain-name">New domain</Label>
          <Input id="domain-name" name="name" placeholder="Workouts" required maxLength={60} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="t-marker">Colour</legend>
          <div className="flex items-center gap-3">
            {ACCENT_SLOTS.map((slot) => (
              <label key={slot} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="accent"
                  value={slot}
                  defaultChecked={asAccent(defaultAccent) === slot}
                  className="size-3"
                />
                <DomainDot accent={slot} name={`Colour ${slot}`} />
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add domain'}
        </Button>

        <FormError>{state.error}</FormError>
      </form>
    </section>
  )
}
