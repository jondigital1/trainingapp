import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from './onboarding'
import type {
  BodyWeight,
  CustomExercise,
  CustomWorkout,
  Goal,
  SetEntry,
  SetType,
  Share,
  TrainingData,
  Workout,
} from './types'

type Row = Record<string, any>

const WORKOUT_SELECT =
  'id,date,title,started_at,ended_at,intensity,note,exercises(id,name,type,position,superset,sets(id,position,w,r,rpe,t,d,raw,dropset))'

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function rowToWorkout(row: Row): Workout {
  const exercises = (row.exercises ?? [])
    .slice()
    .sort((a: Row, b: Row) => a.position - b.position)
    .map((ex: Row) => ({
      id: ex.id as string,
      name: ex.name as string,
      type: ex.type as SetType,
      superset: (ex.superset as string) ?? null,
      sets: (ex.sets ?? [])
        .slice()
        .sort((a: Row, b: Row) => a.position - b.position)
        .map(
          (s: Row): SetEntry => ({
            id: s.id as string,
            w: toNum(s.w),
            r: toNum(s.r),
            rpe: toNum(s.rpe),
            t: toNum(s.t),
            d: toNum(s.d),
            raw: (s.raw as string) ?? null,
            drop: s.dropset === true ? true : null,
          }),
        ),
    }))
  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    startedAt: (row.started_at as string) ?? null,
    endedAt: (row.ended_at as string) ?? null,
    intensity: toNum(row.intensity),
    note: (row.note as string) ?? null,
    exercises,
  }
}

export async function loadAll(sb: SupabaseClient, userId: string): Promise<TrainingData> {
  const [workouts, custom, customWorkouts, weights, notes, settings] = await Promise.all([
    sb.from('workouts').select(WORKOUT_SELECT).order('date', { ascending: false }),
    sb.from('custom_exercises').select('id,name,type,muscle_group,rest_tier,default_sets').order('name'),
    sb.from('custom_workouts').select('id,name,items').order('created_at'),
    sb.from('body_weights').select('date,weight').order('date'),
    sb.from('exercise_notes').select('name,note'),
    sb
      .from('settings')
      .select('goal,profile,onboarded_at,nudge_day,nudge_hour')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const err =
    workouts.error ?? custom.error ?? customWorkouts.error ?? weights.error ?? notes.error ?? settings.error
  if (err) throw err

  return {
    workouts: (workouts.data ?? []).map(rowToWorkout),
    exerciseNotes: Object.fromEntries(
      (notes.data ?? []).map((r: Row) => [(r.name as string).toLowerCase(), r.note as string]),
    ),
    custom: (custom.data ?? []).map((r: Row) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as SetType,
      groups: groupsFrom(r.muscle_group),
      tier: (r.rest_tier as CustomExercise['tier']) ?? null,
      sets: toNum(r.default_sets),
    })) as CustomExercise[],
    customWorkouts: (customWorkouts.data ?? []).map((r: Row) => ({
      id: r.id as string,
      name: r.name as string,
      items: Array.isArray(r.items) ? r.items : [],
    })) as CustomWorkout[],
    bodyWeights: (weights.data ?? []).map((r: Row) => ({
      date: r.date as string,
      weight: Number(r.weight),
    })) as BodyWeight[],
    settings: {
      goal: (settings.data?.goal as Goal) ?? 'muscle',
      profile: (settings.data?.profile as Profile) ?? {},
      onboardedAt: (settings.data?.onboarded_at as string) ?? null,
      nudge: {
        day: (settings.data?.nudge_day as number) ?? null,
        hour: (settings.data?.nudge_hour as number) ?? 18,
      },
    },
  }
}

