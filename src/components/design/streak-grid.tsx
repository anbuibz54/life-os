import { cn } from '@/lib/utils'

/**
 * The streak, as a grid rather than a number.
 *
 * A number can be lost; a grid is a record of what you built and stays true
 * whatever you do today. That difference is the whole engagement position —
 * habit, not compulsion.
 *
 * Intensity encodes the LOOP COMPLETING, never volume. Capturing forty notes
 * in a day is the same square as capturing one, because rewarding volume is
 * how you get a link graveyard.
 */

export type ActivityDay = {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  captured: boolean
  reviewed: boolean
}

/** 0 nothing · 2 half the loop · 4 both halves. Deliberately not linear. */
function level(day: ActivityDay): 0 | 2 | 4 {
  if (day.captured && day.reviewed) return 4
  if (day.captured || day.reviewed) return 2
  return 0
}

const HEAT: Record<0 | 2 | 4, string> = {
  0: 'bg-heat-0',
  2: 'bg-heat-2',
  4: 'bg-heat-4',
}

function describe(day: ActivityDay) {
  if (day.captured && day.reviewed) return `${day.date}: captured and reviewed`
  if (day.captured) return `${day.date}: captured`
  if (day.reviewed) return `${day.date}: reviewed`
  return `${day.date}: nothing`
}

export function StreakGrid({ days, className }: { days: ActivityDay[]; className?: string }) {
  return (
    <ul
      className={cn('flex flex-wrap gap-1', className)}
      aria-label="Recent activity, one square per day"
    >
      {days.map((day) => (
        <li
          key={day.date}
          title={describe(day)}
          aria-label={describe(day)}
          className={cn('size-2.5 rounded-[2px]', HEAT[level(day)])}
        />
      ))}
    </ul>
  )
}
