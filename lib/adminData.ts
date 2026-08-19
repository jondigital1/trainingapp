import 'server-only'
import { supabaseAdmin } from './supabase/admin'
import { isRootAdmin, type AdminUser } from './admin'
import { grantedAdminIds } from './adminAuth'

// Everything the admin screen shows, assembled from the two halves that never
// meet anywhere else: the auth table, which knows who exists and when they last
// signed in, and the app's own tables, which know whether any of that turned
// into training.
//
// Deliberately a handful of whole-table reads rather than a clever join. There
// is one user today and there will not be a hundred thousand; when there are,
// this becomes a view and the shape above it does not change.

const PAGE = 1000

export async function loadUsers(): Promise<AdminUser[] | null> {
  const sb = supabaseAdmin()
  if (!sb) return null

  const people: {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
    confirmed_at?: string | null
    email_confirmed_at?: string | null
    banned_until?: string | null
  }[] = []

  // The admin API pages. Ask for everything rather than guessing a ceiling.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) throw new Error(error.message)
    people.push(...(data.users as unknown as typeof people))
    if (data.users.length < PAGE) break
  }

  const granted = await grantedAdminIds()

  const [workouts, sets, settings] = await Promise.all([
    sb.from('workouts').select('user_id,date'),
    sb.from('sets').select('user_id,w,r'),
    sb.from('settings').select('user_id,goal,profile,onboarded_at'),
  ])

  const byUser = new Map<
    string,
    { sessions: number; first: string | null; last: string | null; sets: number; volume: number }
  >()
  const seed = (id: string) => {
    if (!byUser.has(id)) byUser.set(id, { sessions: 0, first: null, last: null, sets: 0, volume: 0 })
    return byUser.get(id)!
  }

  for (const row of workouts.data ?? []) {
    const u = seed(row.user_id as string)
    const date = row.date as string
    u.sessions += 1
    if (!u.first || date < u.first) u.first = date
    if (!u.last || date > u.last) u.last = date
  }
  for (const row of sets.data ?? []) {
    const u = seed(row.user_id as string)
    u.sets += 1
    const w = row.w == null ? null : Number(row.w)
    const r = row.r == null ? null : Number(row.r)
    if (w != null && r != null) u.volume += w * r
  }

  const profiles = new Map<string, { goal: string | null; profile: Record<string, unknown>; onboarded: string | null }>()
  for (const row of settings.data ?? []) {
    profiles.set(row.user_id as string, {
      goal: (row.goal as string) ?? null,
      profile: (row.profile as Record<string, unknown>) ?? {},
      onboarded: (row.onboarded_at as string) ?? null,
    })
  }

  return people.map((p) => {
    const done = byUser.get(p.id)
    const s = profiles.get(p.id)
    const profile = (s?.profile ?? {}) as { days?: number; program?: string }
    const email = p.email ?? ''
    const root = isRootAdmin(email)
    return {
      id: p.id,
      email,
      admin: root || granted.has(p.id),
      rootAdmin: root,
      createdAt: p.created_at,
      lastSignInAt: p.last_sign_in_at ?? null,
      confirmedAt: p.email_confirmed_at ?? p.confirmed_at ?? null,
      bannedUntil: p.banned_until ?? null,
      sessions: done?.sessions ?? 0,
      sets: done?.sets ?? 0,
      volume: done?.volume ?? 0,
      lastWorkout: done?.last ?? null,
      firstWorkout: done?.first ?? null,
      onboardedAt: s?.onboarded ?? null,
      goal: s?.goal ?? null,
      // The plan is derived at read time in the app rather than stored, so the
      // only durable trace of it is what the questionnaire wrote down.
      program: typeof profile.program === 'string' ? profile.program : null,
      days: typeof profile.days === 'number' ? profile.days : null,
    }
  })
}