// Writes a whole workout in a single call. One request rather than four means a
// save that starts as the app is going away either lands or does not, instead
// of leaving half a session behind. See supabase/migrations/0002_save_workout.sql
export async function saveWorkout(sb: SupabaseClient, _userId: string, workout: Workout) {
  const res = await sb.rpc('save_workout', {
    payload: {
      id: workout.id,
      date: workout.date,
      title: workout.title,
      startedAt: workout.startedAt ?? null,
      endedAt: workout.endedAt ?? null,
      intensity: workout.intensity ?? null,
      note: workout.note?.trim() ? workout.note.trim() : null,
      exercises: workout.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        type: ex.type,
        superset: ex.superset ?? null,
        sets: ex.sets.map((s) => ({
          id: s.id,
          w: s.w ?? null,
          r: s.r ?? null,
          rpe: s.rpe ?? null,
          t: s.t ?? null,
          d: s.d ?? null,
          raw: s.raw ?? null,
          drop: s.drop === true,
        })),
      })),
    },
  })
  if (res.error) throw res.error
}

export async function deleteWorkout(sb: SupabaseClient, id: string) {
  const res = await sb.from('workouts').delete().eq('id', id)
  if (res.error) throw res.error
}

// The muscle groups a custom exercise trains, in and out of the one text
// column that has always held them.
//
// One column rather than an array column, because an array column means a
// migration that has to land before the deploy that needs it, and there is no
// order of those two that is safe: deploy first and every save fails on an
// unknown column, migrate first and nothing is reading it yet. No group name
// contains a comma, so a comma separated list reads back unambiguously, and a
// row written before this change is simply a list of one.
function groupsFrom(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
}

function groupsTo(groups: string[] | null | undefined): string | null {
  const list = (groups ?? []).map((g) => g.trim()).filter(Boolean)
  return list.length ? list.join(',') : null
}

export async function saveCustomExercise(sb: SupabaseClient, userId: string, ex: CustomExercise) {
  const res = await sb
    .from('custom_exercises')
    .upsert(
      {
        id: ex.id,
        user_id: userId,
        name: ex.name,
        type: ex.type,
        muscle_group: groupsTo(ex.groups),
        rest_tier: ex.tier ?? null,
        default_sets: ex.sets ?? null,
      },
      { onConflict: 'user_id,name' },
    )
  if (res.error) throw res.error
}

// Changing one you already have, by id rather than by name, because the name
// is one of the things you might be changing. The upsert above targets
// (user_id, name), so a rename would miss every existing row and then collide
// on the primary key instead of moving the movement you meant.
export async function updateCustomExercise(sb: SupabaseClient, ex: CustomExercise) {
  const res = await sb
    .from('custom_exercises')
    .update({
      name: ex.name,
      type: ex.type,
      muscle_group: groupsTo(ex.groups),
      rest_tier: ex.tier ?? null,
      default_sets: ex.sets ?? null,
    })
    .eq('id', ex.id)
  if (res.error) throw res.error
}

export async function deleteCustomExercise(sb: SupabaseClient, id: string) {
  const res = await sb.from('custom_exercises').delete().eq('id', id)
  if (res.error) throw res.error
}

export async function saveCustomWorkout(sb: SupabaseClient, userId: string, w: CustomWorkout) {
  const res = await sb
    .from('custom_workouts')
    .upsert({ id: w.id, user_id: userId, name: w.name, items: w.items })
  if (res.error) throw res.error
}

// Publishing takes a copy rather than pointing at the original, so editing your
// own workout afterwards does not silently rewrite what you gave somebody. If
// you want them to have the new one, you share it again.
export async function shareCustomWorkout(
  sb: SupabaseClient,
  userId: string,
  workout: CustomWorkout,
): Promise<string> {
  const res = await sb
    .from('shared_workouts')
    .insert({ user_id: userId, name: workout.name, items: workout.items })
    .select('id')
    .single()
  if (res.error) throw new Error(res.error.message)
  return res.data.id as string
}

// Every link you have handed out. Sharing inserts rather than upserts, so the
// same workout shared three times is three live links, and until there was a
// list there was no way to know that or to do anything about it.
//
// Newest first, because the one you are looking for is almost always the one
// you just made. The policy on the table is the whole security story: it
// returns your own rows and there is no way to ask for anybody else's.
export async function listShares(sb: SupabaseClient): Promise<Share[]> {
  const res = await sb.from('shared_workouts').select('id,name,created_at').order('created_at', { ascending: false })
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? []) as Share[]
}

