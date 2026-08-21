import type { Profile } from './onboarding'
import { daysBetween, weekStart } from './week'
import type { Workout } from './types'

// A training block, six weeks long, replacing the three week wave that came
// before it. Three weeks is not long enough to be a block: by the time the
// body has adapted to the work the cycle has already restarted. Six is the
// short end of a real mesocycle, which is why it is the floor here.
//
// Five weeks of climbing effort, then a week that takes the foot off. The
// deload is the point of having a block at all: without it a program is just
// getting progressively harder until something gives.
export interface BlockWeek {
  index: number
  name: string
  // What to actually do this week, said as an instruction you could follow
  // standing at the rack. This was "3 in reserve", which is the right idea in
  // the wrong language: reps in reserve is a term you either already know or
  // are never told, and the card never told anybody.
  cue: string
  // The session score to aim at, on the same 1 to 10 dial the app asks for
  // when a workout ends.
  score: [number, number]
  note: string
}

export const BLOCK_WEEKS = 6

export const BLOCK: BlockWeek[] = [
  {
    index: 1,
    name: 'Groove',
    cue: 'Stop the last set with 3 reps left',
    score: [4, 6],
    note: 'Easy on purpose. This week finds the loads the next five build on, so there is nothing to prove in it.',
  },
  {
    index: 2,
    name: 'Build',
    cue: 'Stop the last set with 2 reps left',
    score: [5, 7],
    note: 'Same movements, slightly heavier or a rep more than last week.',
  },
  {
    index: 3,
    name: 'Build',
    cue: 'Stop the last set with 2 reps left',
    score: [6, 8],
    note: 'Add a rep, or the next weight up, wherever last week felt easy.',
  },
  {
    index: 4,
    name: 'Push',
    cue: 'Stop the last set with 1 rep left',
    score: [7, 9],
    note: 'The week the block has been building toward. Everything before the last set stays comfortable.',
  },
  {
    index: 5,
    name: 'Peak',
    cue: 'Take the last set to failure',
    score: [8, 10],
    note: 'The last set of each movement goes until the weight stops moving. The sets before it stay honest.',
  },
  {
    index: 6,
    name: 'Deload',
    cue: 'Half the sets, nothing near failure',
    score: [2, 4],
    note: 'Same weights, half as many sets. This is the week the last five turn into progress.',
  },
]

// How many weeks since the block began. Negative means the start is in the
// future, which is treated as week one rather than as an error.
function weeksSince(start: string, today: string): number {
  const weeks = Math.floor(daysBetween(weekStart(start), weekStart(today)) / 7)
  return weeks < 0 ? 0 : weeks
}

// Which week of the block today falls in. Null when blocks are off.
export function blockWeek(profile: Profile, today: string): BlockWeek | null {
  if (!profile.block) return null
  return BLOCK[weeksSince(profile.blockStart ?? today, today) % BLOCK_WEEKS]
}

// Which block you are on, counting from one. Useful for saying "block 3, week
// 2" rather than only ever naming the week.
export function blockNumber(profile: Profile, today: string): number | null {
  if (!profile.block) return null
  return Math.floor(weeksSince(profile.blockStart ?? today, today) / BLOCK_WEEKS) + 1
}

// How much the week moves the rest timer. A peak week is near max work and
// wants the time; a deload is half the sets at the same loads and does not.
// Off a block entirely, nothing moves.
export function effortFactor(week: BlockWeek | null | undefined): number {
  if (!week) return 1
  switch (week.name) {
    case 'Groove':
      return 0.85
    case 'Push':
      return 1.1
    case 'Peak':
      return 1.25
    case 'Deload':
      return 0.75
    default:
      return 1
  }
}

export interface BlockRead {
  scored: number
  average: number | null
  verdict: 'on' | 'under' | 'over' | null
}

// What the session scores written down this week say about whether the week
// was run as intended. One number per session rather than one per set, which
// is the whole reason this is answerable.
export function readBlock(workouts: Workout[], week: BlockWeek, today: string): BlockRead {
  const start = weekStart(today)
  const scores: number[] = []
  for (const w of workouts) {
    if (w.date < start || w.date > today) continue
    if (w.intensity != null) scores.push(w.intensity)
  }
  if (!scores.length) return { scored: 0, average: null, verdict: null }
  const average = scores.reduce((a, b) => a + b, 0) / scores.length
  const [lo, hi] = week.score
  return {
    scored: scores.length,
    average: Math.round(average * 10) / 10,
    verdict: average < lo ? 'under' : average > hi ? 'over' : 'on',
  }
}
