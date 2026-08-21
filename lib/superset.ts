import { uid } from './format'
import { restFor } from './rest'
import type { Exercise, Goal } from './types'

export interface Run<T = Exercise> {
  superset: string | null
  exercises: T[]
  index: number
}

// Consecutive exercises sharing a tag are one superset. Their order in the list
// is the order they run in, so nothing beyond the tag needs storing. A tag that
// reappears after a gap is a separate superset, because that is what the order
// on screen says it is.
export function groupRuns<T extends Linkable>(exercises: T[]): Run<T>[] {
  const runs: Run<T>[] = []
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
export function isSuperset(run: Run<Linkable>): boolean {
  return !!run.superset && run.exercises.length > 1
}

// One clock for the group, set by whichever movement in it asks for the most.
export function supersetRest(run: Run<Exercise>, goal: Goal, factor = 1): number {
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

// Anything that runs in a session and can carry a superset tag. The live
// session holds Exercise, the builder holds a name and a type, and the seam
// between two of them behaves the same either way, so the joining lives here
// once rather than twice.
export interface Linkable {
  superset?: string | null
}

// The stretch of neighbours around `index` that run as one group. Untagged, or
// tagged and alone, is a run of itself.
//
// Read off positions rather than off the tag, because a tag that reappears
// after a gap is a different superset: that is what the order on screen says,
// and it is what groupRuns already believes.
function runAt<T extends Linkable>(items: T[], index: number): [number, number] {
  const tag = items[index]?.superset
  if (!tag) return [index, index]
  let start = index
  let end = index
  while (start > 0 && items[start - 1].superset === tag) start -= 1
  while (end + 1 < items.length && items[end + 1].superset === tag) end += 1
  return [start, end]
}

// Is the seam between `index` and the next one joined?
export function linkedAt<T extends Linkable>(items: T[], index: number): boolean {
  const a = items[index]
  const b = items[index + 1]
  return !!a && !!b && !!a.superset && a.superset === b.superset
}

// Join across one seam. Whatever runs the two sides belong to become one, so
// linking the seam under a pair makes it a trio, and linking a pair to a pair
// makes a four. Nothing moves: the seam is already where these two meet.
export function linkAt<T extends Linkable>(items: T[], index: number): T[] {
  if (index < 0 || index + 1 >= items.length) return items
  if (linkedAt(items, index)) return items
  const [start] = runAt(items, index)
  const [, end] = runAt(items, index + 1)
  const tag = items[start].superset ?? items[index + 1].superset ?? uid()
  return items.map((item, i) => (i >= start && i <= end ? { ...item, superset: tag } : item))
}

// Break one seam and leave both sides standing. A four splits into a pair and
// a pair, or into a single and a trio, rather than dissolving: taking one
// movement out of a group is what unlinking a whole group could never do.
//
// A side of one is not a superset, so it loses its tag entirely. The right
// hand side takes a new tag, because the two halves are now different groups
// and sharing a tag across a break is how two of them read as one again.
export function splitAt<T extends Linkable>(items: T[], index: number): T[] {
  if (!linkedAt(items, index)) return items
  const [start, end] = runAt(items, index)
  const fresh = uid()
  return items.map((item, i) => {
    if (i < start || i > end) return item
    if (i <= index) return index - start >= 1 ? item : { ...item, superset: null }
    return end - index >= 2 ? { ...item, superset: fresh } : { ...item, superset: null }
  })
}

// Every movement in one superset, and back again. The long way round is eight
// taps on a nine movement session, which is a fair thing to offer a shortcut
// for as long as it stays a shortcut and not the only way in.
export function linkAll<T extends Linkable>(items: T[]): T[] {
  if (items.length < 2) return items
  const tag = uid()
  return items.map((item) => ({ ...item, superset: tag }))
}

export function unlinkAll<T extends Linkable>(items: T[]): T[] {
  return items.map((item) => (item.superset ? { ...item, superset: null } : item))
}

// Anything at all runs with something else.
export function anyLinked<T extends Linkable>(items: T[]): boolean {
  return items.some((_, i) => linkedAt(items, i))
}

// A tag that no neighbour shares is not a superset any more, it is a leftover.
// Moving the last movement of a pair away from its partner, or deleting one of
// the two, leaves the other still carrying the tag: harmless to what runs, but
// it kept wearing the group's letter while standing on its own.
//
// Run after anything that reorders or removes, so the tags never disagree with
// what is on screen.
export function tidy<T extends Linkable>(items: T[]): T[] {
  return items.map((item, i) => {
    if (!item.superset) return item
    if (linkedAt(items, i - 1) || linkedAt(items, i)) return item
    return { ...item, superset: null }
  })
}
