import { Button } from '@/components/ui/button'
import { signInWithProvider } from '../actions'

/**
 * Server component — each button is a plain form posting to a bound Server
 * Action, so this works without client JavaScript.
 *
 * Outline, not filled: the filled control on any screen is the one primary
 * action, and here that is the credentials form's submit.
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
          <Button type="submit" variant="outline" className="w-full">
            {p.label}
          </Button>
        </form>
      ))}
    </div>
  )
}
