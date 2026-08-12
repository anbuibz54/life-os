/**
 * A labelled rule. `aria-hidden` on the whole thing because the word "or"
 * carries no meaning for a screen reader here — the two groups of controls
 * are already distinct.
 */
export function Separator({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
