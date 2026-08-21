import { customGroups } from './custom'
import { restTier, type RestTier } from './rest'
import type { SetType } from './types'

export interface LibraryExercise {
  name: string
  type: SetType
  group: string
}

// name|type, grouped by muscle group. Type drives which inputs a set row shows.
const RAW: Record<string, string[]> = {
  Chest: [
    'Barbell Bench Press|W',
    'Incline Barbell Bench Press|W',
    'Decline Barbell Bench Press|W',
    'Dumbbell Bench Press|W',
    'Incline Dumbbell Press|W',
    'Decline Dumbbell Press|W',
    'Machine Chest Press|W',
    'Incline Machine Press|W',
    'Smith Machine Bench Press|W',
    'Smith Machine Incline Press|W',
    'Hammer Strength Chest Press|W',
    'Cable Fly|W',
    'Low to High Cable Fly|W',
    'High to Low Cable Fly|W',
    'Dumbbell Fly|W',
    'Incline Dumbbell Fly|W',
    'Pec Deck|W',
    'Push Up|R',
    'Weighted Push Up|W',
    'Deficit Push Up|R',
    'Dip|R',
    'Weighted Dip|W',
    'Svend Press|W',
    'Incline Push Up|R',
    'Knee Push Up|R',
    'Archer Push Up|R',
  ],
  Back: [
    'Deadlift|W',
    'Trap Bar Deadlift|W',
    'Rack Pull|W',
    'Barbell Row|W',
    'Pendlay Row|W',
    'Dumbbell Row|W',
    'Chest Supported Row|W',
    'Seal Row|W',
    'T Bar Row|W',
    'Seated Cable Row|W',
    'Wide Grip Cable Row|W',
    'Single Arm Cable Row|W',
    'Machine Row|W',
    'Hammer Strength Row|W',
    'Meadows Row|W',
    'Pull Up|R',
    'Weighted Pull Up|W',
    'Chin Up|R',
    'Weighted Chin Up|W',
    'Neutral Grip Pull Up|R',
    'Lat Pulldown|W',
    'Wide Grip Lat Pulldown|W',
    'Close Grip Lat Pulldown|W',
    'Single Arm Lat Pulldown|W',
    'Straight Arm Pulldown|W',
    'Cable Pullover|W',
    'Dumbbell Pullover|W',
    'Machine Pullover|W',
    'Inverted Row|R',
    'Back Extension|R',
    'Weighted Back Extension|W',
    'Reverse Hyper|W',
    'Assisted Pull Up|W',
    'Band Assisted Pull Up|R',
    'Negative Pull Up|R',
    'Scapular Pull Up|R',
  ],
  Shoulders: [
    'Overhead Press|W',
    'Seated Barbell Press|W',
    'Dumbbell Shoulder Press|W',
    'Seated Dumbbell Press|W',
    'Arnold Press|W',
    'Machine Shoulder Press|W',
    'Smith Machine Shoulder Press|W',
    'Landmine Press|W',
    'Push Press|W',
    'Z Press|W',
    'Lateral Raise|W',
    'Cable Lateral Raise|W',
    'Machine Lateral Raise|W',
    'Leaning Lateral Raise|W',
    'Front Raise|W',
    'Pike Push Up|R',
    'Handstand Push Up|R',
    'Plate Front Raise|W',
    'Rear Delt Fly|W',
    'Cable Rear Delt Fly|W',
    'Reverse Pec Deck|W',
    'Face Pull|W',
    'Upright Row|W',
    'Elevated Pike Push Up|R',
    'Wall Walk|R',
    'Wall Handstand Hold|T',
    'Band Pull Apart|R',
  ],
  Traps: [
    'Barbell Shrug|W',
    'Dumbbell Shrug|W',
    'Trap Bar Shrug|W',
    'Cable Shrug|W',
    'Machine Shrug|W',
    'Smith Machine Shrug|W',
    'Snatch Grip High Pull|W',
    'Kelso Shrug|W',
    'Barbell Upright Row|W',
    'Dumbbell Upright Row|W',
    'Cable Upright Row|W',
    'Overhead Shrug|W',
    'Prone Y Raise|W',
    'Dumbbell Shrug Hold|T',
  ],
  Biceps: [
    'Barbell Curl|W',
    'EZ Bar Curl|W',
    'Dumbbell Curl|W',
    'Alternating Dumbbell Curl|W',
    'Incline Dumbbell Curl|W',
    'Hammer Curl|W',
    'Cross Body Hammer Curl|W',
    'Preacher Curl|W',
    'Machine Preacher Curl|W',
    'Cable Curl|W',
    'Rope Cable Curl|W',
    'Bayesian Cable Curl|W',
    'Concentration Curl|W',
    'Spider Curl|W',
    'Drag Curl|W',
    'Zottman Curl|W',
    '21s|W',
  ],
  Triceps: [
    'Close Grip Bench Press|W',
    'Skull Crusher|W',
    'EZ Bar Skull Crusher|W',
    'Dumbbell Skull Crusher|W',
    'Overhead Cable Extension|W',
    'Rope Overhead Extension|W',
    'Single Arm Overhead Extension|W',
    'Dumbbell Overhead Extension|W',
    'Triceps Pushdown|W',
    'Rope Pushdown|W',
    'V Bar Pushdown|W',
    'Reverse Grip Pushdown|W',
    'Cable Kickback|W',
    'Dumbbell Kickback|W',
    'JM Press|W',
    'Bench Dip|R',
    'Diamond Push Up|R',
  ],
  Forearms: [
    'Wrist Curl|W',
    'Reverse Wrist Curl|W',
    'Behind Back Wrist Curl|W',
    'Reverse Curl|W',
    'Plate Pinch|T',
    'Dead Hang|T',
    'Wrist Roller|T',
    'Grip Crusher|R',
    'Towel Pull Up|R',
    'Fat Grip Hold|T',
    'Dumbbell Pronation|W',
    'Dumbbell Supination|W',
    'Farmer Hold|T',
  ],
  Quads: [
    'Back Squat|W',
    'Front Squat|W',
    'Goblet Squat|W',
    'Bodyweight Squat|R',
    'Hack Squat|W',
    'Machine Hack Squat|W',
    'Belt Squat|W',
    'Leg Press|W',
    'Single Leg Press|W',
    'Wide Stance Leg Press|W',
    'Sumo Squat|W',
    'Leg Extension|W',
    'Single Leg Extension|W',
    'Bulgarian Split Squat|W',
    'Split Squat|W',
    'Walking Lunge|W',
    'Reverse Lunge|W',
    'Step Up|W',
    'Sissy Squat|R',
    'Smith Machine Squat|W',
    'Cyclist Squat|W',
    'Wall Sit|T',
    'Box Squat|W',
    'Pistol Squat|R',
    'Cossack Squat|R',
    'Jump Squat|R',
  ],
  Hamstrings: [
    'Romanian Deadlift|W',
    'Dumbbell Romanian Deadlift|W',
    'Single Leg Romanian Deadlift|W',
    'Stiff Leg Deadlift|W',
    'Good Morning|W',
    'Lying Leg Curl|W',
    'Seated Leg Curl|W',
    'Standing Leg Curl|W',
    'Single Leg Curl|W',
    'Nordic Curl|R',
    'Glute Ham Raise|R',
    'Cable Pull Through|W',
    'Sumo Deadlift|W',
    'Deficit Deadlift|W',
    'Snatch Grip Romanian Deadlift|W',
    'B-Stance Romanian Deadlift|W',
    'Kettlebell Swing|W',
    '45 Degree Back Extension|R',
    'Razor Curl|R',
    'Stability Ball Leg Curl|R',
    'Slider Leg Curl|R',
    'Seated Single Leg Curl|W',
  ],
  Glutes: [
    'Hip Thrust|W',
    'Single Leg Hip Thrust|W',
    'Machine Hip Thrust|W',
    'Glute Bridge|W',
    'Cable Glute Kickback|W',
    'Machine Glute Kickback|W',
    'Hip Abduction|W',
    'Standing Hip Abduction|W',
    'Frog Pump|R',
    'Curtsy Lunge|W',
    'Barbell Hip Thrust|W',
    'Dumbbell Hip Thrust|W',
    'B-Stance Hip Thrust|W',
    'Kas Glute Bridge|W',
    'Single Leg Glute Bridge|R',
    'Glute Focused Back Extension|R',
    'Reverse Hyperextension|W',
    'Seated Hip Abduction|W',
    'Cable Hip Abduction|W',
    'Banded Lateral Walk|R',
    'Deficit Reverse Lunge|W',
    'Kneeling Squat|W',
  ],
  // Nothing in this library had the adductors as its primary target. What
  // trained them was scattered by its secondary effect: the Copenhagen Plank
  // filed under Core, the Cossack Squat under Quads, the Sumo Deadlift under
  // Hamstrings. So somebody looking for groin work found none, and the group
  // did not exist to file their own under either.
  //
  // Those three stay where they are. A movement is filed under the one thing
  // it mostly trains, and moving the Copenhagen Plank out of Core would change
  // what the every-day-gets-core rule can reach for. This group is the
  // movements that are adductor work first.
  //
  // Sumo Squat and Wide Stance Leg Press are in Quads for the same reason,
  // pointing the other way: they are adductor emphasis on a quad movement, and
  // filing them here would credit the adductors for sets the quads did.
  Adductors: [
    'Hip Adduction|W',
    'Seated Hip Adduction|W',
    'Standing Hip Adduction|W',
    'Cable Hip Adduction|W',
    'Side Lying Hip Adduction|R',
    'Adductor Squeeze|T',
    'Lateral Lunge|W',
  ],
  Calves: [
    'Standing Calf Raise|W',
    'Seated Calf Raise|W',
    'Leg Press Calf Raise|W',
    'Smith Machine Calf Raise|W',
    'Single Leg Calf Raise|W',
    'Donkey Calf Raise|W',
    'Tibialis Raise|R',
    'Jump Rope|T',
    'Standing Machine Calf Raise|W',
    'Hack Squat Calf Raise|W',
    'Dumbbell Calf Raise|W',
    'Barbell Calf Raise|W',
    'Eccentric Calf Raise|W',
  ],
  Core: [
    'Plank|T',
    'Side Plank|T',
    'RKC Plank|T',
    'Hollow Body Hold|T',
    'Copenhagen Plank|T',
    'Hanging Leg Raise|R',
    'Hanging Knee Raise|R',
    'Captains Chair Leg Raise|R',
    'Lying Leg Raise|R',
    'Cable Crunch|W',
    'Machine Crunch|W',
    'Crunch|R',
    'Bicycle Crunch|R',
    'Sit Up|R',
    'Weighted Sit Up|W',
    'Decline Sit Up|R',
    'Ab Wheel Rollout|R',
    'Pallof Press|W',
    'Cable Woodchop|W',
    'Russian Twist|R',
    'Dead Bug|R',
    'Bird Dog|R',
    'V Up|R',
    'Toes to Bar|R',
    'Dragon Flag|R',
    'Reverse Crunch|R',
    'Body Saw|R',
    'Bear Hold|T',
    'Bear Crawl|T',
    'Stir the Pot|R',
    'Hanging Windshield Wiper|R',
    'Landmine Rotation|W',
    'Weighted Plank|T',
    'Long Lever Plank|T',
    'Hollow Rock|R',
    'Standing Ab Wheel Rollout|R',
    'Dumbbell Side Bend|W',
    'Suitcase Hold|T',
    'High Plank|T',
    'Knee Plank|T',
    'Plank to Push Up|R',
    'Shoulder Tap Plank|R',
    'Mountain Climber|R',
    'Cross Body Mountain Climber|R',
    'Knee Side Plank|T',
    'Star Side Plank|T',
    'Side Plank Dip|R',
    'L-Sit|T',
    'Flutter Kick|R',
    'Toe Touch|R',
    'Stability Ball Crunch|R',
    'Stability Ball Rollout|R',
    'Barbell Rollout|R',
    'Renegade Row|W',
    'Medicine Ball Slam|R',
    'Suitcase Deadlift|W',
  ],
  Carries: [
    'Farmer Carry|WD',
    'Suitcase Carry|WD',
    'Front Rack Carry|WD',
    'Overhead Carry|WD',
    'Trap Bar Carry|WD',
    'Sandbag Carry|WD',
    'Sled Push|WD',
    'Sled Drag|WD',
    'Yoke Walk|WD',
    'Single Arm Overhead Carry|T',
  ],
  Cardio: [
    'Run|C',
    'Jog|C',
    'Treadmill Run|C',
    'Incline Walk|C',
    'Walk|C',
    'Sprints|C',
    'Row Erg|C',
    'Ski Erg|C',
    'Assault Bike|C',
    'Stationary Bike|C',
    'Cycling|C',
    'Elliptical|C',
    'Stair Climber|C',
    'Swim|C',
  ],
}

