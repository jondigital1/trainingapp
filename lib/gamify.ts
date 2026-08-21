import { groupsOf, MUSCLE_GROUPS } from './exercises'
import { shiftDays, weekStart } from './week'
import { happened, isEmptySet } from './format'
import type { Exercise, Goal, SetEntry, SetType, Workout } from './types'

// Epley. Lets a set of 80 x 9 register as progress over 80 x 8 without anyone
// having to load the bar heavier, which is how progress usually actually looks.
export function e1rm(set: SetEntry): number | null {
  if (set.w == null || set.r == null || set.r < 1) return null
  return set.w * (1 + set.r / 30)
}

export type PrKind = 'load' | 'reps' | 'e1rm' | 'time' | 'volume'

export const PR_LABEL: Record<PrKind, string> = {
  load: 'Heaviest',
  reps: 'Most reps',
  e1rm: 'Best estimated max',
  time: 'Longest',
  volume: 'Best session',
}

// The bar a set has to clear, taken from every earlier session of the same
// movement. Session volume sits alongside because it is the honest measure of
// a day where nothing single was a record.
export interface Bests {
  load: number
  reps: number
  e1rm: number
  time: number
  volume: number
  seen: boolean
}

export const NO_BESTS: Bests = { load: 0, reps: 0, e1rm: 0, time: 0, volume: 0, seen: false }

export function exerciseVolume(exercise: Exercise): number {
  let total = 0
  for (const s of exercise.sets) {
    if (s.w != null && s.r != null) total += s.w * s.r
  }
  return total
}

export function bestsFor(workouts: Workout[], name: string, exclude: string, upTo: string): Bests {
  const out: Bests = { ...NO_BESTS }
  for (const w of workouts) {
    if (w.id === exclude || w.date > upTo) continue
    for (const ex of w.exercises) {
      if (ex.name !== name) continue
      let counted = false
      for (const s of ex.sets) {
        if (isEmptySet(s, ex.type)) continue
        counted = true
        if (s.drop) continue
        if (s.w != null) out.load = Math.max(out.load, s.w)
        if (s.r != null) out.reps = Math.max(out.reps, s.r)
        if (s.t != null) out.time = Math.max(out.time, s.t)
        const est = e1rm(s)
        if (est != null) out.e1rm = Math.max(out.e1rm, est)
      }
      if (counted) {
        out.seen = true
        out.volume = Math.max(out.volume, exerciseVolume(ex))
      }
    }
  }
  return out
}

// A single ground out at RPE 10 is not the point when the goal is muscle, so
// load and estimated max records need at least three reps behind them.
function countsAsPr(set: SetEntry, goal: Goal): boolean {
  if (goal === 'strength') return true
  return (set.r ?? 0) >= 3
}

// The records this set just broke, best first. Nothing on a first outing: you
// cannot beat a movement you have never done.
export function prsFor(set: SetEntry, type: SetType, bests: Bests, goal: Goal): PrKind[] {
  if (!bests.seen || isEmptySet(set, type) || set.drop) return []
  const out: PrKind[] = []

  if (type === 'W' && countsAsPr(set, goal)) {
    const est = e1rm(set)
    if (est != null && est > bests.e1rm + 0.01) out.push('e1rm')
    if (set.w != null && set.w > bests.load) out.push('load')
    if (set.w != null && set.w >= bests.load && (set.r ?? 0) > bests.reps) out.push('reps')
  }

  if (type === 'R' && (set.r ?? 0) > bests.reps) out.push('reps')
  if ((type === 'T' || type === 'C') && (set.t ?? 0) > bests.time) out.push('time')
  if (type === 'WD' && set.w != null && set.w > bests.load) out.push('load')

  return out
}

export function volumePr(exercise: Exercise, bests: Bests): boolean {
  if (!bests.seen || exercise.type !== 'W') return false
  const v = exerciseVolume(exercise)
  return v > 0 && v > bests.volume
}

// Beat the ghost: this set against the same numbered set last time out. The
// comparison the ghost line above the inputs already invites.
export function beatsLast(set: SetEntry, previous: SetEntry | undefined, type: SetType): boolean {
  if (!previous || isEmptySet(set, type)) return false
  switch (type) {
    case 'W': {
      const now = e1rm(set)
      const before = e1rm(previous)
      return now != null && before != null && now > before + 0.01
    }
    case 'R':
      return (set.r ?? 0) > (previous.r ?? 0)
    case 'T':
    case 'C':
      return (set.t ?? 0) > (previous.t ?? 0)
    case 'WD':
      return (set.w ?? 0) * (set.d ?? 0) > (previous.w ?? 0) * (previous.d ?? 0)
    default:
      return false
  }
}

// Monday as the start of the week, because that is how a training week reads.
export { weekStart }

export interface GroupVolume {
  group: string
  sets: number
}

// Sets per muscle group this week against the 10 set target. The only stat here
// that tells you what to do differently rather than how you did.
export function weeklyCoverage(workouts: Workout[], today: string): GroupVolume[] {
  const start = weekStart(today)
  const counts = new Map<string, number>()
  for (const w of workouts) {
    if (w.date < start || w.date > today) continue
    for (const ex of w.exercises) {
      // Every group the movement trains, not just the one it is filed under.
      // A library movement names one. A movement of your own can name several,
      // and a clean and press that credited only shoulders was undercounting
      // the back and the quads that did the work.
      const groups = groupsOf(ex.name)
      if (!groups.length) continue
      const done = ex.sets.filter((s) => !isEmptySet(s, ex.type)).length
      if (!done) continue
      for (const group of groups) counts.set(group, (counts.get(group) ?? 0) + done)
    }
  }
  return MUSCLE_GROUPS.map((group) => ({ group, sets: counts.get(group) ?? 0 })).filter(
    (g) => g.sets > 0 || ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Core'].includes(g.group),
  )
}

