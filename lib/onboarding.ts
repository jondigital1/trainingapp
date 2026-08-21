import { LIBRARY, demandOf, demandRank, equipmentOf, groupOf, lookupType, similarTo } from './exercises'
import { estimateSeconds } from './estimate'
import { restTier, type RestTier } from './rest'
import { dayItems, SPLITS, type TemplateDay } from './templates'
import type { CustomWorkoutItem, Goal, SetType } from './types'
import type { Unit } from './units'

// The long session. Ninety minutes is what somebody means when they say they
// are not in a hurry, and its budget of twelve is past the length of every
// template day there is, so in practice nothing gets trimmed. The cap only
// ever removes work, it never invents any.
// The no ceiling answer. Kept as a number so everything stored stays a number,
// but nothing is trimmed against it: above an hour the templates run out of
// movements long before the clock does, so a bigger number was a promise the
// library could not keep. Ninety minutes delivered a forty three minute push
// day and called it ninety.
export const LONG_SESSION = 90

// How many sections the questionnaire has. Lives here so Settings can promise
// the same number the questionnaire delivers; the two disagreed once (five
// against six) and a check now holds them together.
export const STEP_COUNT = 6


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
  // One leg day a week or two. Two is quads on one and hamstrings and glutes on
  // the other, which is what most people at four days and up want and what the
  // plans hand out unless somebody says otherwise. Plenty of people train legs
  // once and that is a preference, not an oversight to correct.
  legDays?: 1 | 2
  // Asked because a plan that never asks reads as a plan built for one default
  // person. It does exactly one thing, and it does it in the open: it ticks
  // the starting answer to the question below, which is then shown and can be
  // changed. Nothing is inferred silently and nothing else reads it.
  sex?: 'female' | 'male' | 'skip'
  // Muscle groups to bring up. What this changes is order: they come first in
  // the session, while there is something left in the tank, and they are the
  // last thing dropped when the clock runs out.
  focus?: string[]
  // One off moves, by date. The schedule is a weekly pattern, so editing it to
  // shift one session would shift that weekday forever; life moving a workout
  // from Tuesday to Wednesday this week is not a change of plan, it is a
  // change of Tuesday. An empty string means the day was emptied by a move
  // away from it, which is different from a day the pattern never filled.
  moves?: Record<string, string>
  // The day the greeting last ran, and the joints somebody named on the way
  // into a session, by date. Both are about a day rather than about a person,
  // which is why neither is written into sore.
  greetedAt?: string
  easedOn?: Record<string, string[]>
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
  // Everything they want out of this, in the order they picked it. One of them
  // steers the reps and the rests, because a set cannot be three rep ranges at
  // once, and that one is goalChoice below. The rest are not decoration: they
  // decide what the app says about what it is not doing yet.
  goals?: ('muscle' | 'strength' | 'lean' | 'health')[]
  // The one steering. Kept as its own field because everything downstream has
  // always read it, and because a profile written before the list existed has
  // only this.
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
  // Earned from the log, never edited by hand. The signup answers are frozen
  // history, so moving up is its own stored fact granted by evidence: the
  // program is the higher of what the answers said and what the log proved.
  promotedTo?: 'Build' | 'Performance'
  // The offer they turned down, so it is made once.
  promotionDismissed?: 'Build' | 'Performance'
  // When the driving goal last changed, so the offer to move to the next one
  // counts weeks of this goal rather than weeks of membership.
  goalChoiceAt?: string
  // The primary they said not yet to, so the offer re-arms only after the
  // driving goal actually changes.
  advanceDismissedFor?: 'muscle' | 'strength' | 'lean' | 'health'
}

export const SORE_JOINTS = ['Knee', 'Low back', 'Shoulder', 'Hip', 'Elbow', 'Neck', 'Wrist']
export const OTHER_TRAINING = ['Running', 'Cycling', 'Sport', 'Classes', 'Walking']

// The whole job of the rest-of-the-week answer is the line under it: how the
// lifting and the other thing share a week without eating each other. Until
// every answer had one, four of the five were collected and read by nothing.
export const OTHER_NOTES: Record<string, string> = {
  Running: 'Lift first when both land on the same day, and keep the hard runs off leg day.',
  Cycling: 'Easy spins help leg day recovery more than they cost it. Hard intervals count as leg work.',
  Sport: 'Match days are training. The day before one is a bad day for heavy legs.',
  Classes: 'A hard class is a session. Two a week means your lifting days can afford to be heavier, not longer.',
  Walking: 'Walking costs nothing and helps everything. No planning needed.',
}
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
const PROGRAM_ORDER: Program[] = ['Foundation', 'Build', 'Performance']

