'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from './form-error'
import { setPassword, type AuthFormState } from '../actions'

const initialState: AuthFormState = { error: null }

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <FormError>{state.error}</FormError>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Set password'}
      </Button>
    </form>
  )
}
