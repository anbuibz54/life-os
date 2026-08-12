/**
 * Shared shell for the signed-out surfaces.
 *
 * Direction C: the voice is serif, the machinery is sans. There is no chrome
 * here at all — nothing to navigate to yet, and per progressive unlock we do
 * not show a shape the account does not have.
 */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      {children}
    </div>
  )
}
