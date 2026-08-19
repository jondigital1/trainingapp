import { LIBRARY, equipmentOf, groupOf, lookupType } from './exercises'
import { dayItems, SPLITS, type TemplateDay } from './templates'
import type { CustomWorkoutItem, Goal, SetType } from './types'
import type { Unit } from './units'

// The long session. Ninety minutes is what somebody means when they say they
// are not in a hurry, and its budget of twelve is past the length of every
// template day there is, so in practice nothing gets trimmed. The cap only
// ever removes work, it never invents any.
export const LONG_SESSION = 90


// Everything the first run asks, plus the questions that arrive later in
// context. See docs/onboarding-research.md for why each one earns its place.
export interface Profile {
  // Who they are. Name is used on the profile page and nowhere else: this app
  // has one user per account and does not need to address anybody by name to
  // work.
  name?: string
  ageYears?: number
  units?: Unit
  heightIn?: number
  goalWeight?: number
  condition?: 'no' | 'yes' | 'skip'
  symptoms?: 'no' | 'yes'
  years?: 'never' | 'under6' | 'sixToTwo' | 'overTwo'
  before?: 'no' | 'thisYear' | 'longAgo'
  // The most honest experience question there is. Somebody who can name the
  // load they last pressed has been paying attention to their training;
  // somebody who cannot has not, whatever their years say.
  knows?: 'yes' | 'roughly' | 'no'
  // Whether they already write their own sessions. Somebody who does should be
  // handed the builder rather than pushed onto a split they did not ask for,
  // which is the single most common thing new people said was missing: they
  // could not find the door marked "I know what I want to do".
  writesOwn?: 'no' | 'sometimes' | 'yes'
  days?: number
  access?: 'full' | 'basic' | 'home' | 'body'
  // 30 minutes, an hour, or 90. 45 and 75 are no longer offered but are still
  // understood, so a profile saved when they were does not lose its session
  // length.
  minutes?: 30 | 45 | 60 | 75 | typeof LONG_SESSION
  sore?: string[]
  redFlag?: boolean
  barbell?: 'confident' | 'rusty' | 'never' | 'no'
  other?: string[]
  // Kept as a band because that is what the plan actually reads. ageYears is
  // the real answer and the band is derived from it; the band survives on its
  // own for profiles written before the number was asked for.
  age?: 'under40' | '40to59' | 'over60'
  dislikes?: string[]
  goalChoice?: 'muscle' | 'strength' | 'lean' | 'health'
  // Six week training blocks, opt in. Named for what they are rather than for
  // the three week wave they replaced: three weeks is not long enough to be a
  // block, and the deload at the end is the point of having one.
  block?: boolean
  blockStart?: string
  // Which day of the week runs which session, Sunday first. A template day id
  // trains that day, null rests. Empty until somebody sets it, and the app
  // works exactly as before while it is.
  schedule?: (string | null)[]
  // When the four week check-in was answered, either way. Once set it never
  // shows again: answered is answered.
  checkinDismissedAt?: string
}

export const SORE_JOINTS = ['Knee', 'Low back', 'Shoulder', 'Hip', 'Elbow', 'Neck', 'Wrist']
export const OTHER_TRAINING = ['Running', 'Cycling', 'Sport', 'Classes', 'Walking']
export const COMMON_DISLIKES = [
  'Burpees', 'Back Squat', 'Deadlift', 'Walking Lunge', 'Overhead Press', 'Plank', 'Run',
]

export function ageBand(profile: Profile): Profile['age'] {
  const n = profile.ageYears
  if (n == null || !Number.isFinite(n)) return profile.age
  if (n >= 60) return 'over60'
  if (n >= 40) return '40to59'
  return 'under40'
}

export function unitOf(profile: Profile): Unit {
  return profile.units === 'kg' ? 'kg' : 'lb'
}

// Three programs, because a person can hold three in their head and choose
// between them. The four internal tiers this replaced were a scoring artefact,
// not something anybody was ever shown.
export type Program = 'Foundation' | 'Build' | 'Performance'

export const PROGRAMS: { id: Program; blurb: string }[] = [
  { id: 'Foundation', blurb: 'Learn the movements, build the habit, add weight as it gets easy.' },
  { id: 'Build', blurb: 'You know the lifts. Now add muscle and load, one session at a time.' },
  { id: 'Performance', blurb: 'Long training age. Effort targets and six week blocks from day one.' },
]

const YEARS_SCORE = { never: 0, under6: 1, sixToTwo: 2, overTwo: 3 }
const BEFORE_SCORE = { no: 0, longAgo: 1, thisYear: 2 }
const BARBELL_SCORE = { never: 0, no: 0, rusty: 1, confident: 2 }
const KNOWS_SCORE = { no: 0, roughly: 1, yes: 2 }

