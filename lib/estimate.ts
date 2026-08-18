import { restFor } from './rest'
import type { CustomWorkoutItem, Goal } from './types'

// Roughly how long a session will take, so a workout can say what it costs you
// before you commit to it rather than after.
//
// A set is about forty seconds of actual work, which is close enough across
// eight reps of most things, and then you rest. A superset rests once at the
// end of the group rather than after each movement, which is the whole point
// of one, so the group is counted as a unit.
//
// Each movement also costs you finding the machine, loading it and setting the
// seat, which is not nothing across eight of them.
//
// It is an estimate and reads like one: rounded to five minutes, because a
// session that says 47 minutes is claiming to know something it does not.
const WORK_SECONDS = 40
const SETUP_SECONDS = 45

export function estimateSeconds(items: CustomWorkoutItem[], goal: Goal, setsPer = 3): number {
  if (!items.length) return 0

  // Consecutive items sharing a tag run together. Anything untagged is its own
  // group of one, which keeps the arithmetic identical for both.
  const groups: CustomWorkoutItem[][] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (item.superset && last?.[0]?.superset === item.superset) last.push(item)
    else groups.push([item])
  }

  let total = 0
  for (const group of groups) {
    const work = group.length * WORK_SECONDS
    const rest = Math.max(...group.map((i) => restFor(i.name, i.type, goal)))
    total += setsPer * (work + rest) + group.length * SETUP_SECONDS
  }
  // The last rest of the session is one you do not take.
  const lastRest = Math.max(...groups[groups.length - 1].map((i) => restFor(i.name, i.type, goal)))
  return Math.max(0, total - lastRest)
}

export function fmtEstimate(seconds: number): string | null {
  if (seconds <= 0) return null
  const minutes = Math.max(5, Math.round(seconds / 60 / 5) * 5)
  if (minutes < 60) return `about ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `about ${h}h` : `about ${h}h ${m}m`
}
