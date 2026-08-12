import { signInWithProvider } from '../actions'

/**
 * Server component — each button is a plain form posting to a bound Server
 * Action, so this works without client JavaScript.
 */
export function OAuthButtons({ next }: { next?: string }) {
  const providers = [
    { id: 'google', label: 'Continue with Google' },
    // Microsoft is `azure` to Supabase. The label is what users read.
    { id: 'azure', label: 'Continue with Microsoft' },
  ] as const

  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <form key={p.id} action={signInWithProvider.bind(null, p.id, next)}>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            {p.label}
          </button>
        </form>
      ))}
    </div>
  )
}