// Profiles written before the weights question existed get a value inferred
// from training age rather than being scored as if they had answered no, which
// would demote people who have been using the app for months.
function knowsScore(p: Profile): number {
  if (p.knows) return KNOWS_SCORE[p.knows]
  return p.years === 'sixToTwo' || p.years === 'overTwo' ? 1 : 0
}

export function experienceScore(p: Profile): number {
  return (
    (p.years ? YEARS_SCORE[p.years] : 0) +
    (p.before ? BEFORE_SCORE[p.before] : 0) +
    (p.barbell ? BARBELL_SCORE[p.barbell] : 0) +
    knowsScore(p)
  )
}

// Max reachable score is 7: the returner question is only asked of people who
// said never or under 6 months, so it never stacks on top of two years.
export function program(p: Profile): Program {
  const s = experienceScore(p)
  if (s <= 2) return 'Foundation'
  if (s <= 4) return 'Build'
  return 'Performance'
}

// Somebody rebuilding is not a beginner and should not be told they are. It is
// a note and a slightly different first four weeks, not a fourth program.
export function returning(p: Profile): boolean {
  const green = p.years === 'never' || p.years === 'under6'
  return green && (p.before === 'thisYear' || p.before === 'longAgo')
}

// Program by days, over the template days that already exist. Three through
// six: the week somebody actually trains is theirs to state, but two is not
// enough to hold a split together and seven leaves no rest day at all, so
// neither is offered.
//
// A day id can appear twice. Push pull legs run through twice is the standard
// six day week, not a mistake, so anything rendering these keys by index
// rather than by id.
// Four days and up gets two leg days, and they are different days: quads and
// calves on one, hamstrings and glutes on the other. One Legs day repeated, or
// worse two identical ones, was the most common thing people said was wrong
// with the plans. Three days a week is the exception, because a third of your
// week is not enough to split the lower body across.
const TABLE: Record<Program, Record<number, string[]>> = {
  Foundation: {
    3: ['fb-a', 'fb-b', 'fb-c'],
    4: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'ul-lower-b'],
    5: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'ul-lower-b', 'fb-c'],
    6: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'ul-lower-b', 'fb-a', 'fb-b'],
  },
  Build: {
    3: ['ppl-push', 'ppl-pull', 'ppl-legs'],
    4: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'ul-lower-b'],
    5: ['five-chest', 'five-back', 'five-quads', 'five-shoulders', 'five-posterior'],
    6: ['ppl-push', 'ppl-pull', 'five-quads', 'ppl-push', 'ppl-pull', 'five-posterior'],
  },
  Performance: {
    3: ['ppl-push', 'ppl-pull', 'ppl-legs'],
    4: ['summer4-push', 'summer4-pull', 'summer4-legs', 'summer4-upper'],
    5: ['five-chest', 'five-back', 'five-quads', 'five-shoulders', 'five-posterior'],
    6: ['bro-chest', 'bro-back', 'bro-shoulders', 'bro-arms', 'five-quads', 'five-posterior'],
  },
}

export const MIN_DAYS = 3
export const MAX_DAYS = 6

// A returner on Foundation gets full body four days rather than an upper lower
// split, because the first month back is about frequency on the patterns, not
// carving the week into halves.
const RETURNER_DAYS: Record<number, string[]> = {
  4: ['fb-a', 'fb-b', 'fb-c', 'ul-upper-a'],
}

const SPLIT_NAME: Record<Program, Record<number, string>> = {
  Foundation: {
    3: 'Full Body',
    4: 'Upper Lower',
    5: 'Upper Lower',
    6: 'Upper Lower plus Full Body',
  },
  Build: {
    3: 'Push Pull Legs',
    4: 'Upper Lower',
    5: '5 Day Split',
    6: 'Push Pull Legs, twice through',
  },
  Performance: {
    3: 'Push Pull Legs',
    4: '4 Day Split',
    5: '5 Day Split',
    6: 'A muscle a day, plus an upper mix',
  },
}

const ALL_DAYS: TemplateDay[] = SPLITS.flatMap((s) => s.days)

export function dayById(id: string): TemplateDay | undefined {
  return ALL_DAYS.find((d) => d.id === id)
}

