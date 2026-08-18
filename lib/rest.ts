import { equipmentOf, groupOf } from './exercises'
import type { Goal, SetEntry, SetType } from './types'

// A set is done when the fields that matter for its type have something in them.
// Half a set is not a set, and should not start the clock.
export function isFullSet(set: SetEntry, type: SetType): boolean {
  switch (type) {
    case 'W':
      return set.w != null && set.r != null
    case 'R':
      return set.r != null
    case 'T':
      return set.t != null
    case 'WD':
      return set.w != null && set.d != null
    case 'C':
      return set.t != null
    default:
      return !!set.raw
  }
}

// How long the clock should run, by what the movement actually costs you.
//
// The old split was compound or not, which put a plate loaded shoulder press
// and a barbell squat on the same clock. What drives recovery is closer to
// three things: how much muscle the movement asks for, how many joints it
// crosses, and whether you are also holding yourself up under the load.
//
// The evidence, and where these numbers come from:
//
// ACSM's position stand on progression models recommends at least 2 to 3
// minutes for core exercises under heavier loads, and 1 to 2 minutes for
// assistance exercises. Schoenfeld et al. (2016) put trained men on identical
// programs at 1 minute versus 3 minutes of rest for 8 weeks; the 3 minute
// group gained more strength on squat and bench and more muscle thickness,
// which killed the older idea that short rest buys hypertrophy through
// metabolic stress. Grgic et al. (2017) reviewed short versus long rest and
// found longer intervals favour people with training experience, while either
// works for beginners. For single joint work, 60 to 90 seconds is the common
// recommendation and is enough, because a movement crossing one joint leaves
// far less systemic fatigue behind it.
//
// Those studies chase the most a single session can give you, and they buy it
// with time. Somebody training most days, supersetting the accessories, is
// buying the same weekly volume a different way, and a three minute stand
// around is not the shape of that session. So the ladder is scaled to fit:
// two minutes at the top rather than three, ninety seconds on supported and
// machine compounds, forty five on cable isolation. The shape of the evidence
// is kept, which is that these tiers are genuinely different, and one number
// for "compound" cannot express the distance between a back squat and a plate
// loaded press.
//
// Every one of these is a suggestion with a manual button beside it.
export type RestTier = 'heavy' | 'compound' | 'isolation' | 'cable' | 'small'

// Single joint. One joint moving means one muscle working and a body that has
// barely noticed.
const ISOLATION =
  /Fly|Raise|Curl|Extension|Pushdown|Pressdown|Kickback|Shrug|Crunch|Pullover|Face Pull|Rear Delt|Pec Deck|Adduction|Abduction|Skull Crusher|Reverse Hyper|Back Extension|Pull Through|Woodchop|Pallof|Shoulder External|Sit Up|Leg Raise|Twist|Straight Arm Pulldown/i

// Held up by a bench, a frame or a track, so the load is going through the
// muscle rather than through you.
const SUPPORTED = /Machine|Smith|Hammer Strength|Pec Deck|Assisted|Chest Supported|Seated Row|Lever/i

// Machines and implements that still take a near max effort out of you. A leg
// press is supported, but it is also the heaviest thing most people will move
// all week, and a sled leaves you on your hands and knees. Being held up by a
// frame does not make these an accessory.
const HEAVY_MACHINE =
  /Leg Press|Hack Squat|Belt Squat|Smith Machine Squat|Sled|Yoke|Nordic Curl|Glute Ham Raise/i

// Multi joint, but moving your own bodyweight or close to it. A push up and a
// bench press are the same pattern and nothing like the same effort.
const LIGHT =
  /Push Up|Bodyweight Squat|Inverted Row|Bench Dip|Glute Bridge|Frog Pump|Wall Sit|Svend|21s|Dead Bug|Bird Dog/i

