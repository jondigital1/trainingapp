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