// Movements each flagged joint should not be asked to do. The pattern stays,
// the movement changes: a knee means leg press, not no legs.
const SORE_BANS: Record<string, string[]> = {
  Knee: [
    'Back Squat', 'Front Squat', 'Smith Machine Squat', 'Hack Squat', 'Machine Hack Squat',
    'Cyclist Squat', 'Sissy Squat', 'Walking Lunge', 'Reverse Lunge', 'Curtsy Lunge', 'Step Up',
    // Split stance is deep knee flexion under load on one leg. It was missing
    // from this list only because no template that mattered contained one.
    'Bulgarian Split Squat', 'Split Squat', 'Dumbbell Lunge', 'Barbell Lunge',
  ],
  'Low back': [
    'Deadlift', 'Trap Bar Deadlift', 'Rack Pull', 'Romanian Deadlift', 'Dumbbell Romanian Deadlift',
    'Single Leg Romanian Deadlift', 'Stiff Leg Deadlift', 'Good Morning', 'Barbell Row', 'Pendlay Row',
    'T Bar Row', 'Back Squat', 'Front Squat', 'Back Extension', 'Weighted Back Extension',
  ],
  Shoulder: [
    'Overhead Press', 'Seated Barbell Press', 'Push Press', 'Behind Back Wrist Curl', 'Upright Row',
    'Barbell Bench Press', 'Decline Barbell Bench Press', 'Dip', 'Weighted Dip',
  ],
  Elbow: ['Skull Crusher', 'EZ Bar Skull Crusher', 'Dumbbell Skull Crusher', 'JM Press', 'Close Grip Bench Press'],
  Wrist: ['Barbell Curl', 'Wrist Curl', 'Reverse Wrist Curl', 'Front Squat', 'Ab Wheel Rollout'],
  Hip: ['Walking Lunge', 'Curtsy Lunge', 'Deadlift', 'Good Morning'],
  Neck: ['Barbell Shrug', 'Snatch Grip High Pull', 'Upright Row'],
}

// Where a movement has an obvious right answer, name it. Falling back to the
// first workable movement in the same muscle group gives a knee a goblet squat,
// which is still a squat. A knee wants the leg press.
const PREFERRED: Record<string, string> = {
  'Back Squat': 'Leg Press',
  'Front Squat': 'Leg Press',
  'Smith Machine Squat': 'Leg Press',
  'Hack Squat': 'Leg Press',
  'Machine Hack Squat': 'Leg Press',
  'Cyclist Squat': 'Leg Extension',
  'Sissy Squat': 'Leg Extension',
  'Walking Lunge': 'Leg Press',
  'Bulgarian Split Squat': 'Leg Extension',
  'Split Squat': 'Leg Extension',
  'Dumbbell Lunge': 'Leg Extension',
  'Barbell Lunge': 'Leg Press',
  'Reverse Lunge': 'Leg Extension',
  'Curtsy Lunge': 'Hip Thrust',
  'Step Up': 'Leg Extension',
  'Goblet Squat': 'Leg Press',
  Deadlift: 'Seated Leg Curl',
  'Trap Bar Deadlift': 'Leg Press',
  'Rack Pull': 'Chest Supported Row',
  'Romanian Deadlift': 'Lying Leg Curl',
  'Dumbbell Romanian Deadlift': 'Seated Leg Curl',
  'Single Leg Romanian Deadlift': 'Seated Leg Curl',
  'Stiff Leg Deadlift': 'Seated Leg Curl',
  'Good Morning': 'Seated Leg Curl',
  'Barbell Row': 'Chest Supported Row',
  'Pendlay Row': 'Chest Supported Row',
  'T Bar Row': 'Chest Supported Row',
  'Overhead Press': 'Machine Shoulder Press',
  'Seated Barbell Press': 'Machine Shoulder Press',
  'Push Press': 'Machine Shoulder Press',
  'Upright Row': 'Face Pull',
  'Barbell Bench Press': 'Machine Chest Press',
  'Decline Barbell Bench Press': 'Machine Chest Press',
  Dip: 'Machine Chest Press',
  'Weighted Dip': 'Machine Chest Press',
  'Barbell Curl': 'Cable Curl',
  'Skull Crusher': 'Rope Pushdown',
  'EZ Bar Skull Crusher': 'Rope Pushdown',
  'Dumbbell Skull Crusher': 'Rope Pushdown',
  'Close Grip Bench Press': 'Rope Pushdown',
  'JM Press': 'Rope Pushdown',
  'Barbell Shrug': 'Cable Shrug',
  'Snatch Grip High Pull': 'Cable Shrug',
  'Ab Wheel Rollout': 'Cable Crunch',
  'Wrist Curl': 'Dead Hang',
  'Reverse Wrist Curl': 'Dead Hang',
  'Back Extension': 'Seated Leg Curl',
  'Weighted Back Extension': 'Seated Leg Curl',
}