export const MUSCLE_GROUPS = Object.keys(RAW)

// The group your own movements are filed under. Not a muscle, which is why it
// is not in the list above, and a magic string written out in four places
// until a row needed to know whether it was yours.
export const MINE = 'My exercises'

export const LIBRARY: LibraryExercise[] = MUSCLE_GROUPS.flatMap((group) =>
  RAW[group].map((entry) => {
    const [name, type] = entry.split('|')
    return { name, type: type as SetType, group }
  }),
)

const BY_NAME = new Map(LIBRARY.map((e) => [e.name.toLowerCase(), e]))

export function lookupType(name: string): SetType | null {
  return BY_NAME.get(name.trim().toLowerCase())?.type ?? null
}

// The one group a movement is filed under, for the questions that only take
// one answer: what to offer as a substitute, where it sits in the running
// order, whether it rests like small work. A movement of your own can train
// several, and the first one you picked is the one that answers these.
// The spellings somebody might have meant by what they typed.
//
// The library spells everything singular, and the search was a plain substring
// match, so every plural came back empty: squats, curls, rows, dips, lunges,
// crunches, presses, mountain climbers. Nothing. The app told people a
// movement did not exist the moment they typed the way they talk, and at least
// one of them believed it and reported the gap.
//
// Three cheap rules rather than a stemmer, which would be a dependency and a
// lot of behaviour nobody asked for. Over-trimming is safe here because both
// users of this are forgiving: the search matches on a substring, so "raises"
// trimmed to "rais" still finds Lateral Raise.
function forms(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out = [q]
  // "flies" to "fly", before the plainer rules take the y off.
  if (q.length > 3 && q.endsWith('ies')) out.push(`${q.slice(0, -3)}y`)
  // "crunches" to "crunch", "presses" to "press".
  if (q.length > 2 && q.endsWith('es')) out.push(q.slice(0, -2))
  // "squats" to "squat", "pull ups" to "pull up", "raises" to "raise".
  if (q.length > 1 && q.endsWith('s')) out.push(q.slice(0, -1))
  return out
}

