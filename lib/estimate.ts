import { restFor, restTier } from './rest'
import { prescribedSets } from './prescribe'
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

// Getting ready, which the estimate used to pretend was free. The app's own
// answer on warming up says a few minutes of easy movement and then two or
// three ramping sets of the first exercise, and then the number underneath it
// quoted a time that assumed none of that happened. A leg day is not forty
// nine minutes if you spend seven of them warming up first.
//
// Later movements for the same muscles need little or nothing, so only the
// first serious movement of the session carries ramp sets.
const WARMUP_SECONDS = 180
const RAMP_SECONDS = 25 + 45
const RAMPS: Partial<Record<string, number>> = { heavy: 3, compound: 2 }

// How many sets each movement is actually going to take, which is not three.
// The app prescribes five for a heavy squat, four for a compound and three for
// a cable, and the estimate ignored all of it and assumed three of everything.
// So a leg day that lays out five sets of squats told you it would take forty
// nine minutes and then took over an hour, and the trim that fits a session
// into the time you have was working from the same wrong number.
//
// A caller can still pass a flat count, which is what a workout somebody built
// by hand uses, since nothing prescribed it.
export function estimateSeconds(
  items: CustomWorkoutItem[],
  goal: Goal,
  setsPer?: number,
): number {
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
    // A superset runs as one, so it takes as many rounds as its longest
    // member asks for rather than the sum of them.
    const sets = setsPer ?? Math.max(...group.map((i) => prescribedSets(i.name, i.type, goal)))
    const work = group.length * WORK_SECONDS
    const rest = Math.max(...group.map((i) => restFor(i.name, i.type, goal)))
    total += sets * (work + rest) + group.length * SETUP_SECONDS
  }
  // The last rest of the session is one you do not take.
  const lastRest = Math.max(...groups[groups.length - 1].map((i) => restFor(i.name, i.type, goal)))

  // Easy movement to start, plus ramp sets on the first thing worth ramping
  // into. Cardio only sessions get neither: the first ten minutes of an easy
  // run is the warm up.
  const lifting = items.filter((i) => i.type !== 'C')
  const first = lifting[0]
  const ramps = first ? (RAMPS[restTier(first.name, first.type)] ?? 0) : 0
  const warmup = lifting.length ? WARMUP_SECONDS + ramps * RAMP_SECONDS : 0

  return Math.max(0, total - lastRest + warmup)
}

export function fmtEstimate(seconds: number): string | null {
  if (seconds <= 0) return null
  const minutes = Math.max(5, Math.round(seconds / 60 / 5) * 5)
  if (minutes < 60) return `about ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `about ${h}h` : `about ${h}h ${m}m`
}
