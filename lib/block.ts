import { weekStart } from './schedule'
import type { Profile } from './onboarding'
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
  rir: string
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
    rir: '3 in reserve',
    score: [4, 6],
    note: 'First week back on these movements. Find the loads, leave three in the tank, resist the urge to test yourself.',
  },
  {
    index: 2,
    name: 'Build',
    rir: '2 in reserve',
    score: [5, 7],
    note: 'Same movements, a little more. Two left on the last set of each one.',
  },
  {
    index: 3,
    name: 'Build',
    rir: '2 in reserve',
    score: [6, 8],
    note: 'Add a rep or a plate where last week felt easy. Still two in reserve.',
  },
  {
    index: 4,
    name: 'Push',
    rir: '1 in reserve',
    score: [7, 9],
    note: 'One left on the last set. This is the week the block was building toward.',
  },
  {
    index: 5,
    name: 'Peak',
    rir: 'last set to the end',
    score: [8, 10],
    note: 'Last set of each movement goes until it stops moving. Everything before it stays honest.',
  },
  {
    index: 6,
    name: 'Deload',
    rir: 'half the work',
    score: [2, 4],
    note: 'Half the sets, same loads, nothing near failure. This is the week the last five weeks turn into progress.',
  },
]

// Kept under its old name because a block week is still a week, and this is
// where the rest of the app reaches for one. It is Sunday now, like everything
// else, so the block, the streak and the strip on the Workout tab all agree
// about which week you are in.
export { weekStart as mondayOf } from './schedule'

// How many weeks since the block began. Negative means the start is in the
// future, which is treated as week one rather than as an error.
function weeksSince(start: string, today: string): number {
  const from = new Date(weekStart(start) + 'T00:00:00').getTime()
  const to = new Date(weekStart(today) + 'T00:00:00').getTime()
  const weeks = Math.floor((to - from) / (7 * 86400000))
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
