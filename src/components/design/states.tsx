import { cn } from '@/lib/utils'

/**
 * Empty and finished states.
 *
 * These are two different things and the difference matters. An EmptyState is
 * a surface with nothing in it yet — under progressive unlock most of these
 * never render at all, because a surface you cannot use is not shown. A
 * SessionEnd is the reward: the queue is empty, you are done today.
 *
 * FSRS gives a real ending for free, and reaching zero is the strongest
 * retention mechanic in the product. Apps that never let you finish get closed
 * mid-session, and closing mid-session is what breaks habits. So the ending is
 * designed, not an afterthought.
 */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="t-title">{title}</p>
      {children ? (
        <p className="t-ui max-w-prose text-muted-foreground text-pretty">{children}</p>
      ) : null}
      {action}
    </div>
  )
}

export function SessionEnd({
  title = 'Done for today.',
  children,
  className,
}: {
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-1 flex-col items-start justify-center gap-3 py-12', className)}>
      <p className="t-title">{title}</p>
      {children ? (
        <p className="t-ui max-w-prose text-muted-foreground text-pretty">{children}</p>
      ) : null}
      {/*
        No "review more" button, deliberately. An endless feed is exactly the
        compulsion pattern the product rejects — the queue emptying has to mean
        something, and it stops meaning anything if you can always get more.
      */}
    </div>
  )
}
