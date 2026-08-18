import { restTier, type RestTier } from './rest'
import type { Goal, SetType } from './types'

// What the plan asks you for on a movement: how many sets, and the rep window
// to keep them in.
//
// A trainer writing a program by hand puts a number beside every line. This
// does the same thing without a table of 190 hand written entries, because a
// hand written table is 190 chances to disagree with itself and it would
// ignore everything the person told the questionnaire. Two things decide it:
// the goal they picked, which sets the rep window, and how much the movement
// costs them, which is already worked out for the rest timer.
//
// The rep windows are the ordinary ones. Strength lives low and heavy on the
// movements that can carry it, muscle work sits in the middle, endurance runs
// long. The set counts fall as the movement gets cheaper, because five sets of
// cable pushdowns is not five sets of anything, and rise on the lifts worth
// spending the session on.
export interface Prescription {
  sets: number
  reps: [number, number]
}

const TABLE: Record<Goal, Record<RestTier, Prescription>> = {
  strength: {
    heavy: { sets: 5, reps: [3, 5] },
    compound: { sets: 4, reps: [5, 8] },
    isolation: { sets: 3, reps: [8, 12] },
    cable: { sets: 3, reps: [10, 15] },
    small: { sets: 3, reps: [12, 20] },
  },
  muscle: {
    heavy: { sets: 4, reps: [5, 8] },
    compound: { sets: 3, reps: [8, 12] },
    isolation: { sets: 3, reps: [10, 15] },
    cable: { sets: 3, reps: [12, 15] },
    small: { sets: 3, reps: [15, 20] },
  },
  endurance: {
    heavy: { sets: 3, reps: [12, 15] },
    compound: { sets: 3, reps: [12, 20] },
    isolation: { sets: 3, reps: [15, 20] },
    cable: { sets: 3, reps: [15, 20] },
    small: { sets: 3, reps: [20, 30] },
  },
}

// Timed and weight-for-distance work is not counted in reps, so it gets no
// window and no coach line. The clock is the target.
export function prescribe(name: string, type: SetType, goal: Goal, lighter = false): Prescription | null {
  if (type !== 'W' && type !== 'R') return null
  const base = TABLE[goal][restTier(name, type)]
  // The lighter plan is the same work with a set taken off it, never fewer
  // reps: somebody easing back in still needs the movement to be worth doing.
  return lighter ? { sets: Math.max(2, base.sets - 1), reps: base.reps } : base
}

// How many rows to lay out when a session starts. Timed work still gets one.
export function prescribedSets(name: string, type: SetType, goal: Goal, lighter = false): number {
  return prescribe(name, type, goal, lighter)?.sets ?? 1
}

export function fmtPrescription(p: Prescription | null): string | null {
  if (!p) return null
  return `${p.sets} × ${p.reps[0]} to ${p.reps[1]}`
}

// The plan already decided whether this person is on the lighter version, and
// says so in one string. Reading it here keeps that one decision in one place.
export function isLighter(planSets: string | undefined): boolean {
  return planSets === '2 to 3'
}
