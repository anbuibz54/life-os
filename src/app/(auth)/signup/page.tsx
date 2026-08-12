import Link from 'next/link'
import { signUp } from '../actions'
import { AuthHeading } from '../_components/auth-heading'
import { CredentialsForm } from '../_components/credentials-form'
import { FormError } from '../_components/form-error'
import { OAuthButtons } from '../_components/oauth-buttons'
import { Separator } from '../_components/separator'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <>
      <AuthHeading title="Create an account">
        You can add the other sign-in method later.
      </AuthHeading>

      <FormError>{error}</FormError>

      <OAuthButtons next={next} />

      <Separator>or</Separator>

      <CredentialsForm
        action={signUp}
        submitLabel="Create account"
        next={next}
        autoComplete="new-password"
      />

      <p className="text-sm text-muted-foreground">
        Already have one?{' '}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4 hover:no-underline"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
