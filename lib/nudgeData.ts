import 'server-only'
import { supabaseAdmin } from './supabase/admin'
import { scheduledDays } from './schedule'
import type { Profile } from './onboarding'
import { localNow, nudgeDue, nudgeFor, type Nudge, type NudgePrefs, type WeekState } from './nudge'
import { weekOf } from './nudgeWeek'

// Who is due a nudge, and what it says.
//
// A handful of whole table reads and the arithmetic in TypeScript, for the
// same reason the admin screen is built that way: the logic is worth testing
// and SQL that decides what a coach says is not. When this is slow it becomes
// a view, and the shape above it does not change.

export interface Device {
  endpoint: string
  p256dh: string
  auth: string
  zone: string
}

export interface Due {
  userId: string
  devices: Device[]
  nudge: Nudge
  // Whether anything at all was logged since the last nudge. Two of these in a
  // row with nothing between them is how the app learns to stop talking.
  trained: boolean
  misses: number
}

export async function dueNudges(now: Date): Promise<Due[]> {
  const sb = supabaseAdmin()
  if (!sb) return []

  const [settings, devices] = await Promise.all([
    sb
      .from('settings')
      .select('user_id,profile,nudge_day,nudge_hour,nudged_at,nudge_misses')
      .not('nudge_day', 'is', null),
    sb.from('push_devices').select('endpoint,user_id,p256dh,auth,zone'),
  ])
  if (settings.error) throw new Error(settings.error.message)
  if (devices.error) throw new Error(devices.error.message)

  const byUser = new Map<string, Device[]>()
  for (const d of devices.data ?? []) {
    const list = byUser.get(d.user_id as string) ?? []
    list.push({
      endpoint: d.endpoint as string,
      p256dh: d.p256dh as string,
      auth: d.auth as string,
      zone: (d.zone as string) || 'UTC',
    })
    byUser.set(d.user_id as string, list)
  }

  // Everybody whose own clock says it is time. A person with no device on file
  // has nowhere to be sent anything, so they are not due for anything.
  const ready: { userId: string; prefs: NudgePrefs; devices: Device[]; today: string }[] = []
  for (const row of settings.data ?? []) {
    const userId = row.user_id as string
    const list = byUser.get(userId)
    if (!list?.length) continue
    const prefs: NudgePrefs = {
      day: row.nudge_day as number,
      hour: (row.nudge_hour as number) ?? 18,
      nudgedAt: (row.nudged_at as string) ?? null,
      misses: (row.nudge_misses as number) ?? 0,
    }
    // The first device is the phone they train with in almost every case, and
    // where two phones disagree about the hour, the earlier one wins so that
    // nobody is woken by the later one.
    const locals = list.map((d) => localNow(d.zone, now))
    const hit = locals.find((l) => nudgeDue(prefs, l, now))
    if (!hit) continue
    ready.push({ userId, prefs, devices: list, today: hit.date })
  }
  if (!ready.length) return []

  const ids = ready.map((r) => r.userId)
  const workouts = await sb.from('workouts').select('user_id,date').in('user_id', ids)
  if (workouts.error) throw new Error(workouts.error.message)

  const dates = new Map<string, string[]>()
  for (const w of workouts.data ?? []) {
    const list = dates.get(w.user_id as string) ?? []
    list.push(w.date as string)
    dates.set(w.user_id as string, list)
  }

  const out: Due[] = []
  for (const r of ready) {
    const profile = ((settings.data ?? []).find((s) => s.user_id === r.userId)?.profile ?? {}) as Profile
    const logged = dates.get(r.userId) ?? []
    const state: WeekState = weekOf(logged, r.today, targetFor(profile))
    const nudge = nudgeFor(state)
    if (!nudge) continue
    out.push({
      userId: r.userId,
      devices: r.devices,
      nudge,
      trained: r.prefs.nudgedAt ? logged.some((d) => d > r.prefs.nudgedAt!.slice(0, 10)) : true,
      misses: r.prefs.misses,
    })
  }
  return out
}

// The week they said they wanted. A schedule they laid out by hand beats the
// number the questionnaire took, because moving a session onto Thursday is a
// more recent statement of intent than anything said during signup.
export function targetFor(profile: Profile): number {
  const scheduled = scheduledDays(profile)
  if (scheduled > 0) return scheduled
  return profile.days ?? 3
}

export async function stampNudge(userId: string, at: Date, trained: boolean, misses: number): Promise<void> {
  const sb = supabaseAdmin()
  if (!sb) return
  await sb
    .from('settings')
    .update({ nudged_at: at.toISOString(), nudge_misses: trained ? 0 : misses + 1 })
    .eq('user_id', userId)
}

// A subscription the browser has replaced comes back 404 or 410 from the push
// service. Unlike the rest alert, this one is on disk, so it has to go.
export async function forgetDevice(endpoint: string): Promise<void> {
  const sb = supabaseAdmin()
  if (!sb) return
  await sb.from('push_devices').delete().eq('endpoint', endpoint)
}