// The whole body is under it: a bar on your back or in your hands, your spine
// holding the position, and a walk back to the rack afterwards.
const HEAVY =
  /Back Squat|Front Squat|Overhead Squat|Zercher|Deadlift|Rack Pull|Good Morning|Barbell Row|Pendlay|T Bar Row|Meadows|Seal Row|Barbell Bench|Close Grip Bench|Overhead Press|Push Press|Seated Barbell Press|Weighted Dip|Weighted Pull Up|Weighted Chin Up|Weighted Push Up|Trap Bar|Snatch|Clean|High Pull|Hip Thrust|Carry|Farmer/i

// One limb at a time, or a dumbbell in each hand, means a fraction of the load
// and a fraction of the recovery. A dumbbell Romanian deadlift is not the
// barbell one, and neither is a single leg anything.
const LIGHTER = /Single Leg|Single Arm|Dumbbell|Goblet|Sissy|Cyclist|Lunge|Step Up|Split Squat|Landmine/i

// Recovered before you have finished putting the weight down.
const SMALL_GROUPS = ['Core', 'Calves', 'Forearms']

// What kind of work this is. Order matters: a machine shoulder press is a
// supported compound even though "Press" also appears in the heavy list, and a
// cable curl is cable work even though every curl is single joint.
export function restTier(name: string, type: SetType): RestTier {
  if (type === 'C') return 'small'
  if (SMALL_GROUPS.includes(groupOf(name) ?? '')) return 'small'

  // Weighted bodyweight work is checked before the light list, so a weighted
  // push up is not filed next to a bodyweight one.
  if (/^Weighted |Weighted /.test(name) && HEAVY.test(name)) return 'heavy'
  // A static hold is over when you fall out of it, and you are ready again
  // almost immediately. Loaded carries are the exception and are caught above.
  if (type === 'T' && !HEAVY.test(name)) return 'small'
  if (LIGHT.test(name)) return 'isolation'
  // A single leg press is not a leg press, so the unilateral guard has to run
  // here rather than further down where it would already have been claimed.
  if (HEAVY_MACHINE.test(name) && !LIGHTER.test(name)) return 'heavy'

  const isolation = ISOLATION.test(name)
  if (isolation) return equipmentOf(name) === 'cable' || SUPPORTED.test(name) ? 'cable' : 'isolation'

  if (SUPPORTED.test(name)) return 'compound'
  if (LIGHTER.test(name)) return 'compound'
  if (HEAVY.test(name)) return 'heavy'
  return 'compound'
}

// Seconds per tier, per goal. Strength needs to be able to repeat the effort,
// so it sits at the top of every band; endurance work is short by definition.
const REST: Record<Goal, Record<RestTier, number>> = {
  strength: { heavy: 180, compound: 120, isolation: 90, cable: 60, small: 45 },
  muscle: { heavy: 120, compound: 90, isolation: 60, cable: 45, small: 30 },
  endurance: { heavy: 75, compound: 60, isolation: 45, cable: 30, small: 30 },
}

// What the week asks for is the app's own read on how hard today is meant to
// be, and how hard a set was is the only other thing that decides how long you
// need after it. A peak week where last sets go to the end earns more rest than
// a groove week spent finding the loads; a deload earns less.
//
// Rounded to fifteen seconds because a timer reading 113 is false precision on
// a number this soft, and floored at thirty because nothing is worth less.
export function scaleRest(seconds: number, factor: number): number {
  if (seconds <= 0) return 0
  return Math.max(30, Math.round((seconds * factor) / 15) * 15)
}

export function restFor(name: string, type: SetType, goal: Goal, factor = 1): number {
  if (type === 'C') return 0
  return scaleRest(REST[goal][restTier(name, type)], factor)
}

// Kept for the ordering rules, which sort multi joint work to the front of a
// session. Rest cares about five tiers; order only cares about two.
export function isCompound(name: string): boolean {
  const tier = restTier(name, 'W')
  return tier === 'heavy' || tier === 'compound'
}

export interface RestState {
  exerciseId: string
  name: string
  endsAt: number
  total: number
}

export const REST_KEY = 'training-log-rest'
