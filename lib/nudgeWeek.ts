import { type WeekState } from './nudge'
import { daysBetween } from './week'
import { weekStart } from './week'

// The week, counted. Split out from the data layer so it can be tested against
// a list of dates rather than a database, and out of nudge.ts so that file
// stays what the coach says rather than how the counting is done.
//
// Distinct days rather than sessions throughout: two workouts on a Tuesday is
// a Tuesday, and a week you said was four days is met by training on four
// days.
export function weekOf(dates: string[], today: string, target: number): WeekState {
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort()
  const start = weekStart(today)
  const done = days.filter((d) => d >= start && d <= today).length

  // Sunday to Saturday, the same week the streak and the coverage strip use.
  // Today counts as still available, because it is.
  const dow = daysBetween(start, today)
  const left = 7 - dow

  return {
    target,
    done,
    left,
    average: averageWeek(days, start),
    lastDate: days.length ? days[days.length - 1] : null,
    today,
  }
}

// Their own days per week over the four full weeks before this one. Four
// because it is a month of training and short enough to still describe how
// they train now, and full weeks only, because comparing a finished week
// against a week in progress is how an app tells somebody a lie about
// themselves.
export function averageWeek(days: string[], thisWeekStart: string): number | null {
  const first = shift(thisWeekStart, -28)
  const window = days.filter((d) => d >= first && d < thisWeekStart)
  if (!window.length) return null
  // Only weeks that had already started by the time they logged anything, so
  // somebody four days into using the app is not averaged against three empty
  // weeks they were never here for.
  const earliest = days[0]
  const weeks = [0, 1, 2, 3]
    .map((i) => shift(first, i * 7))
    .filter((start) => start >= weekStart(earliest))
  if (!weeks.length) return null
  const total = weeks.reduce((sum, start) => {
    const end = shift(start, 7)
    return sum + window.filter((d) => d >= start && d < end).length
  }, 0)
  return total / weeks.length
}

function shift(iso: string, days: number): string {
  const t = Date.parse(iso + 'T00:00:00Z') + days * 86400000
  return new Date(t).toISOString().slice(0, 10)
}
