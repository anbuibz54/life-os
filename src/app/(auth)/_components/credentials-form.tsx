'use client'

import { useActionState, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from './form-error'
import { resendConfirmation, type AuthFormState } from '../actions'

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>
  submitLabel: string
  /** Rendered into the form so the action can send the user onward. */
  next?: string
  autoComplete: 'current-password' | 'new-password'
}

const initialState: AuthFormState = { error: null }

export function CredentialsForm({ action, submitLabel, next, autoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const [resent, setResent] = useState<string | null>(null)
  const [resending, startResend] = useTransition()

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" name="email" required autoComplete="email" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={autoComplete}
        />
      </div>

      <FormError>{state.error}</FormError>

      {/*
        Only rendered when sign-in failed *solely* because the address is
        unconfirmed — which means the password was right. Sending someone to
        reset a correct password is the worst possible next step.
      */}
      {state.unconfirmedEmail ? (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resending}
            onClick={() =>
              startResend(async () => {
                const r = await resendConfirmation(state.unconfirmedEmail!)
                setResent(r.error ?? 'Sent. Check your email.')
              })
            }
          >
            {resending ? 'Sending…' : 'Resend confirmation email'}
          </Button>
          {resent ? <p className="t-data">{resent}</p> : null}
        </div>
      ) : null}

      {/* The one filled control on the screen. */}
      <Button type="submit" disabled={pending}>
        {pending ? 'Working…' : submitLabel}
      </Button>
    </form>
  )
}
