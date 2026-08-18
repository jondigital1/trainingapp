import type { Goal, SetEntry, SetType } from './types'

export interface GoalSpec {
  id: Goal
  label: string
  reps: [number, number]
}

export const GOALS: GoalSpec[] = [
  { id: 'strength', label: 'Strength', reps: [3, 6] },
  { id: 'muscle', label: 'Muscle', reps: [6, 12] },
  { id: 'endurance', label: 'Endurance', reps: [12, 20] },
]

export function goalSpec(goal: Goal): GoalSpec {
  return GOALS.find((g) => g.id === goal) ?? GOALS[1]
}

// Gym plates: 2.5 lb steps under 100, 5 lb steps at 100 and above.
export function roundLoad(w: number): number {
  const step = w < 100 ? 2.5 : 5
  return Math.max(step, Math.round(w / step) * step)
}

const UP = 1.05
const DOWN = 0.925


// Reads the last set of an exercise and says what to do next time. Double
// progression: climb the rep range at a fixed load, and when the top of the
// range comes up, add weight and start again at the bottom. Returns null when
// the set is inside target and there is nothing worth saying.
//
// This used to read RPE. It no longer does, because a number guessed between
// sets while out of breath was never the honest input it looked like, and the
// reps you actually did are.
//
// The band is the rep window to judge against. When the plan has prescribed one
// for this movement it is passed in, so the coach argues with the number that
// is printed on the session rather than a wider goal-wide range that the person
// was never shown.
export function coach(
  set: SetEntry | undefined,
  type: SetType,
  goal: Goal,
  band?: [number, number],
): string | null {
  if (!set) return null
  if (type !== 'W' && type !== 'R') return null

  const [repLo, repHi] = band ?? goalSpec(goal).reps
  const reps = set.r ?? null
  const weight = set.w ?? null
  if (reps == null) return null

  if (reps >= repHi) {
    if (type === 'W' && weight) {
      return `${reps} reps is the top of the range. Try ${fmt(roundLoad(weight * UP))} for ${repLo}`
    }
    return `${reps} reps is the top of the range. Make it harder`
  }
  if (reps < repLo) {
    if (type === 'W' && weight) return `${reps} reps is under ${repLo}. Try ${fmt(roundLoad(weight * DOWN))}`
    return `${reps} reps is under ${repLo}`
  }
  // Inside the range: the next step is one more rep at the same load.
  if (type === 'W' && weight) return `Same load, go for ${reps + 1}`
  return `Go for ${reps + 1}`
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}
