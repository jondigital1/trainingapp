// The questions both screens ask.
//
// Signup and Settings ask the same things, and they each wrote out their own
// copy of the wording and the choices. The copies drifted, as copies do, and
// the drift was all in one direction: the guidance lived at signup and was
// quietly missing later. Three days was labelled "the sweet spot" when you
// first chose it and was a bare "3 days" when you changed your mind; "No
// limit" explained that nothing gets trimmed on the way in and explained
// nothing on the way back. Settings even asked how long you have got in two
// places with two different answers available.
//
// One definition each, read by both. If a question is worth explaining once it
// is worth explaining wherever it is asked.
import { LONG_SESSION } from './onboarding'
import type { Profile } from './onboarding'
import type { Unit } from './units'

export interface Question<T extends string | number> {
  label: string
  hint?: string
  columns?: 1 | 2
  options: { v: T; label: string; note?: string }[]
}

export const DAYS: Question<number> = {
  label: 'Days a week',
  hint: 'Realistically. The plan is built around the number you hit.',
  columns: 2,
  options: [
    { v: 3, label: '3 days', note: 'The sweet spot' },
    { v: 4, label: '4 days' },
    { v: 5, label: '5 days' },
    { v: 6, label: '6 days' },
  ],
}

export const LEG_DAYS: Question<NonNullable<Profile['legDays']>> = {
  label: 'Leg days',
  hint: 'Two is quads on one day, hamstrings and glutes on the other.',
  columns: 2,
  options: [
    { v: 1, label: 'Once a week' },
    { v: 2, label: 'Twice, split' },
  ],
}

export const MINUTES: Question<NonNullable<Profile['minutes']>> = {
  label: 'How long have you got?',
  hint: 'A ceiling, not a target. Sessions land where they land and the app tells you what each one costs.',
  columns: 2,
  options: [
    { v: 30, label: 'Up to 30 minutes' },
    { v: 45, label: 'Up to 45 minutes' },
    { v: 60, label: 'Up to an hour' },
    { v: LONG_SESSION, label: 'No limit', note: 'Nothing gets trimmed' },
  ],
}

export const ACCESS: Question<NonNullable<Profile['access']>> = {
  label: 'Where are you training?',
  columns: 2,
  options: [
    { v: 'full', label: 'Full gym' },
    { v: 'basic', label: 'Basic gym' },
    { v: 'home', label: 'Home with kit' },
    { v: 'body', label: 'Bodyweight only' },
  ],
}

export const CONDITION: Question<NonNullable<Profile['condition']>> = {
  label: 'Any heart, lung, kidney or blood sugar condition, or told by a doctor to limit exercise?',
  hint: 'One question we have to ask. It makes the plan lighter, it locks nothing.',
  columns: 2,
  options: [
    { v: 'no', label: 'No' },
    { v: 'yes', label: 'Yes' },
    { v: 'skip', label: 'Rather not say' },
  ],
}

export const UNITS: Question<Unit> = {
  label: 'Weights in',
  columns: 2,
  options: [
    { v: 'lb', label: 'lb' },
    { v: 'kg', label: 'kg' },
  ],
}
