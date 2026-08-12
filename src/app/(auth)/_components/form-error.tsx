/**
 * Form-level error.
 *
 * Uses `destructive` because this is a genuine failure the person has to act
 * on — distinct from overdue counts and rating buttons, which never go red.
 */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null

  return (
    <p role="alert" className="text-sm leading-relaxed text-destructive text-pretty">
      {children}
    </p>
  )
}
