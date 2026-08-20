import { lookupType } from './exercises'
import type { CustomWorkoutItem } from './types'

// A day is a list of entries. A plain string is one movement; a nested array is
// a superset, the movements run together with no rest between them.
export type TemplateEntry = string | string[]

export interface TemplateDay {
  id: string
  name: string
  exercises: TemplateEntry[]
}

export interface TemplateSplit {
  id: string
  name: string
  note: string
  days: TemplateDay[]
}

// Baked into every day of the 4 and 5 day splits. It is a circuit by
// name, so it is a superset by structure: straight through, then rest.
const CORE: TemplateEntry = ['Hanging Leg Raise', 'Cable Crunch', 'Pallof Press', 'Plank']

// These carry the ordinary movements, squats and hinges included. Somebody who
// flags a sore knee or a bad back in the questionnaire never sees them: banned()
// takes them out and alternative() puts a leg press or a curl in their place,
// per person, at the moment the day is built. That is the right place for it.
// The templates used to hardcode one person's knee for everybody.
export const SPLITS: TemplateSplit[] = [
  {
    id: 'summer4',
    name: '4 Day Split',
    note: 'Push, pull, legs and an upper mix, core circuit every day',
    days: [
      {
        id: 'summer4-push',
        name: 'Incline Push',
        exercises: [
          'Incline Dumbbell Press',
          'Machine Chest Press',
          'Seated Dumbbell Press',
          'Cable Fly',
          'Lateral Raise',
          'Rope Pushdown',
          'Overhead Cable Extension',
          CORE,
        ],
      },
      {
        id: 'summer4-pull',
        name: 'Vertical Pull',
        exercises: [
          'Weighted Pull Up',
          'Chest Supported Row',
          'Seated Cable Row',
          'Straight Arm Pulldown',
          'Face Pull',
          'Incline Dumbbell Curl',
          'Hammer Curl',
          CORE,
        ],
      },
      {
        id: 'summer4-legs',
        name: 'Squat Led Legs',
        exercises: [
          'Back Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Seated Leg Curl',
          'Bulgarian Split Squat',
          'Standing Calf Raise',
          CORE,
        ],
      },
      {
        id: 'summer4-upper',
        name: 'Upper Mix',
        exercises: [
          'Incline Barbell Bench Press',
          'Single Arm Cable Row',
          'Machine Shoulder Press',
          'Cable Lateral Raise',
          'Reverse Pec Deck',
          'Cable Curl',
          'Triceps Pushdown',
          CORE,
        ],
      },
    ],
  },
  {
    id: 'five',
    name: '5 Day Split',
    note: 'A muscle group a day, core circuit every day',
    days: [
      {
        id: 'five-chest',
        name: 'Chest and Triceps',
        exercises: [
          'Incline Dumbbell Press',
          'Machine Chest Press',
          'Incline Machine Press',
          'Cable Fly',
          'Weighted Dip',
          'Rope Pushdown',
          'Skull Crusher',
          CORE,
        ],
      },
      {
        id: 'five-back',
        name: 'Back and Biceps',
        exercises: [
          'Weighted Pull Up',
          'Chest Supported Row',
          'Wide Grip Lat Pulldown',
          'Single Arm Cable Row',
          'Straight Arm Pulldown',
          'Incline Dumbbell Curl',
          'Cable Curl',
          CORE,
        ],
      },
      {
        id: 'five-legs',
        name: 'Machine Led Legs',
        exercises: [
          'Leg Press',
          'Seated Leg Curl',
          'Leg Extension',
          'Bulgarian Split Squat',
          'Hip Thrust',
          'Seated Calf Raise',
          CORE,
        ],
      },
      {
        id: 'five-shoulders',
        name: 'Shoulders and Arms',
        exercises: [
          'Seated Dumbbell Press',
          'Cable Lateral Raise',
          'Leaning Lateral Raise',
          'Reverse Pec Deck',
          'Face Pull',
          'Hammer Curl',
          'Overhead Cable Extension',
          CORE,
        ],
      },
      {
        id: 'five-quads',
        name: 'Quad Dominant Legs',
        exercises: [
          'Back Squat',
          'Leg Press',
          'Bulgarian Split Squat',
          'Leg Extension',
          'Standing Calf Raise',
          CORE,
        ],
      },
      {
        id: 'five-posterior',
        name: 'Glute Dominant Legs',
        exercises: [
          'Romanian Deadlift',
          'Hip Thrust',
          'Seated Leg Curl',
          'Lying Leg Curl',
          'Seated Calf Raise',
          CORE,
        ],
      },
      // Kept because somebody's saved week may still point at them. Neither is
      // handed out by the plan any more: five-legs became the two days above,
      // and the upper pump day is what made room for the second of them.
      {
        id: 'five-pump',
        name: 'Upper Pump',
        exercises: [
          'Incline Barbell Bench Press',
          'Seated Cable Row',
          'Machine Shoulder Press',
          'Pec Deck',
          'Machine Row',
          'Preacher Curl',
          'V Bar Pushdown',
          CORE,
        ],
      },
    ],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    note: 'One muscle group a day, five days',
    days: [
      {
        id: 'bro-chest',
        name: 'Chest',
        exercises: [
          'Barbell Bench Press',
          'Incline Dumbbell Press',
          'Machine Chest Press',
          'Cable Fly',
          'Pec Deck',
          'Weighted Dip',
        ],
      },
      {
        id: 'bro-back',
        name: 'Back',
        exercises: [
          'Pull Up',
          'Barbell Row',
          'Lat Pulldown',
          'Seated Cable Row',
          'Straight Arm Pulldown',
          'Barbell Shrug',
        ],
      },
      {
        id: 'bro-shoulders',
        name: 'Shoulders',
        exercises: [
          'Overhead Press',
          'Seated Dumbbell Press',
          'Lateral Raise',
          'Cable Lateral Raise',
          'Reverse Pec Deck',
          'Face Pull',
        ],
      },
      {
        id: 'bro-arms',
        name: 'Arms',
        exercises: [
          'Barbell Curl',
          'Incline Dumbbell Curl',
          'Hammer Curl',
          'Close Grip Bench Press',
          'Rope Pushdown',
          'Overhead Cable Extension',
        ],
      },
      {
        id: 'bro-legs',
        name: 'Quads and Hamstrings',
        exercises: [
          'Back Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Lying Leg Curl',
          'Leg Extension',
          'Standing Calf Raise',
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    note: 'Three days, run once or twice a week',
    days: [
      {
        id: 'ppl-push',
        name: 'Push',
        exercises: [
          'Barbell Bench Press',
          'Seated Dumbbell Press',
          'Incline Dumbbell Press',
          'Lateral Raise',
          'Rope Pushdown',
          'Overhead Cable Extension',
        ],
      },
      {
        id: 'ppl-pull',
        name: 'Pull',
        exercises: [
          'Pull Up',
          'Barbell Row',
          'Lat Pulldown',
          'Face Pull',
          'Barbell Curl',
          'Hammer Curl',
        ],
      },
      {
        id: 'ppl-legs',
        name: 'Legs',
        exercises: [
          'Back Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Seated Leg Curl',
          'Leg Extension',
          'Standing Calf Raise',
        ],
      },
    ],
  },
  {
    id: 'ul',
    name: 'Upper Lower',
    note: 'Four days, two upper and two lower',
    days: [
      {
        id: 'ul-upper-a',
        name: 'Upper A',
        exercises: [
          'Barbell Bench Press',
          'Barbell Row',
          'Seated Dumbbell Press',
          'Lat Pulldown',
          'Barbell Curl',
          'Rope Pushdown',
        ],
      },
      {
        id: 'ul-lower-a',
        name: 'Quad Dominant Legs',
        exercises: [
          'Back Squat',
          'Leg Press',
          'Bulgarian Split Squat',
          'Leg Extension',
          'Standing Calf Raise',
          'Hanging Leg Raise',
        ],
      },
      {
        id: 'ul-upper-b',
        name: 'Upper B',
        exercises: [
          'Incline Dumbbell Press',
          'Weighted Pull Up',
          'Machine Chest Press',
          'Seated Cable Row',
          'Cable Lateral Raise',
          'Incline Dumbbell Curl',
        ],
      },
      {
        id: 'ul-lower-b',
        name: 'Glute Dominant Legs',
        exercises: [
          'Romanian Deadlift',
          'Hip Thrust',
          'Lying Leg Curl',
          'Seated Leg Curl',
          'Seated Calf Raise',
          'Cable Crunch',
        ],
      },
    ],
  },
  {
    id: 'fb',
    name: 'Full Body',
    note: 'Three days, everything every session',
    days: [
      {
        id: 'fb-a',
        name: 'Full Body A',
        exercises: [
          'Back Squat',
          'Barbell Bench Press',
          'Barbell Row',
          'Lateral Raise',
          'Cable Curl',
          'Plank',
        ],
      },
      {
        id: 'fb-b',
        name: 'Full Body B',
        exercises: [
          'Romanian Deadlift',
          'Overhead Press',
          'Lat Pulldown',
          'Leg Press',
          'Rope Pushdown',
          'Hanging Leg Raise',
        ],
      },
      {
        id: 'fb-c',
        name: 'Full Body C',
        exercises: [
          'Leg Press',
          'Incline Dumbbell Press',
          'Seated Cable Row',
          'Seated Leg Curl',
          'Hammer Curl',
          'Cable Crunch',
        ],
      },
    ],
  },
]

export function dayItems(day: TemplateDay): CustomWorkoutItem[] {
  const out: CustomWorkoutItem[] = []
  day.exercises.forEach((entry, i) => {
    if (typeof entry === 'string') {
      out.push({ name: entry, type: lookupType(entry) ?? 'W', superset: null })
      return
    }
    const tag = `${day.id}-ss${i}`
    for (const name of entry) out.push({ name, type: lookupType(name) ?? 'W', superset: tag })
  })
  return out
}

export function dayNames(day: TemplateDay): string[] {
  return day.exercises.flat()
}
