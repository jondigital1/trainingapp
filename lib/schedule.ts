import { dayById, type Plan, type Profile } from './onboarding'
import { isEmptySet } from './format'
import type { Workout } from './types'

// Which day of the week you do which session. A week rather than a calendar,
// because training repeats weekly and nobody wants to fill in dates forever:
// say Push on Monday once and it is Push every Monday.
//
// Sunday first, because that is where a week starts on a phone.
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

// Index 0 is Sunday. A template day id trains that day, null rests.
export type Schedule = (string | null)[]

export function emptySchedule(): Schedule {
  return [null, null, null, null, null, null, null]
}

export function scheduleOf(profile: Profile): Schedule {
  const raw = profile.schedule
  if (!Array.isArray(raw) || raw.length !== 7) return emptySchedule()
  return raw.map((id) => (typeof id === 'string' && dayById(id) ? id : null))
}

export function hasSchedule(profile: Profile): boolean {
  return scheduleOf(profile).some((id) => id !== null)
}

// How many days a week the schedule actually asks for. That is the number the
// streak is counted against once a schedule exists, because a week you planned
// four sessions for is met at four, whatever the questionnaire once said.
export function scheduledDays(profile: Profile): number {
  return scheduleOf(profile).filter(Boolean).length
}

export function weekdayOf(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay()
}

// A week runs Sunday to Saturday, which is how the schedule reads and how a
// phone draws a calendar. One definition, used by the streak, the coverage
// count and the block, so the strip on the Workout tab and the number beside
// it can never disagree about which week you are in.
export function weekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

// What today asks of you, or null on a rest day and when nothing is scheduled.
export function todaysDayId(profile: Profile, today: string): string | null {
  return scheduleOf(profile)[weekdayOf(today)] ?? null
}

// Laying a plan across the week, as a starting point somebody can then move
// around: the sessions land on the days most people train, Monday first,
// leaving the weekend clear until there are more sessions than weekdays.
const SPREAD: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

export function suggestSchedule(plan: Plan | null): Schedule {
  const out = emptySchedule()
  if (!plan) return out
  const days = plan.dayIds.slice(0, 7)
  const slots = SPREAD[days.length] ?? SPREAD[3]
  days.forEach((id, i) => {
    const slot = slots[i]
    if (slot != null) out[slot] = id
  })
  return out
}

// Whether a session was actually logged on a date. A workout with nothing in
// it is not a session, the same rule the streak and the grid already use.
export function trainedOn(workouts: Workout[], date: string): boolean {
  return workouts.some(
    (w) => w.date === date && w.exercises.some((e) => e.sets.some((s) => !isEmptySet(s, e.type))),
  )
}

// The next sessions the schedule holds, as dates rather than a fixed
// Sunday-to-Saturday grid. A week grid shows Tuesday twice as far from Monday
// on a Sunday as on a Monday and wastes cells on rest days; what somebody
// planning their life wants is the next few workouts with real dates on them:
// Mon 25, Tue 26, Thu 28, and on. Today is included, because today's session
// is the next one until it is done.
//
// The horizon caps the scan so a schedule with one day a week does not walk
// months into the future to fill the count.
export interface UpcomingDay {
  date: string
  dayId: string
}

export function upcomingDays(profile: Profile, today: string, count = 10, horizon = 28): UpcomingDay[] {
  const schedule = scheduleOf(profile)
  const out: UpcomingDay[] = []
  for (let i = 0; i < horizon && out.length < count; i += 1) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const dayId = schedule[weekdayOf(iso)]
    if (dayId) out.push({ date: iso, dayId })
  }
  return out
}

// A month, as the six by seven grid every calendar is, so the shape on screen
// is the shape people already know how to read. Days outside the month are
// still returned and still carry their state, because a calendar that blanks
// the first three cells of March is harder to read than one that shows the
// end of February in grey.
export interface MonthCell {
  date: string
  day: number
  inMonth: boolean
  // A session was logged. The same rule the streak uses: a saved workout with
  // nothing in it is not training.
  trained: boolean
  // What the schedule asks of that weekday, if anything.
  dayId: string | null
  today: boolean
  future: boolean
}

export function monthGrid(
  profile: Profile,
  workouts: Workout[],
  anchor: string,
  today: string,
): MonthCell[] {
  const schedule = scheduleOf(profile)
  const [y, m] = anchor.slice(0, 7).split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  // Back up to the Sunday on or before the first of the month.
  const start = new Date(first)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const out: MonthCell[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const date = d.toISOString().slice(0, 10)
    out.push({
      date,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m - 1,
      trained: trainedOn(workouts, date),
      dayId: schedule[d.getUTCDay()] ?? null,
      today: date === today,
      future: date > today,
    })
  }
  return out
}

export function shiftMonth(anchor: string, by: number): string {
  const [y, m] = anchor.slice(0, 7).split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 10)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(anchor: string): string {
  const [y, m] = anchor.slice(0, 7).split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
