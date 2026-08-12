'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from './form-error'
import type { AuthFormState } from '../actions'

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

      {/* The one filled control on the screen. */}
      <Button type="submit" disabled={pending}>
        {pending ? 'Working…' : submitLabel}
      </Button>
    </form>
  )
}