// Revoking one. The link stops working; anyone who already opened it and saved
// it to their own workouts keeps their copy, because that copy is theirs now.
export async function unshare(sb: SupabaseClient, id: string) {
  const res = await sb.from('shared_workouts').delete().eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

export async function deleteCustomWorkout(sb: SupabaseClient, id: string) {
  const res = await sb.from('custom_workouts').delete().eq('id', id)
  if (res.error) throw res.error
}

export async function saveGoal(sb: SupabaseClient, userId: string, goal: Goal) {
  const res = await sb.from('settings').upsert({ user_id: userId, goal })
  if (res.error) throw res.error
}

// The day and hour somebody wants their one message a week, or a null day for
// no message at all, which is what everybody starts as.
export async function saveNudge(
  sb: SupabaseClient,
  userId: string,
  nudge: { day: number | null; hour: number },
) {
  const res = await sb
    .from('settings')
    .upsert({ user_id: userId, nudge_day: nudge.day, nudge_hour: nudge.hour })
  if (res.error) throw res.error
}

// A note against a movement. Emptying it deletes the row rather than storing a
// blank, so a note nobody wants leaves no trace.
export async function saveExerciseNote(
  sb: SupabaseClient,
  userId: string,
  name: string,
  note: string,
) {
  if (!note.trim()) {
    const gone = await sb.from('exercise_notes').delete().eq('user_id', userId).eq('name', name)
    if (gone.error) throw gone.error
    return
  }
  const res = await sb
    .from('exercise_notes')
    .upsert(
      { user_id: userId, name, note: note.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,name' },
    )
  if (res.error) throw res.error
}

export async function saveProfile(
  sb: SupabaseClient,
  userId: string,
  profile: Profile,
  onboardedAt: string | null,
) {
  const res = await sb
    .from('settings')
    .upsert({ user_id: userId, profile, onboarded_at: onboardedAt })
  if (res.error) throw res.error
}

// One reading per day. Weighing again the same morning replaces the number
// rather than adding a second point to the line.
export async function saveBodyWeight(
  sb: SupabaseClient,
  userId: string,
  entry: BodyWeight,
) {
  const res = await sb
    .from('body_weights')
    .upsert({ user_id: userId, date: entry.date, weight: entry.weight }, { onConflict: 'user_id,date' })
  if (res.error) throw res.error
}

// There is no deleteBodyWeight, on purpose. A mistyped weight is fixed by
// weighing again the same day: the table is keyed on (user_id, date) and the
// save upserts, so the second reading replaces the first. The only case it
// could not cover is a reading for a day nobody actually weighed, which the
// seven day average dilutes anyway. A function nobody calls reads as a plan
// somebody abandoned, and this was not a plan.

// Takes everything away: every row this app owns, then the account itself.
// The user id comes from the session inside the function rather than from
// here, so it can only ever delete the caller.
export async function deleteAccount(sb: SupabaseClient) {
  const res = await sb.rpc('delete_me')
  if (res.error) throw res.error
}

// A question somebody typed at Lifty, and whether the library had an answer.
//
// Fire and forget on purpose: this is telemetry for deciding what to write
// next, and a search box that surfaces an error because a logging insert
// failed would be a worse feature than one that quietly loses a row.
export async function logQuestion(
  sb: SupabaseClient,
  userId: string,
  question: string,
  answered: boolean,
) {
  const asked = question.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (asked.length < 2) return
  // Postgrest does not throw on a rejected insert, it hands the error back in
  // the result, so a row silently refused by row level security looked exactly
  // like a row written. Thrown here, caught and logged by the caller.
  const res = await sb.from('asked_questions').insert({ user_id: userId, question: asked, answered })
  if (res.error) throw res.error
}
