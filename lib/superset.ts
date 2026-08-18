import { uid } from './format'
import { restFor } from './rest'
import type { Exercise, Goal } from './types'

export interface Run {
  superset: string | null
  exercises: Exercise[]
  index: number
}

// Consecutive exercises sharing a tag are one superset. Their order in the list
// is the order they run in, so nothing beyond the tag needs storing. A tag that
// reappears after a gap is a separate superset, because that is what the order
// on screen says it is.
export function groupRuns(exercises: Exercise[]): Run[] {
  const runs: Run[] = []
  let supersets = 0
  for (const exercise of exercises) {
    const previous = runs[runs.length - 1]
    if (previous && exercise.superset && previous.superset === exercise.superset) {
      previous.exercises.push(exercise)
      continue
    }
    runs.push({
      superset: exercise.superset ?? null,
      exercises: [exercise],
      index: exercise.superset ? supersets++ : -1,
    })
  }
  return runs
}

// A run of one is not a superset, whatever it is tagged with.
export function isSuperset(run: Run): boolean {
  return !!run.superset && run.exercises.length > 1
}

// One clock for the group, set by whichever movement in it asks for the most.
export function supersetRest(run: Run, goal: Goal, factor = 1): number {
  return Math.max(...run.exercises.map((e) => restFor(e.name, e.type, goal, factor)))
}

export function supersetLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

// Superset two movements that need not be next to each other. A superset is
// consecutive exercises sharing a tag, so pairing something from further down
// the session has to bring it up: the partner moves to sit directly after the
// anchor's run, which is where it was going to have to go anyway.
//
// If either one is already in a group, that group's tag wins and the other
// joins it, so a third movement is the same single tap as the second.
export function linkWith(exercises: Exercise[], anchorId: string, partnerId: string): Exercise[] {
  if (anchorId === partnerId) return exercises
  const anchor = exercises.find((e) => e.id === anchorId)
  const partner = exercises.find((e) => e.id === partnerId)
  if (!anchor || !partner) return exercises

  const tag = anchor.superset ?? partner.superset ?? uid()
  const tagged = exercises.map((e) =>
    e.id === anchorId || e.id === partnerId ? { ...e, superset: tag } : e,
  )

  const moving = tagged.find((e) => e.id === partnerId)!
  const rest = tagged.filter((e) => e.id !== partnerId)

  // Insert after the last exercise of the run the anchor sits in, so adding a
  // third movement lands at the end of the group rather than in the middle.
  let at = rest.findIndex((e) => e.id === anchorId)
  while (at + 1 < rest.length && rest[at + 1].superset === tag) at += 1

  return [...rest.slice(0, at + 1), moving, ...rest.slice(at + 1)]
}

// Everything in the session that this exercise could be supersetted with:
// anything else that is not already in the same group.
export function partnersFor(exercises: Exercise[], anchorId: string): Exercise[] {
  const anchor = exercises.find((e) => e.id === anchorId)
  if (!anchor) return []
  return exercises.filter(
    (e) => e.id !== anchorId && !(anchor.superset && e.superset === anchor.superset),
  )
}