const ACCESS_EQUIPMENT: Record<NonNullable<Profile['access']>, string[]> = {
  full: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'],
  basic: ['dumbbell', 'machine', 'bodyweight', 'other'],
  home: ['dumbbell', 'bodyweight'],
  body: ['bodyweight'],
}

// Some joints rule out a whole family of movements rather than a list of them.
// A hand written list catches the variants somebody remembered: ban the back
// squat and the front squat for a sore knee and the swap lands cheerfully on a
// goblet squat, because nobody thought to write that one down. The pattern
// catches the family; the list above stays for the odd ones out.
//
// Leg press and leg extension are deliberately not in the knee pattern. They
// are what a knee swaps to.
const SORE_PATTERNS: Record<string, RegExp> = {
  Knee: /Squat|Lunge|Step Up|Sissy|Nordic|Pistol/i,
  'Low back': /Deadlift|Good Morning|Back Extension|Barbell Row|Pendlay|Back Squat|Front Squat/i,
  Shoulder: /Overhead Press|Push Press|Behind (the )?Neck|Upright Row/i,
}

function banned(profile: Profile): Set<string> {
  const out = new Set<string>()
  for (const joint of profile.sore ?? []) {
    for (const name of SORE_BANS[joint] ?? []) out.add(name)
    const pattern = SORE_PATTERNS[joint]
    if (pattern) for (const e of LIBRARY) if (pattern.test(e.name)) out.add(e.name)
  }
  for (const name of profile.dislikes ?? []) out.add(name)
  return out
}

function allowed(profile: Profile, name: string, bans: Set<string>): boolean {
  if (bans.has(name)) return false
  const kit = ACCESS_EQUIPMENT[profile.access ?? 'full']
  return kit.includes(equipmentOf(name))
}

// Swap rather than drop: find the nearest movement in the same muscle group
// that this person can actually do, and is not already in the session.
function alternative(name: string, profile: Profile, bans: Set<string>, used: Set<string>): string | null {
  const first = PREFERRED[name]
  if (first && !used.has(first) && allowed(profile, first, bans)) return first

  const group = groupOf(name)
  if (!group) return null
  const type = lookupType(name)
  const pool = LIBRARY.filter(
    (e) => e.group === group && !used.has(e.name) && allowed(profile, e.name, bans),
  )
  return (pool.find((e) => e.type === type) ?? pool[0])?.name ?? null
}

export interface PlannedItem extends CustomWorkoutItem {
  swappedFrom?: string
}

// How many movements fit in the time they said they had.
const BUDGET: Record<number, number> = { 30: 4, 45: 6, 60: 8, 75: 10, [LONG_SESSION]: 12 }

export function buildDay(day: TemplateDay, profile: Profile): PlannedItem[] {
  const bans = banned(profile)
  // Seeded with the whole day, not filled as it goes. A swap decided at the
  // first movement used to be free to pick something sitting three lines
  // further down, which put the leg press in the session twice.
  const used = new Set<string>(dayItems(day).map((i) => i.name))
  const out: PlannedItem[] = []

  // A swap keeps the superset tag: the pattern stays in the circuit even when
  // the movement changes.
  for (const item of dayItems(day)) {
    if (allowed(profile, item.name, bans)) {
      used.add(item.name)
      out.push({ name: item.name, type: item.type, superset: item.superset ?? null })
      continue
    }
    const swap = alternative(item.name, profile, bans, used)
    if (!swap) continue
    used.add(swap)
    out.push({
      name: swap,
      type: (lookupType(swap) ?? 'W') as SetType,
      superset: item.superset ?? null,
      swappedFrom: item.name,
    })
  }

  const cap = BUDGET[profile.minutes ?? 60] ?? 8
  if (out.length <= cap) return out

  // The cap never slices through a superset: half a circuit is not a circuit.
  // Tagged groups are kept whole while at least two other movements still fit,
  // otherwise the whole group is dropped and singles fill the day.
  const groups = new Map<string, PlannedItem[]>()
  for (const item of out) {
    if (!item.superset) continue
    if (!groups.has(item.superset)) groups.set(item.superset, [])
    groups.get(item.superset)!.push(item)
  }

  const kept = new Set<string>()
  let reserved = 0
  for (const [tag, members] of groups) {
    if (reserved + members.length <= cap - 2) {
      kept.add(tag)
      reserved += members.length
    }
  }

  const trimmed: PlannedItem[] = []
  let singles = 0
  for (const item of out) {
    if (item.superset) {
      if (kept.has(item.superset)) trimmed.push(item)
      continue
    }
    if (singles < cap - reserved) {
      trimmed.push(item)
      singles += 1
    }
  }
  return trimmed
}

