// Set shapes by exercise type:
//   W  weight and reps, optional RPE      { w, r, rpe? }
//   R  reps only, optional RPE            { r, rpe? }
//   T  time in seconds                    { t }
//   WD weight and distance in feet        { w, d }
//   C  cardio, time and optional miles    { t, d? }
//   X  anything else                      { raw }
export type SetType = 'W' | 'R' | 'T' | 'WD' | 'C' | 'X'

export const SET_TYPES: { type: SetType; label: string }[] = [
  { type: 'W', label: 'Weight and reps' },
  { type: 'R', label: 'Reps only' },
  { type: 'T', label: 'Time' },
  { type: 'WD', label: 'Weight and distance' },
  { type: 'C', label: 'Cardio' },
]

export interface SetEntry {
  id: string
  w?: number | null
  r?: number | null
  // No longer collected. Sessions imported from the artifact days carry it,
  // and CSV still exports it, so the history is not rewritten; nothing in the
  // app reads it or asks for it any more.
  rpe?: number | null
  t?: number | null
  d?: number | null
  raw?: string | null
  // A drop set: this row continues the set above it at a lighter weight, with
  // no rest between. Excluded from records, since near failure at a lighter
  // load is a technique, not a best.
  drop?: boolean | null
}

export interface Exercise {
  id: string
  name: string
  type: SetType
  sets: SetEntry[]
  // Exercises sharing a tag run together with no rest between them.
  superset?: string | null
}

export interface Workout {
  id: string
  date: string // YYYY-MM-DD
  title: string
  exercises: Exercise[]
  // A session with a start and an end, so it has a duration. Both null on
  // everything logged before the app asked, which is the honest answer for
  // those rather than a number invented afterwards.
  startedAt?: string | null
  endedAt?: string | null
  // How hard it felt, 1 to 10, asked once when the session ends. This replaced
  // per-set RPE: one honest number after the fact beats ten guesses taken
  // while out of breath.
  intensity?: number | null
}

export interface CustomExercise {
  id: string
  name: string
  type: SetType
  // Which muscle group it trains, so it counts toward the weekly target and
  // can be swapped for something else when a joint is sore. Optional, because
  // custom exercises saved before the app asked have no answer.
  group?: string | null
  // How much it takes out of you, which sets the rest timer. The name based
  // classifier has never heard of this movement, so it is worth asking rather
  // than guessing.
  tier?: import('./rest').RestTier | null
  // How many sets to lay out when it goes into a session.
  sets?: number | null
}

export interface CustomWorkoutItem {
  name: string
  type: SetType
  // Items sharing a tag run together as a superset when the workout starts.
  superset?: string | null
}

export interface CustomWorkout {
  id: string
  name: string
  items: CustomWorkoutItem[]
}

export type Goal = 'strength' | 'muscle' | 'endurance'

// One reading per day, stored in pounds. Kilos are a display choice.
export interface BodyWeight {
  date: string // YYYY-MM-DD
  weight: number
}

export interface Settings {
  goal: Goal
  profile: import('./onboarding').Profile
  onboardedAt: string | null
}

export interface TrainingData {
  workouts: Workout[]
  custom: CustomExercise[]
  customWorkouts: CustomWorkout[]
  bodyWeights: BodyWeight[]
  settings: Settings
}

export const EMPTY_DATA: TrainingData = {
  workouts: [],
  custom: [],
  customWorkouts: [],
  bodyWeights: [],
  settings: { goal: 'muscle', profile: {}, onboardedAt: null },
}
