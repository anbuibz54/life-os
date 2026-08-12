/**
 * The serif voice. Used once per screen, never for labels or controls —
 * that split is the whole of direction C.
 */
export function AuthHeading({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-serif text-2xl leading-tight tracking-tight text-balance">{title}</h1>
      {children ? (
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{children}</p>
      ) : null}
    </div>
  )
}
