'use client'

import { useActionState } from 'react'
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
    <form action={formAction} className="flex flex-col gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={autoComplete}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? 'Working…' : submitLabel}
      </button>
    </form>
  )
}