export function matchesQuery(name: string, query: string): boolean {
  if (!query.trim()) return true
  const n = name.toLowerCase()
  return forms(query).some((f) => n.includes(f))
}

// Whether what somebody typed is already the whole name of a movement, which
// is what decides whether a screen offers to create it.
//
// Plural tolerant for the same reason the search is, and for a sharper one:
// typing "squats", being told nothing matched and creating a movement called
// squats leaves it sitting next to Squat forever, splitting every count that
// reads either of them.
export function isExistingName(name: string, query: string): boolean {
  const n = name.trim().toLowerCase()
  return forms(query).some((f) => f === n)
}

export function groupOf(name: string): string | null {
  const own = customGroups(name)
  if (own.length) return own[0]
  return BY_NAME.get(name.trim().toLowerCase())?.group ?? null
}

// Everything it trains, which is what the weekly count needs. A library
// movement trains the one thing it is filed under; a movement somebody typed
// in says so itself, and every group it names gets the sets.
export function groupsOf(name: string): string[] {
  const own = customGroups(name)
  if (own.length) return own
  const filed = BY_NAME.get(name.trim().toLowerCase())?.group
  return filed ? [filed] : []
}

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

// Names the keyword rules below get wrong.
const EQUIPMENT_OVERRIDES: Record<string, Equipment> = {
  // The classifier reads names, and these names do not mention the machine
  // they are done on. That was not cosmetic: a home gym leg day came back as
  // Goblet Squat, Single Leg Extension, Walking Lunge, Leg Extension, Standing
  // Calf Raise, which is a leg extension twice and three machines nobody in a
  // spare room owns. Equipment decides what a plan may offer, so a movement
  // whose name hides its equipment has to say so here.
  'Leg Extension': 'machine',
  'Single Leg Extension': 'machine',
  'Lying Leg Curl': 'machine',
  'Seated Leg Curl': 'machine',
  'Standing Leg Curl': 'machine',
  'Single Leg Curl': 'machine',
  'Standing Calf Raise': 'machine',
  'Seated Calf Raise': 'machine',
  'Donkey Calf Raise': 'machine',
  'Eccentric Calf Raise': 'bodyweight',
  // And the other way: a split squat is a dumbbell movement that happens to
  // contain the word squat, and it is the single most useful leg exercise
  // somebody with a bench and a pair of dumbbells has.
  'Bulgarian Split Squat': 'dumbbell',
  'Split Squat': 'dumbbell',
  'Assisted Pull Up': 'machine',
  'Band Assisted Pull Up': 'bodyweight',
  'Stir the Pot': 'bodyweight',
  'Body Saw': 'bodyweight',
  'Hollow Rock': 'bodyweight',
  'Standing Ab Wheel Rollout': 'bodyweight',
  'Reverse Crunch': 'bodyweight',
  'Landmine Rotation': 'barbell',
  'Suitcase Hold': 'dumbbell',
  'Box Squat': 'barbell',
  'Bear Hold': 'bodyweight',
  'Elevated Pike Push Up': 'bodyweight',
  'Wall Walk': 'bodyweight',
  'Wall Handstand Hold': 'bodyweight',
  'Band Pull Apart': 'bodyweight',
  'High Plank': 'bodyweight',
  'Knee Plank': 'bodyweight',
  'Plank to Push Up': 'bodyweight',
  'Shoulder Tap Plank': 'bodyweight',
  'Knee Side Plank': 'bodyweight',
  'Star Side Plank': 'bodyweight',
  'Side Plank Dip': 'bodyweight',
  'L-Sit': 'bodyweight',
  'Flutter Kick': 'bodyweight',
  'Toe Touch': 'bodyweight',
  'Stability Ball Crunch': 'bodyweight',
  'Stability Ball Rollout': 'bodyweight',
  'Barbell Rollout': 'barbell',
  'Renegade Row': 'dumbbell',
  'Medicine Ball Slam': 'other',
  'Suitcase Deadlift': 'dumbbell',
  'Single Arm Overhead Carry': 'dumbbell',
  'Bear Crawl': 'bodyweight',
  'Pistol Squat': 'bodyweight',
  'Cossack Squat': 'bodyweight',
  'Jump Squat': 'bodyweight',
  'Long Lever Plank': 'bodyweight',
  'Hanging Windshield Wiper': 'bodyweight',
  'Negative Pull Up': 'bodyweight',
  'Scapular Pull Up': 'bodyweight',
  'Archer Push Up': 'bodyweight',
  // A bench, a machine or a floor, none of which the name says out loud. This
  // matters more than it looks: equipment decides what a plan may offer, so a
  // hip abduction machine filed as a dumbbell gets programmed for somebody who
  // has a pair of dumbbells and no machine.
  '45 Degree Back Extension': 'bodyweight',
  'Glute Focused Back Extension': 'bodyweight',
  'Reverse Hyperextension': 'machine',
  'Seated Hip Abduction': 'machine',
  'Seated Single Leg Curl': 'machine',
  'Hack Squat Calf Raise': 'machine',
  'Razor Curl': 'bodyweight',
  'Stability Ball Leg Curl': 'bodyweight',
  'Slider Leg Curl': 'bodyweight',
  'Single Leg Glute Bridge': 'bodyweight',
  'Kas Glute Bridge': 'barbell',
  'Kneeling Squat': 'barbell',
  'Overhead Shrug': 'barbell',
  'Dip': 'bodyweight',
  'Weighted Dip': 'bodyweight',
  'Bench Dip': 'bodyweight',
  'Goblet Squat': 'dumbbell',
  'Bodyweight Squat': 'bodyweight',
  'Sissy Squat': 'bodyweight',
  'Wall Sit': 'bodyweight',
  'Belt Squat': 'machine',
  'Leg Press': 'machine',
  'Single Leg Press': 'machine',
  'Leg Press Calf Raise': 'machine',
  'Hack Squat': 'machine',
  'Pec Deck': 'machine',
  'Reverse Pec Deck': 'machine',
  'Hip Abduction': 'machine',
  'Standing Hip Abduction': 'machine',
  'Reverse Hyper': 'machine',
  'Glute Ham Raise': 'bodyweight',
  'Nordic Curl': 'bodyweight',
  'Back Extension': 'bodyweight',
  'Inverted Row': 'bodyweight',
  'Frog Pump': 'bodyweight',
  'Glute Bridge': 'bodyweight',
  'Single Leg Calf Raise': 'bodyweight',
  'Tibialis Raise': 'bodyweight',
  'Dead Hang': 'bodyweight',
  'Jump Rope': 'bodyweight',
  'Hip Thrust': 'barbell',
  'Single Leg Hip Thrust': 'bodyweight',
  'Trap Bar Carry': 'barbell',
  'Farmer Carry': 'dumbbell',
  'Suitcase Carry': 'dumbbell',
  'Front Rack Carry': 'dumbbell',
  'Overhead Carry': 'dumbbell',
  'Sandbag Carry': 'other',
  'Yoke Walk': 'other',
  'Plate Pinch': 'other',
  'Wrist Roller': 'other',
  'Grip Crusher': 'other',
  'Svend Press': 'other',
  'Landmine Press': 'barbell',
  'Z Press': 'barbell',
  '21s': 'barbell',
}