export const COVERAGE_TARGET = 10

export interface DayDot {
  date: string
  trained: boolean
}

// Twenty eight days, one dot each. No number to lose, no rest day punished.
export function trainingGrid(workouts: Workout[], today: string, days = 28): DayDot[] {
  const trained = new Set(
    workouts
      .filter(happened)
      .map((w) => w.date),
  )
  const out: DayDot[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = shiftDays(today, -i)
    out.push({ date: iso, trained: trained.has(iso) })
  }
  return out
}

// Weeks where the days you said you would train actually happened. Rest days
// cost nothing, which is the whole point of counting weeks rather than days.
// Which days you actually trained, filed by the week they fall in. This was
// written out twice, once for the streak you are on and once for the longest
// one, which put the rule for what counts as a session in two places where it
// could have come to mean two things.
function trainedWeeks(workouts: Workout[]): Map<string, Set<string>> {
  const trained = new Map<string, Set<string>>()
  for (const w of workouts) {
    if (!happened(w)) continue
    const key = weekStart(w.date)
    if (!trained.has(key)) trained.set(key, new Set())
    trained.get(key)!.add(w.date)
  }
  return trained
}

export function weeklyStreak(workouts: Workout[], today: string, target: number): number {
  const trained = trainedWeeks(workouts)

  let streak = 0
  let cursor = weekStart(today)
  // The current week only counts once it is met, it never breaks the streak.
  if ((trained.get(cursor)?.size ?? 0) >= target) streak += 1
  cursor = shiftDays(cursor, -7)

  while ((trained.get(cursor)?.size ?? 0) >= target) {
    streak += 1
    cursor = shiftDays(cursor, -7)
  }
  return streak
}

export interface Totals {
  sessions: number
  sets: number
  reps: number
  volume: number
  seconds: number
}

// Everything ever written down. The one set of numbers that only goes up, which
// is what makes them worth showing on a bad week.
export function lifetime(workouts: Workout[]): Totals {
  const out: Totals = { sessions: 0, sets: 0, reps: 0, volume: 0, seconds: 0 }
  for (const w of workouts) {
    let counted = false
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (isEmptySet(s, ex.type)) continue
        counted = true
        out.sets += 1
        if (s.r != null) out.reps += s.r
        if (s.w != null && s.r != null) out.volume += s.w * s.r
        if (s.t != null) out.seconds += s.t
      }
    }
    if (counted) out.sessions += 1
  }
  return out
}

export const LADDERS = {
  volume: [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000],
  sessions: [10, 25, 50, 100, 200, 365, 500, 1000],
  sets: [250, 500, 1000, 2500, 5000, 10_000, 25_000],
}

export interface Landmark {
  next: number | null
  pct: number
}

// The next round number worth chasing, and how close it is.
export function nextLandmark(value: number, ladder: number[]): Landmark {
  const next = ladder.find((n) => n > value) ?? null
  if (next == null) return { next: null, pct: 100 }
  const previous = [...ladder].reverse().find((n) => n <= value) ?? 0
  const span = next - previous
  return { next, pct: Math.max(0, Math.min(100, ((value - previous) / span) * 100)) }
}

// The longest run of weeks that ever met the target, which is a different
// number from the streak you are on and the one worth keeping. A bad month
// does not delete the winter you strung twelve weeks together.
export function longestStreak(workouts: Workout[], target: number): number {
  const met = new Set<string>()
  const trained = trainedWeeks(workouts)
  for (const [week, days] of trained) if (days.size >= target) met.add(week)
  if (!met.size) return 0

  const weeks = [...met].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < weeks.length; i += 1) {
    if (shiftDays(weeks[i - 1], 7) === weeks[i]) run += 1
    else run = 1
    if (run > best) best = run
  }
  return best
}

export interface BestLift {
  name: string
  weight: number
  reps: number
  date: string
  sessions: number
}

// The heaviest set ever put up on each weighted movement, with the day it
// happened. Drops are skipped: near failure at a lighter load is a technique,
// not a best. Ranked by how often the movement is trained, so the list opens
// with the lifts this person actually cares about rather than the one time
// they tried a machine in a hotel gym.
export function bestLifts(workouts: Workout[], limit = 5): BestLift[] {
  const best = new Map<string, BestLift>()
  const seen = new Map<string, Set<string>>()

  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.type !== 'W') continue
      for (const s of ex.sets) {
        if (s.drop || s.w == null || s.r == null) continue
        if (!seen.has(ex.name)) seen.set(ex.name, new Set())
        seen.get(ex.name)!.add(w.date)
        const held = best.get(ex.name)
        if (!held || s.w > held.weight || (s.w === held.weight && s.r > held.reps)) {
          best.set(ex.name, { name: ex.name, weight: s.w, reps: s.r, date: w.date, sessions: 0 })
        }
      }
    }
  }

  return [...best.values()]
    .map((b) => ({ ...b, sessions: seen.get(b.name)?.size ?? 0 }))
    .sort((a, b) => b.sessions - a.sessions || b.weight - a.weight || a.name.localeCompare(b.name))
    .slice(0, limit)
}