export function program(p: Profile): Program {
  const s = experienceScore(p)
  const derived: Program = s <= 2 ? 'Foundation' : s <= 4 ? 'Build' : 'Performance'
  // A promotion earned from the log outranks the signup answers, and only
  // upward: nothing stored can ever demote somebody below what they said.
  if (p.promotedTo && PROGRAM_ORDER.indexOf(p.promotedTo) > PROGRAM_ORDER.indexOf(derived)) {
    return p.promotedTo
  }
  return derived
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
    // Push Pull Legs run twice, which is how six day PPL is actually trained,
    // with the two leg days split by what they lead with rather than repeated:
    // quads and calves one, hamstrings and glutes the other. A muscle a day
    // was the default here and is still a tap away in the week picker, but it
    // is the less common answer to six days and made PPL, the most common
    // one, impossible to derive at all.
    6: ['ppl-push', 'ppl-pull', 'five-quads', 'ppl-push', 'ppl-pull', 'five-posterior'],
  },
}

// Same weeks, with the second leg day given back to the upper body. Only the
// combinations that differ are here; three days a week and Performance at four
// already run a single Legs day.
const ONE_LEG: Record<Program, Record<number, string[]>> = {
  Foundation: {
    4: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'summer4-upper'],
    5: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'summer4-upper', 'fb-c'],
    6: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'summer4-upper', 'five-shoulders', 'five-pump'],
  },
  Build: {
    4: ['ul-upper-a', 'ul-lower-a', 'ul-upper-b', 'summer4-upper'],
    5: ['five-chest', 'five-back', 'five-legs', 'five-shoulders', 'five-pump'],
    6: ['ppl-push', 'ppl-pull', 'ppl-legs', 'ppl-push', 'ppl-pull', 'five-pump'],
  },
  Performance: {
    5: ['five-chest', 'five-back', 'five-legs', 'five-shoulders', 'five-pump'],
    6: ['bro-chest', 'bro-back', 'bro-shoulders', 'bro-arms', 'bro-legs', 'summer4-upper'],
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
    6: 'Push Pull Legs, twice through',
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
// The named first choice for a swap, in order. It was one name, which meant a
// barbell bench press with no machine in the room fell through to whatever the
// similarity score sorted first, and that was a decline dumbbell press.
const PREFERRED: Record<string, string | string[]> = {
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
  'Barbell Bench Press': ['Machine Chest Press', 'Dumbbell Bench Press', 'Push Up'],
  'Face Pull': ['Cable Rear Delt Fly', 'Rear Delt Fly', 'Band Pull Apart'],
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

// What a red flag takes on top. The ordinary patterns deliberately spare the
// gentle machines, because that is what a sore joint swaps to; a red flagged
// joint does not get the swap either, because pain that wakes you at night or
// a limb going numb is not something to leg press around.
//
// Scoped to the muscle groups the joint actually drives, because the words
// these patterns match are not owned by one region: Press is in Leg Press,
// Raise is in Calf Raise, Curl is in Leg Curl. Unscoped, a flagged shoulder
// took the leg machines away and emptied whole days on a small kit, which is
// not caution, it is a bug wearing caution's clothes.
const RED_FLAG_GROUPS: Record<string, string[]> = {
  Knee: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  'Low back': ['Back', 'Hamstrings', 'Glutes', 'Quads', 'Traps', 'Core', 'Carries'],
  Shoulder: ['Chest', 'Shoulders', 'Back', 'Triceps', 'Traps'],
  // Adductors joined this list when the group was added. The pattern above has
  // always named Adduction and had nothing to match, since no group held any:
  // a flagged hip was scoping over three groups that contained no adduction
  // work at all.
  Hip: ['Quads', 'Hamstrings', 'Glutes', 'Adductors'],
  Elbow: ['Biceps', 'Triceps', 'Chest', 'Back', 'Shoulders', 'Forearms'],
  Wrist: ['Biceps', 'Triceps', 'Forearms', 'Chest', 'Back', 'Carries'],
  Neck: ['Traps', 'Shoulders', 'Back'],
}

// Which muscles a sore joint sits in the middle of. Reused from the red flag
// map, because the anatomy does not change with how bad it is: what changes is
// what the app does about it.
//
// A sore knee does not mean stop training legs. It means the leg work runs
// lighter for a while: a set fewer on everything that crosses the joint, on
// top of swapping the handful of movements that genuinely aggravate it. That
// is what somebody with a grumbling knee actually does, and telling them to
// skip leg day instead is how an app gets ignored rather than obeyed.
export function soreGroups(profile: Profile): Set<string> {
  const out = new Set<string>()
  if (profile.redFlag) return out
  for (const joint of profile.sore ?? []) {
    for (const group of RED_FLAG_GROUPS[joint] ?? []) out.add(group)
  }
  return out
}

const RED_FLAG_PATTERNS: Record<string, RegExp> = {
  Knee: /Leg Press|Leg Extension|Hack Squat|Wall Sit|Leg Curl|Hip Thrust|Glute Bridge|Sled|Step Up/i,
  'Low back': /Row|Rack Pull|Hip Thrust|Glute Bridge|Hyperextension|Leg Press|Squat|Carry|Swing|Deadlift/i,
  Shoulder: /Press|Raise|Fly|Pec Deck|Dip|Pull Up|Chin Up|Pulldown|Pullover|Face Pull|Push Up|Shrug|Pull Apart|Wall Walk|Handstand/i,
  Hip: /Squat|Lunge|Leg Press|Hip Thrust|Glute Bridge|Deadlift|Abduction|Adduction|Step Up/i,
  Elbow: /Curl|Extension|Pushdown|Skull Crusher|Press|Dip|Row|Pull|Push Up/i,
  Wrist: /Curl|Press|Push Up|Pull Up|Row|Carry|Hang/i,
  Neck: /Shrug|Overhead|Behind (the )?Neck|Deadlift|Carry/i,
}

function banned(profile: Profile): Set<string> {
  const out = new Set<string>()

  // A sore joint no longer takes movements away, it makes them lighter. Saying
  // your knee is grumbling is not saying you want to stop training legs, and
  // an app that answers it by deleting the squat, the split squat and the
  // lunge and handing back two machines is answering a question nobody asked.
  // What it does instead is run everything crossing that joint a set short
  // while it settles, which is what a person with a grumbling knee actually
  // does. The red flag beside the question is the escalation, and that one
  // still takes movements away, because pain that wakes you at night is not
  // something to leg press around.
  if (profile.redFlag) {
    for (const joint of profile.sore ?? []) {
      for (const name of SORE_BANS[joint] ?? []) out.add(name)
      const pattern = SORE_PATTERNS[joint]
      if (pattern) for (const e of LIBRARY) if (pattern.test(e.name)) out.add(e.name)
    }
  }
  // A red flag answer used to be stored and read by nothing, which for a
  // safety question is the worst kind of ignored. The note beside it promises
  // "we will keep suggesting the rest", and this is that promise kept: an
  // ordinary sore joint swaps to its gentle alternative, a red flagged one
  // does not get the alternative either, because pain that wakes you at night
  // or a limb going numb is not something to leg press around, it is
  // something to have looked at. Everything unrelated to the joint stays.
  if (profile.redFlag) {
    for (const joint of profile.sore ?? []) {
      const strict = RED_FLAG_PATTERNS[joint]
      const groups = RED_FLAG_GROUPS[joint]
      if (!strict || !groups) continue
      for (const e of LIBRARY) {
        // Every group the movement trains, so a flagged hip reaches a sumo
        // deadlift through the adductors rather than only through the
        // hamstrings it happens to be filed under.
        if (!(e.groups ?? [e.group]).some((g) => groups.includes(g))) continue
        if (strict.test(e.name)) out.add(e.name)
      }
    }
  }
  for (const name of profile.dislikes ?? []) out.add(name)
  return out
}

// Whether the room has what this movement needs.
//
// Equipment only, deliberately. The plan builder below also weighs how long
// somebody has been training and what they said they would rather not do,
// which is right when the app is choosing for you and wrong when you are
// choosing for yourself: a manual builder must not quietly hide a movement
// somebody went looking for. What kit is in the room is a fact about the room.
// The rest is the plan's business.
export function fitsKit(name: string, access: Profile['access']): boolean {
  return ACCESS_EQUIPMENT[access ?? 'full'].includes(equipmentOf(name))
}

function allowed(profile: Profile, name: string, bans: Set<string>): boolean {
  if (bans.has(name)) return false
  const equipment = equipmentOf(name)
  // Not interested in barbell lifts is an equipment answer, and for a long
  // time it was treated as only a score: it shaped which program somebody got
  // and then handed them a barbell bench press anyway. An answer the plan
  // asks for and then ignores is worse than a question never asked.
  if (profile.barbell === 'no' && equipment === 'barbell') return false

  // Foundation is the program for somebody who has not done this before, and
  // it was still handing them pull ups and dips because the template said so.
  // The swap then finds the rung below: band assisted, negatives, an inverted
  // row. Nothing is removed from the library, it is deferred until the log
  // says they have earned it, which is what the promotion already watches for.
  if (program(profile) === 'Foundation' && demandOf(name) === 'demanding') return false

  const kit = ACCESS_EQUIPMENT[profile.access ?? 'full']
  return kit.includes(equipment)
}

// Swap rather than drop: find the nearest movement in the same muscle group
// that this person can actually do, and is not already in the session.
function alternative(name: string, profile: Profile, bans: Set<string>, used: Set<string>): string | null {
  for (const first of [PREFERRED[name] ?? []].flat()) {
    if (!used.has(first) && allowed(profile, first, bans)) return first
  }

  const group = groupOf(name)
  if (!group) return null
  const type = lookupType(name)

  // Ordered by how close the movement is, not by where it happens to sit in
  // the file. Taking the first match in library order is how a bench press
  // became a weighted push up: weighted push up is simply written earlier.
  const pool = similarTo(name).filter(
    (e) => e.group === group && !used.has(e.name) && allowed(profile, e.name, bans),
  )

  // And never upward. A swap exists because somebody cannot do the original,
  // so answering with something harder is the one reply guaranteed to be
  // wrong. Similarity cannot see this on its own: a handstand push up is
  // extremely similar to a push up.
  const ceiling = demandRank(name)
  const within = pool.filter((e) => demandRank(e.name) <= ceiling)

  // When nothing at or below the original exists, the fallback is the least
  // demanding thing left rather than the most similar. Similarity picked the
  // handstand push up: the only two bodyweight shoulder movements are a pike
  // push up and a handstand push up, and once the pike was used the closest
  // match to a seated dumbbell press was the handstand.
  const from = within.length
    ? within
    : [...pool].sort((a, b) => demandRank(a.name) - demandRank(b.name))
  return (from.find((e) => e.type === type) ?? from[0])?.name ?? null
}

export interface PlannedItem extends CustomWorkoutItem {
  swappedFrom?: string
  // One set fewer, because this crosses a joint they said was sore. Not a ban
  // and not a whole plan setting: this movement, this session, while it hurts.
  lighter?: boolean
}

// How many movements fit in the time they said they had.
//
// This was a fixed count per bucket, four at thirty minutes and twelve at
// ninety, which ignored the one thing that decides how long a session takes:
// what is in it. A heavy squat day rests three minutes between sets and a pump
// day rests sixty seconds, so eight movements is fifty minutes of one and
// seventy of the other. Counting to eight and calling it an hour was counting
// the wrong thing.
//
// The count is worked out from the session instead, using the same estimate
// the app already shows you before you start, so the two can never disagree.
// It is still a ceiling and not a target: a session lands where it lands, and
// the time somebody picked is the most it may cost them.
const CEILING = 12

function fits(items: PlannedItem[], profile: Profile, goal: Goal): boolean {
  const minutes = profile.minutes ?? 60
  if (minutes >= LONG_SESSION) return true
  return estimateSeconds(items, goal) <= minutes * 60
}

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

  const sore = soreGroups(profile)
  const eased = sore.size
    ? out.map((i) => (sore.has(groupOf(i.name) ?? '') ? { ...i, lighter: true } : i))
    : out
  const ordered = emphasise(withCarriedFocus(eased, profile, bans, used), focusOf(profile))

  const goal = profile.goalChoice ? GOAL_FROM_CHOICE[profile.goalChoice] : 'muscle'
  if (ordered.length <= CEILING && fits(ordered, profile, goal)) return ordered

  const groups = new Map<string, PlannedItem[]>()
  for (const item of ordered) {
    if (!item.superset) continue
    if (!groups.has(item.superset)) groups.set(item.superset, [])
    groups.get(item.superset)!.push(item)
  }

  // Movements in the order the session was already sorted, added while the
  // session still fits the time. The circuit is all of it or one of it: half a
  // circuit is not a circuit, and it may not be the session either, so it is
  // only kept whole once two movements that are not it are already in.
  const wanted = new Set(focusOf(profile))
  const kept = new Set<string>()
  const skipped = new Set<string>()
  const trimmed: PlannedItem[] = []

  for (const item of ordered) {
    if (trimmed.length >= CEILING) break
    if (item.superset && skipped.has(item.superset)) continue
    if (item.superset && kept.has(item.superset)) {
      trimmed.push(item)
      continue
    }

    if (!item.superset) {
      if (fits([...trimmed, item], profile, goal)) trimmed.push(item)
      else break
      continue
    }

    const members = groups.get(item.superset) ?? [item]
    const singles = trimmed.filter((t) => !t.superset).length
    if (singles >= 2 && trimmed.length + members.length <= CEILING && fits([...trimmed, ...members], profile, goal)) {
      kept.add(item.superset)
      trimmed.push(item)
      continue
    }
    skipped.add(item.superset)
    const save = members.find((m) => wanted.has(groupOf(m.name) ?? '')) ?? members[0]
    const one = { ...save, superset: null }
    if (fits([...trimmed, one], profile, goal)) trimmed.push(one)
  }

  // Core is the finisher, so it sits last and was therefore always the first
  // thing cut. It is also the cheapest thing in the session: three sets of a
  // plank rests forty five seconds and costs about three minutes. A day that
  // was written with core in it keeps some, because losing it is a decision
  // nobody made and it is what the templates were reaching for.
  if (!trimmed.some((i) => groupOf(i.name) === 'Core')) {
    const core = ordered.find((i) => groupOf(i.name) === 'Core')
    if (core) trimmed.push(core.superset ? { ...core, superset: null } : core)
  }

  // A session is a session. If the clock is so tight that almost nothing fits,
  // three movements go in anyway and the estimate says what it really costs,
  // rather than the app quietly handing back a day with one exercise on it.
  for (const item of ordered) {
    if (trimmed.length >= 3) break
    if (trimmed.some((t) => t.name === item.name)) continue
    trimmed.push(item.superset ? { ...item, superset: null } : item)
  }

  return trimmed
}

// The one focused group a day gains when it has none: core. Every other group
// belongs to a day of the split and turns up on its day, which is why
// emphasise reorders rather than adds. Core is different: it pairs with
// anything, recovers overnight, and the templates themselves sprinkle it into
// whole splits, yet push pull legs carries none at all, so somebody who asked
// to bring up their core could go a full week without a single rep of it. One
// movement, added before the time budget runs, so it competes fairly for a
// slot and, being focused, is the last thing the trim would take.
const CARRIES_ANYWHERE = ['Core']
const CARRY_FIRST = ['Plank', 'Dead Bug', 'Hanging Knee Raise']

function withCarriedFocus(
  items: PlannedItem[],
  profile: Profile,
  bans: Set<string>,
  used: Set<string>,
): PlannedItem[] {
  if (!items.length) return items
  const out = [...items]
  for (const group of focusOf(profile)) {
    if (!CARRIES_ANYWHERE.includes(group)) continue
    if (out.some((i) => groupOf(i.name) === group)) continue
    const pool = LIBRARY.filter(
      (e) => e.group === group && e.type !== 'C' && !used.has(e.name) && allowed(profile, e.name, bans),
    )
    // A named first choice, because the alphabet's first choice was the ab
    // wheel, which is a rough opener for somebody the plan just met.
    const pick =
      pool.find((e) => CARRY_FIRST.includes(e.name)) ??
      pool.sort((a, b) => a.name.localeCompare(b.name))[0]
    if (!pick) continue
    used.add(pick.name)
    out.push({ name: pick.name, type: pick.type, superset: null })
  }
  return out
}

// What somebody said they want to bring up, moved to the front.
//
// Order is the whole mechanism, and it is chosen over adding movements on
// purpose. Adding a hip thrust to a push day would break the split; putting
// the hip thrust that is already on leg day first changes what actually gets
// done, because the first thing in a session is the thing you do freshest and
// the thing you never skip. It is also what falls off last when the time
// budget bites, since the trim below walks this order.
//
// Stable within each half, so a day with nothing prioritised comes back
// exactly as the template wrote it. A superset moves as one unit, positioned
// by its first member, because half a circuit at the front and half at the
// back is not a circuit.
export function emphasise(items: PlannedItem[], focus: string[]): PlannedItem[] {
  if (!focus.length || !items.length) return items

  const wanted = new Set(focus)
  const hit = (item: PlannedItem) => {
    const group = groupOf(item.name)
    return !!group && wanted.has(group)
  }

  // Units: a run of items sharing a superset tag, or a single movement.
  const units: PlannedItem[][] = []
  const byTag = new Map<string, PlannedItem[]>()
  for (const item of items) {
    if (!item.superset) {
      units.push([item])
      continue
    }
    const existing = byTag.get(item.superset)
    if (existing) {
      existing.push(item)
      continue
    }
    const unit = [item]
    byTag.set(item.superset, unit)
    units.push(unit)
  }

  const front = units.filter((u) => u.some(hit))
  const back = units.filter((u) => !u.some(hit))
  return [...front, ...back].flat()
}

// A session for wherever you are standing, rather than for the gym on your
// profile.
//
// The travel problem is that equipment is stored as a fact about a person and
// a hotel makes it a fact about today. Nothing here touches the profile: the
// override lives for one build and tomorrow is normal. Everything else still
// applies on the road, deliberately, because a sore knee does not stay home,
// what you asked to bring up still comes first, and the time budget is the
// time budget wherever the dumbbells are.
//
// The kits are the access levels that already exist, because a hotel gym is a
// basic gym, a room with dumbbells is a home, and a room is a body.
// Any gym, including your own. This was three options because the only way to
// reach the session builder was to say you were away from home, so "full" was
// the one answer it could not take. That door is gone and your own gym is a
// perfectly ordinary answer to where you are training today.
export type AwayKit = Profile['access']

// Today's planned day, rebuilt for today's kit. The same build that made the
// day makes the away version, so the swaps land where a sore joint would send
// them and the session keeps its intent: a quad day in a hotel is still a quad
// day, on whatever the hotel has.
export function awayDayFor(day: TemplateDay, profile: Profile, kit: AwayKit): PlannedItem[] {
  return buildDay(day, { ...profile, access: kit })
}

// The groups a full body session covers, most expensive first, which is the
// order every template day is written in.
export const AWAY_FULL_BODY = ['Quads', 'Hamstrings', 'Glutes', 'Chest', 'Back', 'Shoulders', 'Core']

const AWAY_TIERS: RestTier[] = ['heavy', 'compound', 'isolation', 'cable', 'small']

// A session built from muscle groups and a kit, for somebody whose plan does
// not fit the room they are in.
//
// Round robin rather than group by group: every group gets its first movement
// before any group gets its second, so a short session in a bare room is still
// a session about everything that was asked for rather than four quad
// movements and an apology. Within a group the most expensive movement comes
// first, which is how the template days are written and the order a session
// should spend its freshness.
//
// A group the kit cannot serve is dropped rather than faked: there is no
// bodyweight biceps isolation worth pretending about, and a session that
// quietly skips it is more honest than one that invents towel curls.
export function awaySession(groups: string[], profile: Profile, kit: AwayKit): PlannedItem[] {
  const p = { ...profile, access: kit }
  const bans = banned(p)

  const pools = groups
    .map((group) =>
      LIBRARY.filter((e) => e.group === group && e.type !== 'C' && allowed(p, e.name, bans)).sort(
        (a, b) =>
          AWAY_TIERS.indexOf(restTier(a.name, a.type)) - AWAY_TIERS.indexOf(restTier(b.name, b.type)) ||
          a.name.localeCompare(b.name),
      ),
    )
    .filter((pool) => pool.length > 0)

  const goal = profile.goalChoice ? GOAL_FROM_CHOICE[profile.goalChoice] : 'muscle'
  const used = new Set<string>()
  const out: PlannedItem[] = []
  // Every group asked for gets its first movement before any group gets its
  // second, and that first pass ignores the clock. Somebody who says chest,
  // back, quads and shoulders and has half an hour should come away having
  // touched all four, over the estimate if it comes to it, rather than with a
  // tidy thirty minutes that never reached their shoulders.
  let round = 0
  while (out.length < CEILING) {
    let picked = false
    for (const pool of pools) {
      if (out.length >= CEILING) break
      const next = pool.find((e) => !used.has(e.name))
      if (!next) continue
      const item = { name: next.name, type: next.type, superset: null }
      if (round > 0 && !fits([...out, item], profile, goal)) return emphasise(out, focusOf(profile))
      used.add(next.name)
      out.push(item)
      picked = true
    }
    if (!picked) break
    round += 1
  }

  return emphasise(out, focusOf(profile))
}

export interface Plan {
  program: Program
  returning: boolean
  days: number
  capped: boolean
  splitName: string
  dayIds: string[]
  emptied: number
  legDays: 1 | 2
  // Everything they said they want, and the sentence explaining which of them
  // this week is actually doing.
  goals: GoalChoice[]
  goalCoverage: string | null
  // What they are bringing up, and what that does. Said on the plan screen so
  // the assumption is visible rather than working quietly in the background.
  focus: string[]
  focusNote: string | null
  perMuscle: string
  exercises: number
  reps: string
  sets: string
  block: boolean
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

// Two unless they said one. Three days a week has one either way, because a
// third of your week is not enough to split the lower body across.
export function legDaysOf(p: Profile): 1 | 2 {
  if ((p.days ?? 3) < 4) return 1
  return p.legDays === 1 ? 1 : 2
}

// The goal a person picks and the goal the coach can act on are not the same
// list. Leaning out and staying capable are both built on muscle work; saying
// so beats mapping them to something else without a word.
// The one name for the goal, everywhere a screen says it. The header pill,
// Settings and the profile page used to wear three vocabularies for the same
// stored value ('muscle', 'Muscle 6 to 12 reps', 'Build muscle'), which reads
// as three different settings to anybody who has not seen the code.
export function goalLabel(profile: Profile, goal: Goal): string {
  const choice = primaryGoal(profile)
  if (choice) return GOAL_CHOICES.find((c) => c.v === choice)?.label ?? choice
  return goal === 'strength' ? 'Get stronger' : goal === 'endurance' ? 'Stay capable' : 'Build muscle'
}

export const GOAL_FROM_CHOICE: Record<NonNullable<Profile['goalChoice']>, Goal> = {
  muscle: 'muscle',
  strength: 'strength',
  lean: 'muscle',
  health: 'endurance',
}

// People wanted to pick two of these. Almost always the two they wanted were
// building muscle and leaning out, which is one answer: they are the same
// training and the difference is what you eat. So rather than a multi select
// that would fork the prescriptions and give the coach two masters, every
// option says what it does, and the note afterwards says plainly what the
// choice does not cost you.
// The groups worth offering. Not every group in the library: nobody opens an
// app to bring up their forearms, and carries and cardio are not a body part.
export const FOCUS_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
]

// What the sex answer ticks to start with.
//
// This is the only thing that answer does, and it is deliberately a default
// rather than a rule: it is shown on the same screen, with the reason written
// underneath, and one tap changes it. A plan that quietly programmes different
// training for somebody based on a box they ticked is not the same thing as a
// plan that says what it assumed and offers to be corrected.
//
// The assumption itself is not physiology. The template distribution in this
// app, like most of them, gives the hips and hamstrings less room than women
// consistently say they want, and a first session with two chest movements and
// no glute work is where somebody decides an app was not built for them.
export function defaultFocus(sex: Profile['sex']): string[] {
  return sex === 'female' ? ['Glutes', 'Hamstrings'] : []
}

// What they said, or what was assumed for them until they say otherwise.
export function focusOf(p: Profile): string[] {
  if (p.focus) return p.focus.filter((g) => FOCUS_GROUPS.includes(g))
  return defaultFocus(p.sex)
}

export function focusNote(focus: string[]): string | null {
  if (!focus.length) return null
  const names = list(focus.map((g) => g.toLowerCase()))
  return `${cap(names)} come first in the session, while there is something left in the tank, and they are the last thing dropped when the clock runs out. Everything else in the week is unchanged.`
}

export const GOAL_CHOICES: {
  v: NonNullable<Profile['goalChoice']>
  label: string
  note: string
}[] = [
  { v: 'muscle', label: 'Build muscle', note: 'Moderate reps, weight added as it gets easy' },
  { v: 'strength', label: 'Get stronger', note: 'Fewer reps, heavier, longer rests' },
  { v: 'lean', label: 'Lean out', note: 'Lose fat, keep the muscle. Same training as build muscle' },
  { v: 'health', label: 'Stay capable', note: 'Lighter, more reps, kinder on the joints' },
]

const GOAL_NOTE: Record<NonNullable<Profile['goalChoice']>, string | null> = {
  muscle:
    'Building muscle and leaning out are the same training, so this covers both. What separates them is the kitchen, not the session: eat above what you burn and you gain, below it and you lean out, and either way the work in here is what keeps the muscle.',
  strength:
    'Getting stronger builds muscle too, just from the heavier end. If you want size more than numbers, build muscle is the same idea with more reps and shorter rests.',
  lean:
    'Leaning out is the same training as building muscle, and that is the point: lifting is what keeps the muscle while the fat comes off, so you end up smaller and stronger rather than just smaller. The kitchen does the losing. Nothing in here is a fat burning workout, because that is not a thing a workout does.',
  health:
    'Staying capable runs lighter and longer: easier loads, more reps, kinder joints, and a coach line that stops asking you to grind. It still builds muscle, just not as fast as chasing it would.',
}

export type GoalChoice = NonNullable<Profile['goalChoice']>

// Everything they said they want. A profile written before the list existed has
// the single answer only, and reads as a list of one.
// The list is in the order somebody wants things, first to last, so the front
// of it is the one steering.
export function goalsOf(p: Profile): GoalChoice[] {
  const all = p.goals?.length ? p.goals : p.goalChoice ? [p.goalChoice] : []
  // Profiles written when the primary was a separate question can have the one
  // that was steering sitting in the middle of the list. It moves to the front
  // rather than somebody's training quietly changing under them.
  if (p.goalChoice && all.includes(p.goalChoice) && all[0] !== p.goalChoice) {
    return promoteGoal(all, p.goalChoice)
  }
  return all
}

// The one steering: whatever they put first.
export function primaryGoal(p: Profile): GoalChoice | undefined {
  return goalsOf(p)[0]
}

// Moving something to the front is the whole of changing your mind. Nothing
// leaves the list, so the order is a plan rather than a series of decisions to
// abandon three things.
export function promoteGoal(goals: GoalChoice[], v: GoalChoice): GoalChoice[] {
  return [v, ...goals.filter((g) => g !== v)]
}

// Two goals that resolve to the same training are not a conflict, they are one
// answer written twice. Building muscle and leaning out are the obvious pair.
export function goalsAgree(choices: GoalChoice[]): boolean {
  return new Set(choices.map((c) => GOAL_FROM_CHOICE[c])).size <= 1
}

const GOAL_SHORT: Record<GoalChoice, string> = {
  muscle: 'moderate reps and weight added as it gets easy',
  strength: 'fewer reps, heavier, longer rests',
  lean: 'losing fat while the training keeps the muscle',
  health: 'lighter loads, more reps, kinder joints',
}

export const GOAL_LABEL: Record<GoalChoice, string> = {
  muscle: 'building muscle',
  strength: 'getting stronger',
  lean: 'leaning out',
  health: 'staying capable',
}

// What picking several of them actually means, said out loud. This is the whole
// point of letting somebody pick more than one: not to pretend the app is doing
// four things at once, but to know what they are for and say which are already
// covered and which are waiting.
export function goalCoverage(p: Profile): string | null {
  const all = goalsOf(p)
  const first = primaryGoal(p)
  if (!first || all.length < 2) return null

  if (goalsAgree(all)) {
    return `${cap(list(all.map((c) => GOAL_LABEL[c])))} are the same training, so you get all of them at once. What separates them is the kitchen, not the session.`
  }

  const covered = all.filter((c) => c !== first && GOAL_FROM_CHOICE[c] === GOAL_FROM_CHOICE[first])
  const waiting = all.filter((c) => GOAL_FROM_CHOICE[c] !== GOAL_FROM_CHOICE[first])

  // Opens by reflecting the whole list back rather than by naming the one thing
  // it is doing. Somebody who wants four things and is told which one they are
  // getting has been answered; somebody told nothing on their list is in
  // conflict has been understood, which is not the same and is what people
  // meant when they said the app did not identify with them.
  const parts = [
    'Nothing on your list cancels anything else out.',
    `${cap(GOAL_LABEL[first])} is first, so it sets the reps and the rests.`,
  ]
  if (covered.length) {
    parts.push(`${cap(list(covered.map((c) => GOAL_LABEL[c])))} comes with it, same training.`)
  }
  if (waiting.length === 1) {
    parts.push(
      `${cap(GOAL_LABEL[waiting[0]])} means ${GOAL_SHORT[waiting[0]]}, so that one is waiting rather than gone. Switch to it whenever you are ready in settings, and nothing you have logged changes.`,
    )
  } else if (waiting.length > 1) {
    parts.push(
      `${cap(GOAL_LABEL[waiting[0]])} is next, and it means ${GOAL_SHORT[waiting[0]]}. Then ${list(waiting.slice(1).map((c) => GOAL_LABEL[c]))}. Moving one to the front is a tap in settings whenever you are ready, and nothing you have logged changes.`,
    )
  }
  return parts.join(' ')
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function goalNoteFor(choice: Profile['goalChoice']): string {
  return GOAL_NOTE[choice ?? 'muscle'] ?? ''
}

// What the plan screen promises. Leaning out shows the same range as building
// muscle because it prescribes the same range: it used to say 8 to 15 while
// handing out 8 to 12, which is a small lie the screen told every time.
const REPS: Record<NonNullable<Profile['goalChoice']>, string> = {
  strength: '3 to 6',
  muscle: '6 to 12',
  lean: '6 to 12',
  health: '12 to 20',
}

export function planFor(profile: Profile, goal: Goal): Plan {
  const prog = program(profile)
  const back = returning(profile)
  const asked = profile.days ?? 3
  const days = Math.min(Math.max(asked, MIN_DAYS), MAX_DAYS)
  const choice = profile.goalChoice
  const legs = legDaysOf({ ...profile, days })
  const wanted =
    back && prog === 'Foundation' && RETURNER_DAYS[days]
      ? RETURNER_DAYS[days]
      : (legs === 1 ? ONE_LEG[prog][days] : undefined) ?? TABLE[prog][days]

  // A day the answers emptied is not a session, so it is not offered as one.
  // A red flagged shoulder on a bodyweight kit genuinely leaves nothing safe
  // for a chest day, and the honest response is a shorter week that says so,
  // rather than a card promising a workout and opening on nothing.
  // Three movements, not one. A day that survives with a single plank left in
  // it is not a session, it is a card promising a workout and opening on
  // almost nothing, which is the same dishonesty as opening on nothing at all.
  const MIN_SESSION = 3
  const built = new Map<string, number>()
  const dayIds = wanted.filter((id) => {
    const day = dayById(id)
    if (!day) return false
    const size = buildDay(day, { ...profile, days }).length
    built.set(id, size)
    return size >= MIN_SESSION
  })

  // What the plan actually contains, rather than what a table said it would.
  // The number of movements now falls out of the time somebody has and what
  // their sessions are made of, so it is read back off the sessions.
  const sizes = dayIds.map((id) => built.get(id) ?? 0)
  const typical = sizes.length ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0
  const emptied = wanted.length - dayIds.length

  return {
    program: prog,
    returning: back,
    days,
    capped: asked > MAX_DAYS,
    splitName: back && prog === 'Foundation' && days === 4 ? 'Full Body, building up' : SPLIT_NAME[prog][days],
    dayIds,
    // How many days the answers took off the week, so the plan screen can say
    // it out loud rather than quietly handing somebody a shorter week.
    emptied,
    legDays: legs,
    goals: goalsOf(profile),
    goalCoverage: goalCoverage(profile),
    focus: focusOf(profile),
    focusNote: focusNote(focusOf(profile)),
    perMuscle: days <= 2 ? '4 to 5' : days <= 3 ? '3 to 4' : days <= 5 ? '2 to 3' : '2',
    exercises: typical,
    reps: choice ? REPS[choice] : goal === 'strength' ? '3 to 6' : goal === 'endurance' ? '12 to 20' : '6 to 12',
    sets: prog === 'Foundation' || ageBand(profile) === 'over60' ? '2 to 3' : '3 to 4',
    block: prog === 'Performance',
    restNote:
      days === 6
        ? 'Six days is a lot of weeks in a row. The plan repeats rather than inventing new work, so a missed day is a day you have already done, and the seventh is a rest day on purpose.'
        : null,
    // Every choice says something now. Three of the four used to say nothing,
    // which is what made picking one feel like losing the others.
    goalNote: GOAL_NOTE[choice ?? 'muscle'],
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