const BODYWEIGHT_WORDS = [
  'Push Up', 'Pull Up', 'Chin Up', 'Plank', 'Hollow', 'Hanging', 'Sit Up', 'Crunch', 'Russian Twist',
  'Dead Bug', 'Bird Dog', 'V Up', 'Toes to Bar', 'Dragon Flag', 'Ab Wheel', 'Captains Chair',
  'Lying Leg Raise', 'Bicycle', 'Run', 'Jog', 'Walk', 'Sprints', 'Swim',
]

// Derived from the name, which is imprecise but keeps 226 movements from
// needing a hand written tag each. The overrides above carry the exceptions.
export function equipmentOf(name: string): Equipment {
  const n = name.trim()
  if (EQUIPMENT_OVERRIDES[n]) return EQUIPMENT_OVERRIDES[n]
  if (/Machine|Hammer Strength|Smith|Erg|Assault Bike|Stationary Bike|Elliptical|Stair Climber|Treadmill/i.test(n)) return 'machine'
  if (/Cable|Pulldown|Pushdown|Rope|Face Pull|Pull Through|Woodchop|Pallof/i.test(n)) return 'cable'
  if (/Dumbbell|Goblet|Arnold|Concentration|Zottman|Hammer Curl|Cross Body/i.test(n)) return 'dumbbell'
  if (/Barbell|EZ Bar|Trap Bar|Deadlift|Squat|Shrug|Good Morning|Rack Pull|Snatch|Skull Crusher|Upright Row|Overhead Press|Push Press|Bench Press|JM Press|Preacher|Drag Curl|Spider Curl|Reverse Curl|Wrist Curl|Meadows|Seal Row|Pendlay|T Bar/i.test(n)) return 'barbell'
  if (BODYWEIGHT_WORDS.some((w) => n.includes(w))) return 'bodyweight'
  if (/Sled|Cycling/i.test(n)) return 'other'
  return 'dumbbell'
}

