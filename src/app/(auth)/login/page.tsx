import Link from 'next/link'
import { signIn } from '../actions'
import { AuthHeading } from '../_components/auth-heading'
import { CredentialsForm } from '../_components/credentials-form'
import { FormError } from '../_components/form-error'
import { OAuthButtons } from '../_components/oauth-buttons'
import { Separator } from '../_components/separator'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; checkEmail?: string }>
}) {
  const { next, error, checkEmail } = await searchParams

  return (
    <>
      <AuthHeading title="Sign in">Either method works, whichever you set up.</AuthHeading>

      {checkEmail ? (
        <p
          role="status"
          className="rounded-md border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-muted-foreground text-pretty"
        >
          Check your email for a confirmation link. If that address is already
          registered, sign in instead.
        </p>
      ) : null}

      <FormError>{error}</FormError>

      <OAuthButtons next={next} />

      <Separator>or</Separator>

      <CredentialsForm
        action={signIn}
        submitLabel="Sign in"
        next={next}
        autoComplete="current-password"
      />

      <p className="text-sm text-muted-foreground">
        No account yet?{' '}
        <Link
          href="/signup"
          className="text-foreground underline underline-offset-4 hover:no-underline"
        >
          Create one
        </Link>
      </p>
    </>
  )
}
