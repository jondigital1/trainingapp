import { GOAL_FROM_CHOICE, GOAL_LABEL, goalsOf, primaryGoal, program } from './onboarding'
import { weekStart } from './week'
import type { GoalChoice, Profile, Program } from './onboarding'
import { happened } from './format'
import type { Workout } from './types'

// The two offers the log earns.
//
// Graduation: the starting program was sized from the signup answers, those
// answers are frozen history now, and somebody who answered as a beginner and
// then trained for months is not a beginner. The log is the evidence, so the
// log makes the offer.
//
// Advance: the goals are an ordered list and nothing ever moved it. Somebody
// who said build muscle first, then get stronger, described a year; after
// enough weeks on the front of the list, the app offers the next thing they
// already said they wanted.
//
// Both are cards, not pushes, made once, and either answer sticks. An offer
// that keeps coming back is a demand wearing an offer's clothes.

// Distinct days and distinct weeks that actually contained training, on or
// after a date. Empty saved workouts do not count, the same rule the streak
// and the grid use.
export function trainedSince(workouts: Workout[], since: string): { days: number; weeks: number } {
  const dates = new Set<string>()
  for (const w of workouts) {
    const date = w.date.slice(0, 10)
    if (date < since) continue
    if (!happened(w)) continue
    dates.add(date)
  }
  const weeks = new Set([...dates].map((d) => weekStart(d)))
  return { days: dates.size, weeks: weeks.size }
}

export interface Graduation {
  from: Program
  // Only ever upward, which the type says out loud.
  to: 'Build' | 'Performance'
  days: number
  weeks: number
}

// What it takes to be offered the next program. Foundation stops being right
// after a few consistent months; Performance is a bigger claim (blocks, waved
// effort) and asks for evidence measured in seasons.
const GRADUATION: { from: Program; to: 'Build' | 'Performance'; days: number; weeks: number }[] = [
  { from: 'Foundation', to: 'Build', days: 24, weeks: 8 },
  { from: 'Build', to: 'Performance', days: 72, weeks: 24 },
]

export function graduationFor(
  profile: Profile,
  workouts: Workout[],
  onboardedAt: string | null,
): Graduation | null {
  if (!onboardedAt) return null
  const current = program(profile)
  const step = GRADUATION.find((g) => g.from === current)
  if (!step) return null
  if (profile.promotionDismissed === step.to) return null
  // Counted from signup, not from the dawn of time, so imported history from
  // some other life does not graduate somebody the app has never seen train.
  const done = trainedSince(workouts, onboardedAt.slice(0, 10))
  if (done.days < step.days || done.weeks < step.weeks) return null
  return { from: current, to: step.to, days: done.days, weeks: done.weeks }
}

export interface Advance {
  from: GoalChoice
  to: GoalChoice
  weeks: number
}

// Enough weeks on the front of the list to have banked real progress there.
const ADVANCE_WEEKS = 12

export function advanceFor(
  profile: Profile,
  workouts: Workout[],
  onboardedAt: string | null,
): Advance | null {
  const all = goalsOf(profile)
  const first = primaryGoal(profile)
  if (!first || all.length < 2) return null
  // Only a goal that trains differently is waiting; leaning out beside
  // building muscle is the same training and nothing to advance to.
  const waiting = all.filter((c) => GOAL_FROM_CHOICE[c] !== GOAL_FROM_CHOICE[first])
  if (!waiting.length) return null
  if (profile.advanceDismissedFor === first) return null
  const since = profile.goalChoiceAt ?? onboardedAt
  if (!since) return null
  const done = trainedSince(workouts, since.slice(0, 10))
  if (done.weeks < ADVANCE_WEEKS) return null
  return { from: first, to: waiting[0], weeks: done.weeks }
}

// The gerund forms every sentence in the app already uses: building muscle,
// getting stronger. The button labels read as actions because of it.
function label(v: GoalChoice): string {
  return GOAL_LABEL[v]
}

// The words on the cards, here so they get checked. Both name what happened
// and what was said, and neither invents praise or urgency.
export function graduationCopy(g: Graduation): { title: string; body: string; yes: string; no: string } {
  return {
    title: 'Earned, not asked for',
    body: `${g.days} sessions across ${g.weeks} weeks. The ${g.from} program was sized for somebody newer than you are now. ${g.to} adds ${g.to === 'Build' ? 'more focused splits and more room per muscle' : 'six week blocks with waved effort'}, and nothing you have logged changes.`,
    yes: `Move up to ${g.to}`,
    no: 'Stay where I am',
  }
}

export function advanceCopy(a: Advance): { title: string; body: string; yes: string; no: string } {
  return {
    title: 'The next thing on your list',
    body: `${a.weeks} weeks of ${label(a.from)}. You put ${label(a.to)} next on your list, and it is still there. Moving it to the front changes the reps and the rests from your next session, and nothing you have logged changes.`,
    yes: `Switch to ${label(a.to)}`,
    no: 'Not yet',
  }
}
