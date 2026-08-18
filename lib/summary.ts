import { isEmptySet, workoutVolume } from './format'
import {
  LADDERS,
  PR_LABEL,
  beatsLast,
  bestsFor,
  lifetime,
  prsFor,
  volumePr,
  weeklyStreak,
  type PrKind,
} from './gamify'
import { durationOf } from './session'
import type { Goal, Workout } from './types'

// What to say to somebody who has just finished.
//
// The rule the whole thing is built on: praise has to be earned by something
// that happened, or it is worth nothing. An app that says "great work" after
// every session is saying nothing after every session, and people learn to
// stop reading it within a week. So the headline is chosen by what is actually
// true of this session, in order of how much it deserves saying, and if the
// honest answer is "you turned up and did the work", that is what it says.

export interface RecordLine {
  name: string
  // The records this movement broke, best first, already worded.
  kinds: PrKind[]
  bestSession: boolean
}

export interface Milestone {
  label: string
  value: number
}

export interface Summary {
  headline: string
  line: string
  duration: number | null
  volume: number
  sets: number
  exercises: number
  intensity: number | null
  records: RecordLine[]
  milestones: Milestone[]
  // Weeks in a row that met the target, counting this one.
  streak: number
  // Sets that beat the same numbered set last time out.
  beat: number
  first: boolean
}

function countSets(workout: Workout): number {
  let n = 0
  for (const e of workout.exercises) for (const s of e.sets) if (!isEmptySet(s, e.type)) n += 1
  return n
}

function logged(workout: Workout): boolean {
  return workout.exercises.some((e) => e.sets.some((s) => !isEmptySet(s, e.type)))
}

// Crossing a round number is worth a line, and only on the session that
// crossed it. Measured as before and after, so a rung is announced once in a
// lifetime rather than every time the total stays above it.
function crossed(all: Workout[], workout: Workout): Milestone[] {
  const after = lifetime(all)
  const before = lifetime(all.filter((w) => w.id !== workout.id))
  const out: Milestone[] = []
  const check = (ladder: number[], b: number, a: number, word: (n: number) => string) => {
    for (const rung of ladder) {
      if (b < rung && a >= rung) out.push({ label: word(rung), value: rung })
    }
  }
  check(LADDERS.sessions, before.sessions, after.sessions, (n) => `${n} sessions logged`)
  check(LADDERS.sets, before.sets, after.sets, (n) => `${n.toLocaleString('en-US')} sets logged`)
  check(LADDERS.volume, before.volume, after.volume, (n) =>
    `${(n / 1000).toLocaleString('en-US')}k lb moved, all time`,
  )
  return out
}

export function summarise(
  workouts: Workout[],
  workout: Workout,
  goal: Goal,
  weeklyTarget: number,
): Summary {
  const records: RecordLine[] = []
  let beat = 0

  for (const exercise of workout.exercises) {
    const bests = bestsFor(workouts, exercise.name, workout.id, workout.date)
    const kinds = new Set<PrKind>()
    // The same movement last time out, for the set by set comparison the rows
    // already make on screen.
    const previous = lastTime(workouts, exercise.name, workout)
    const previousSets = (previous?.sets ?? []).filter((s) => !s.drop)
    let i = -1
    for (const set of exercise.sets) {
      if (set.drop) continue
      i += 1
      for (const kind of prsFor(set, exercise.type, bests, goal)) kinds.add(kind)
      if (beatsLast(set, previousSets[i], exercise.type)) beat += 1
    }
    const bestSession = volumePr(exercise, bests)
    if (kinds.size || bestSession) {
      records.push({ name: exercise.name, kinds: order(kinds), bestSession })
    }
  }

  const milestones = crossed(workouts, workout)
  const streak = weeklyStreak(workouts, workout.date, weeklyTarget)
  const first = workouts.filter(logged).length <= 1
  const sets = countSets(workout)
  const volume = workoutVolume(workout)

  return {
    ...headline({ records, milestones, streak, beat, first, sets, volume }),
    duration: durationOf(workout),
    volume,
    sets,
    exercises: workout.exercises.filter((e) => e.sets.some((s) => !isEmptySet(s, e.type))).length,
    intensity: workout.intensity ?? null,
    records,
    milestones,
    streak,
    beat,
    first,
  }
}

// Most recent session before this one that contains the movement.
function lastTime(workouts: Workout[], name: string, workout: Workout) {
  const earlier = workouts
    .filter((w) => w.id !== workout.id && w.date <= workout.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const w of earlier) {
    const found = w.exercises.find((e) => e.name === name && e.sets.some((s) => !isEmptySet(s, e.type)))
    if (found) return found
  }
  return null
}

const ORDER: PrKind[] = ['e1rm', 'load', 'reps', 'time', 'volume']

function order(kinds: Set<PrKind>): PrKind[] {
  return ORDER.filter((k) => kinds.has(k))
}

interface Facts {
  records: RecordLine[]
  milestones: Milestone[]
  streak: number
  beat: number
  first: boolean
  sets: number
  volume: number
}

// In order of what deserves saying. A record beats a milestone beats a streak
// beats being up on last time, and the floor is the truth: it is done and it
// is written down.
function headline(f: Facts): { headline: string; line: string } {
  if (f.sets === 0) {
    return {
      headline: 'Nothing logged',
      line: 'The session is closed but no sets went in it. Nothing here counts toward anything.',
    }
  }

  if (f.records.length) {
    const names = f.records.map((r) => r.name)
    const what = f.records.length === 1 ? 'A record' : `${f.records.length} records`
    return {
      headline: f.records.length === 1 ? 'New record' : 'New records',
      line: `${what} in one session. ${list(names)} went past anything you have done before.`,
    }
  }

  if (f.milestones.length) {
    return { headline: f.milestones[0].label, line: 'That is a number that only ever goes up.' }
  }

  if (f.first) {
    return {
      headline: 'First one in the book',
      line: 'Every comparison this app makes from here on has something to compare against. That started now.',
    }
  }

  if (f.streak >= 2) {
    return {
      headline: `${f.streak} weeks in a row`,
      line: 'You have hit your target week after week. That is the part that actually builds anything.',
    }
  }

  if (f.beat > 0) {
    return {
      headline: 'Up on last time',
      line:
        f.beat === 1
          ? 'One set went better than the same set last time out. That is what progress looks like up close.'
          : `${f.beat} sets went better than the same sets last time out. That is what progress looks like up close.`,
    }
  }

  return {
    headline: 'Done and written down',
    line: 'No records, and nothing wrong with that. Most sessions are the ones that make the good ones possible.',
  }
}

function list(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function recordText(record: RecordLine): string {
  const bits = record.kinds.map((k) => PR_LABEL[k].toLowerCase())
  if (record.bestSession) bits.push('best session')
  return bits.join(', ')
}
