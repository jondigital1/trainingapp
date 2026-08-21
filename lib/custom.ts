import type { CustomExercise } from './types'
import type { RestTier } from './rest'

// A custom exercise is not in the movement library, so every lookup that goes
// by name misses it: the muscle group behind the weekly coverage count, the
// rest tier, the joint substitutions. This is the one place that knows about
// them, and the library lookups consult it first.
//
// A module level map rather than something threaded through every call site,
// because the alternative is passing a dictionary into a dozen pure functions
// that only ever need it for the handful of movements somebody typed in
// themselves. App registers the list when data loads, and once more whenever
// it changes.
let registry = new Map<string, CustomExercise>()

export function registerCustoms(list: CustomExercise[]): void {
  registry = new Map(list.map((c) => [c.name.trim().toLowerCase(), c]))
}

export function customFor(name: string): CustomExercise | undefined {
  return registry.get(name.trim().toLowerCase())
}

// One definition of when two movement names are the same one, used by every
// side of the duplicate guard.
//
// It was two: the check for a name already spoken for ignored case, and the
// exemption for the movement you were renaming did not. So correcting a
// capital letter collided with itself, which made it the one rename the app
// refused to save. Two comparisons of the same thing is how the two of them
// come to disagree.
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function customGroups(name: string): string[] {
  return customFor(name)?.groups ?? []
}

export function customTier(name: string): RestTier | null {
  return customFor(name)?.tier ?? null
}

// Only for the checks, so one test cannot leak its exercises into the next.
export function resetCustoms(): void {
  registry = new Map()
}