export interface Plan {
  program: Program
  returning: boolean
  days: number
  capped: boolean
  splitName: string
  dayIds: string[]
  perMuscle: string
  exercises: number
  reps: string
  sets: string
  block: boolean
  cleared: boolean
  // Said once, on the plan screen, and never again. Seven days a week is the
  // person's call, not something to argue with every time they open the app.
  restNote: string | null
  // What the stated goal was turned into, and why, so nothing is quietly
  // rewritten behind the person who chose it.
  goalNote: string | null
  // They write their own. The plan is still built and still there, it just
  // stops being the thing the app leads with.
  selfDirected: boolean
}

// One answer, read in three places: the last step of the questionnaire, the
// Start sheet, and what happens when the questionnaire ends.
export function selfDirected(p: Profile): boolean {
  return p.writesOwn === 'yes'
}

// The goal a person picks and the goal the coach can act on are not the same
// list. Leaning out and staying capable are both built on muscle work; saying
// so beats mapping them to something else without a word.
export const GOAL_FROM_CHOICE: Record<NonNullable<Profile['goalChoice']>, Goal> = {
  muscle: 'muscle',
  strength: 'strength',
  lean: 'muscle',
  health: 'endurance',
}

const GOAL_NOTE: Record<NonNullable<Profile['goalChoice']>, string | null> = {
  muscle: null,
  strength: null,
  lean: 'Leaning out runs as muscle work: this holds and builds what you have, the kitchen takes the weight off. Nothing here is a fat burning workout, because that is not a thing a workout does.',
  health: 'Staying capable runs as endurance work: lighter loads, more reps, kinder joints, and a coach line that stops asking you to grind.',
}

const REPS: Record<NonNullable<Profile['goalChoice']>, string> = {
  strength: '3 to 6',
  muscle: '6 to 12',
  lean: '8 to 15',
  health: '12 to 20',
}

export function planFor(profile: Profile, goal: Goal): Plan {
  const prog = program(profile)
  const back = returning(profile)
  const asked = profile.days ?? 3
  const days = Math.min(Math.max(asked, MIN_DAYS), MAX_DAYS)
  // A flagged health answer is not a note, it is a lighter plan: fewer sets,
  // no effort targets to chase and no wave, whatever the experience score says.
  const cleared = profile.condition === 'yes' || profile.symptoms === 'yes'
  const choice = profile.goalChoice
  const dayIds =
    back && prog === 'Foundation' && RETURNER_DAYS[days] ? RETURNER_DAYS[days] : TABLE[prog][days]

  return {
    program: prog,
    returning: back,
    days,
    capped: asked > MAX_DAYS,
    splitName: back && prog === 'Foundation' && days === 4 ? 'Full Body, building up' : SPLIT_NAME[prog][days],
    dayIds,
    perMuscle: days <= 2 ? '4 to 5' : days <= 3 ? '3 to 4' : days <= 5 ? '2 to 3' : '2',
    exercises: BUDGET[profile.minutes ?? 60] ?? 8,
    reps: choice ? REPS[choice] : goal === 'strength' ? '3 to 6' : goal === 'endurance' ? '12 to 20' : '6 to 12',
    sets: cleared || prog === 'Foundation' || ageBand(profile) === 'over60' ? '2 to 3' : '3 to 4',
    block: !cleared && prog === 'Performance',
    cleared,
    restNote:
      days === 6
        ? 'Six days is a lot of weeks in a row. The plan repeats rather than inventing new work, so a missed day is a day you have already done, and the seventh is a rest day on purpose.'
        : null,
    goalNote: choice ? GOAL_NOTE[choice] : null,
    selfDirected: selfDirected(profile),
  }
}


// The four week check-in, on a rolling window rather than the first month
// ever, so imported history cannot trigger it and a strong recent month
// clears a weak start. trainedLast28 is distinct training days in the last 28.
// It fires at most once: answering it, either way, stamps the profile.
export function needsCheckin(
  profile: Profile,
  onboardedAt: string | null,
  trainedLast28: number,
  today: string,
): boolean {
  if (!onboardedAt || profile.checkinDismissedAt) return false
  // Nothing to offer somebody already on the shortest week there is.
  if ((profile.days ?? 3) <= MIN_DAYS) return false
  const elapsed = new Date(today + 'T00:00:00').getTime() - new Date(onboardedAt).getTime()
  if (elapsed < 28 * 86400000) return false
  return trainedLast28 < 8
}