// Movements worth offering instead of this one. Same muscle group, because
// that is what a substitute has to be, ordered by how close the swap is.
//
// Closeness is mostly how much effort the movement takes, which is a better
// proxy for the pattern than equipment: swapping a bench press, a dumbbell
// press should be offered before a cable fly, and both of those train the
// chest with the same set type off different kit. So the rest tiers are
// treated as a scale and scored on the distance between them, with the same
// set type and the same equipment as tie breakers.
const TIER_ORDER: RestTier[] = ['heavy', 'compound', 'isolation', 'cable', 'small']

export function similarTo(name: string, extra: LibraryExercise[] = []): LibraryExercise[] {
  const group = groupOf(name)
  if (!group) return []
  const type = lookupType(name)
  const kit = equipmentOf(name)
  const tier = TIER_ORDER.indexOf(restTier(name, type ?? 'W'))

  return [...extra, ...LIBRARY]
    .filter((e) => e.group === group && e.name !== name)
    .map((e) => {
      const distance = Math.abs(TIER_ORDER.indexOf(restTier(e.name, e.type)) - tier)
      return {
        e,
        score:
          Math.max(0, 4 - distance) * 4 +
          (lookupType(e.name) === type ? 2 : 0) +
          (equipmentOf(e.name) === kit ? 1 : 0),
      }
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .map((x) => x.e)
}

// How much strength a movement assumes you already have.
//
// The library grew a full ladder of bodyweight work and the substitution had
// no way to read it, so a beginner with no equipment was handed Weighted Push
// Ups, Weighted Dips and Handstand Push Ups, and an experienced lifter with
// the same kit got the identical session. Similarity alone cannot tell those
// apart: a handstand push up is extremely similar to a push up.
//
// Hand written rather than inferred from the name, because Weighted is a
// reliable signal and almost nothing else is. Single Arm makes a cable row
// no harder and a push up nearly impossible.
export type Demand = 'gentle' | 'normal' | 'demanding'

const DEMANDING = new Set([
  'Weighted Push Up', 'Weighted Dip', 'Weighted Pull Up', 'Weighted Chin Up',
  'Handstand Push Up', 'Archer Push Up', 'Deficit Push Up',
  'Pull Up', 'Chin Up', 'Neutral Grip Pull Up', 'Towel Pull Up', 'Dip',
  'Toes to Bar', 'Dragon Flag', 'L-Sit', 'Hanging Windshield Wiper',
  'Standing Ab Wheel Rollout', 'Long Lever Plank', 'Star Side Plank', 'Body Saw',
  'Pistol Squat', 'Cossack Squat', 'Sissy Squat', 'Nordic Curl', 'Razor Curl',
  'Glute Ham Raise', 'Dragon Flag', 'Snatch Grip High Pull', 'Snatch Grip Romanian Deadlift',
  'Z Press', 'Deficit Deadlift', 'Copenhagen Plank', 'Barbell Rollout',
  'Wall Walk', 'Wall Handstand Hold',
])

const GENTLE = new Set([
  'Elevated Pike Push Up', 'Band Pull Apart',
  'Knee Push Up', 'Incline Push Up', 'Band Assisted Pull Up', 'Assisted Pull Up',
  'Negative Pull Up', 'Scapular Pull Up', 'Inverted Row',
  'Bodyweight Squat', 'Box Squat', 'Wall Sit', 'Glute Bridge', 'Bird Dog', 'Dead Bug',
  'Knee Plank', 'Knee Side Plank', 'High Plank', 'Crunch', 'Walk', 'Jog',
])

export function demandOf(name: string): Demand {
  if (DEMANDING.has(name)) return 'demanding'
  if (GENTLE.has(name)) return 'gentle'
  return 'normal'
}

const DEMAND_ORDER: Demand[] = ['gentle', 'normal', 'demanding']

export function demandRank(name: string): number {
  return DEMAND_ORDER.indexOf(demandOf(name))
}
