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

// What a given date asks of you: the one off move if there is one, otherwise
// the weekly pattern. Every screen that draws a day goes through here, so the
// card, the week strip and the list can never disagree about what Thursday
// holds.
export function dayIdFor(profile: Profile, iso: string): string | null {
  const moved = profile.moves?.[iso]
  if (moved !== undefined) return moved || null
  return scheduleOf(profile)[weekdayOf(iso)] ?? null
}

// What today asks of you, or null on a rest day and when nothing is scheduled.
export function todaysDayId(profile: Profile, today: string): string | null {
  return dayIdFor(profile, today)
}

// Trading what two dates hold. Both directions at once, so moving leg day onto
// Thursday puts Thursday's session back on the day leg day came from rather
// than quietly deleting it, and moving onto a rest day leaves a rest day
// behind rather than a duplicate.
export function swapDays(profile: Profile, a: string, b: string, today: string): Record<string, string> {
  const moves = { ...(profile.moves ?? {}) }
  const first = dayIdFor(profile, a)
  const second = dayIdFor(profile, b)
  moves[a] = second ?? ''
  moves[b] = first ?? ''

  // A move that puts a date back on its pattern is not a move, so it stops
  // being stored: the map holds exceptions, and an exception that matches the
  // rule is just the rule.
  for (const date of [a, b]) {
    if (moves[date] === (scheduleOf(profile)[weekdayOf(date)] ?? '')) delete moves[date]
  }

  // Yesterday's exceptions are history the pattern has already moved past, so
  // they are dropped rather than accumulating in the profile forever.
  for (const date of Object.keys(moves)) if (date < today) delete moves[date]
  return moves
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
  const out: UpcomingDay[] = []
  for (let i = 0; i < horizon && out.length < count; i += 1) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const dayId = dayIdFor(profile, iso)
    if (dayId) out.push({ date: iso, dayId })
  }
  return out
}

// Every date in a stretch ahead, rest days included. The upcoming list only
// knows about days that hold something, but somebody moving a session wants
// Wednesday offered even though Wednesday is currently empty: an empty day is
// the best place to put a session, not the one place you cannot.
export function datesAhead(today: string, days: number): string[] {
  const out: string[] = []
  for (let i = 0; i < days; i += 1) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

// How far apart two dates are, in days.
export function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}
