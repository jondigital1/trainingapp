import type { Workout } from './types'

// One question, once, when the session is over. It replaced per-set RPE
// because a number taken between sets while out of breath is a guess, and ten
// guesses do not average into a fact. How the whole thing felt, afterwards, is
// a question anybody can answer honestly.
export const INTENSITY: { score: number; label: string }[] = [
  { score: 1, label: 'Easy peasy' },
  { score: 2, label: 'Barely warmed up' },
  { score: 3, label: 'Comfortable' },
  { score: 4, label: 'Working, but talking' },
  { score: 5, label: 'Honest day at the office' },
  { score: 6, label: 'That was a session' },
  { score: 7, label: 'Properly hard' },
  { score: 8, label: 'Nothing left in the tank' },
  { score: 9, label: 'Crawling to the car' },
  { score: 10, label: 'What was I thinking?' },
]

export function intensityLabel(score: number | null | undefined): string | null {
  if (score == null) return null
  return INTENSITY.find((i) => i.score === Math.round(score))?.label ?? null
}

// Seconds between the start and the end, or null when either is missing.
// Negative spans come back null too: a clock that ran backwards is a bug
// somewhere, not a workout that took minus ten minutes.
export function durationOf(workout: Workout): number | null {
  if (!workout.startedAt || !workout.endedAt) return null
  const start = new Date(workout.startedAt).getTime()
  const end = new Date(workout.endedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const seconds = Math.round((end - start) / 1000)
  return seconds > 0 ? seconds : null
}

// "1h 07m" or "48 min". Hours and minutes, never seconds: nobody cares that a
// session took 47 minutes and 12 seconds.
export function fmtDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  const total = Math.round(seconds / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// A session is running if it started and has not been ended. That is what puts
// the End button on screen and keeps the clock going.
export function isRunning(workout: Workout): boolean {
  return !!workout.startedAt && !workout.endedAt
}

// Worth asking for a score once the session is over and there is something in
// it. An empty workout that got ended is not a session to rate.
export function wantsScore(workout: Workout): boolean {
  return !!workout.endedAt && workout.intensity == null && workout.exercises.length > 0
}

export function averageIntensity(workouts: Workout[]): number | null {
  const scores = workouts.map((w) => w.intensity).filter((n): n is number => n != null)
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}
