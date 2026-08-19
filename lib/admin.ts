// Who gets in, and what the admin screen is looking at.
//
// The allowlist is an environment variable rather than a column, deliberately.
// A flag in the database can be set by anything that can write to the database;
// a variable can only be changed by somebody with the deploy. For a list that is
// one name long, that is the right trade.

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// The root admins: the allowlist in the environment. This is the half that
// cannot be changed from inside the app, which is what makes it the thing to
// fall back to when the granted list is empty, wrong, or unreachable.
export function isRootAdmin(email: string | null | undefined): boolean {
  return isAdmin(email)
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const list = adminEmails()
  // An empty list locks everybody out rather than letting everybody in, which
  // is the direction a mistake here should fail in.
  if (!list.length) return false
  return list.includes(email.trim().toLowerCase())
}

export interface AdminUser {
  // Granted through the admin screen, or named in the environment. Root admins
  // cannot be revoked from the UI, because the UI is not where they came from.
  admin: boolean
  rootAdmin: boolean
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  confirmedAt: string | null
  bannedUntil: string | null
  // What they have actually done, which is the half auth cannot tell you.
  sessions: number
  sets: number
  volume: number
  lastWorkout: string | null
  firstWorkout: string | null
  onboardedAt: string | null
  goal: string | null
  program: string | null
  days: number | null
}

export type Health = 'active' | 'slipping' | 'dormant' | 'never'

// The one number that matters for an app like this: are they still training.
// Counted from the last logged session rather than the last sign in, because
// opening the app and doing nothing is not training.
export function health(user: AdminUser, today: string): Health {
  if (!user.lastWorkout) return 'never'
  const days = daysBetween(user.lastWorkout, today)
  if (days <= 10) return 'active'
  if (days <= 30) return 'slipping'
  return 'dormant'
}

export const HEALTH_LABEL: Record<Health, string> = {
  active: 'Training',
  slipping: 'Slipping',
  dormant: 'Gone quiet',
  never: 'Never started',
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from.slice(0, 10) + 'T00:00:00').getTime()
  const b = new Date(to.slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

export interface Totals {
  users: number
  onboarded: number
  everTrained: number
  activeWeek: number
  activeMonth: number
  sessions: number
  sets: number
  volume: number
  signupsThisWeek: number
}

export function totals(users: AdminUser[], today: string): Totals {
  const out: Totals = {
    users: users.length,
    onboarded: 0,
    everTrained: 0,
    activeWeek: 0,
    activeMonth: 0,
    sessions: 0,
    sets: 0,
    volume: 0,
    signupsThisWeek: 0,
  }
  for (const u of users) {
    if (u.onboardedAt) out.onboarded += 1
    if (u.sessions > 0) out.everTrained += 1
    if (u.lastWorkout && daysBetween(u.lastWorkout, today) <= 7) out.activeWeek += 1
    if (u.lastWorkout && daysBetween(u.lastWorkout, today) <= 28) out.activeMonth += 1
    if (daysBetween(u.createdAt, today) <= 7) out.signupsThisWeek += 1
    out.sessions += u.sessions
    out.sets += u.sets
    out.volume += u.volume
  }
  return out
}

// Signed up and never logged a set. The single most useful number here,
// because it is the one leak a training app can actually do something about.
export function neverStarted(users: AdminUser[]): AdminUser[] {
  return users.filter((u) => u.sessions === 0)
}

export type Sort = 'recent' | 'signup' | 'sessions' | 'email'

export function sortUsers(users: AdminUser[], by: Sort, today: string): AdminUser[] {
  const copy = [...users]
  switch (by) {
    case 'signup':
      return copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    case 'sessions':
      return copy.sort((a, b) => b.sessions - a.sessions)
    case 'email':
      return copy.sort((a, b) => a.email.localeCompare(b.email))
    default:
      // Most recently trained first, and anybody who never trained last,
      // because the list is read to find out who is still here.
      return copy.sort((a, b) => {
        const aa = a.lastWorkout ?? ''
        const bb = b.lastWorkout ?? ''
        if (aa === bb) return a.email.localeCompare(b.email)
        return aa < bb ? 1 : -1
      })
  }
}

export function matches(user: AdminUser, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return user.email.toLowerCase().includes(q) || user.id.toLowerCase().includes(q)
}

// One row per user, for the export. Everything the screen shows, in the order
// it shows it, so a spreadsheet reads like the page.
export function toCsv(users: AdminUser[], today: string): string {
  const head = [
    'email', 'id', 'signed up', 'last sign in', 'confirmed', 'banned until',
    'admin', 'onboarded', 'program', 'days a week', 'goal',
    'sessions', 'sets', 'volume lb', 'first workout', 'last workout', 'state',
  ]
  const rows = users.map((u) => [
    u.email, u.id, u.createdAt, u.lastSignInAt ?? '', u.confirmedAt ?? '', u.bannedUntil ?? '',
    u.rootAdmin ? 'root' : u.admin ? 'yes' : '',
    u.onboardedAt ?? '', u.program ?? '', u.days ?? '', u.goal ?? '',
    u.sessions, u.sets, Math.round(u.volume), u.firstWorkout ?? '', u.lastWorkout ?? '',
    HEALTH_LABEL[health(u, today)],
  ])
  return [head, ...rows]
    .map((r) => r.map((cell) => quote(String(cell))).join(','))
    .join('\n')
}

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
