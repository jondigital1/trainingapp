import { soreGroups, type Profile } from './onboarding'

// The word before the first session of the day.
//
// Asked once a day and only when somebody is about to train, because a
// question about how you are feeling is worth answering on the way into a
// session and is noise anywhere else. Saying nothing is wrong is one tap and
// the session starts.
//
// What it collects is about today, not about you. A knee that is grumbling
// this morning is not a standing fact to be filed on a profile and remembered
// against every future session; it is a reason to go easier this afternoon.
// So it is stored against the date, the same way a moved workout is, and it
// ages out on its own.

export function greetedOn(profile: Profile, today: string): boolean {
  return profile.greetedAt === today
}

// The joints somebody said were bothering them today, on top of anything
// standing on their profile.
export function easedToday(profile: Profile, today: string): string[] {
  return profile.easedOn?.[today] ?? []
}

// The profile a session built today should be built from: the standing answers
// plus whatever they said on the way in. Nothing is written into sore itself,
// so tomorrow's session is not shaped by how a knee felt on a Tuesday.
export function forToday(profile: Profile, today: string): Profile {
  const eased = easedToday(profile, today)
  if (!eased.length) return profile
  return { ...profile, sore: [...new Set([...(profile.sore ?? []), ...eased])] }
}

// Recording the answer. Yesterday's is dropped rather than kept forever, and
// an empty answer still stamps the day so nobody is asked twice.
export function recordHello(profile: Profile, today: string, eased: string[]): Profile {
  const kept: Record<string, string[]> = {}
  for (const [date, joints] of Object.entries(profile.easedOn ?? {})) {
    if (date >= today) kept[date] = joints
  }
  if (eased.length) kept[today] = eased
  else delete kept[today]
  return { ...profile, greetedAt: today, easedOn: kept }
}

// What actually changes, in one line, so the offer is not a promise nobody can
// check. Named by the joint rather than by the muscle groups behind it: a knee
// reaches four of them and your quads, hamstrings, glutes and calves work runs
// a set shorter is not a sentence anybody wants to read about their knee.
export function easedNote(profile: Profile, today: string): string | null {
  const eased = easedToday(profile, today)
  if (!eased.length) return null
  const named = eased.map((j) => j.toLowerCase())
  const list =
    named.length === 1
      ? named[0]
      : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
  return `Anything working your ${list} runs a set shorter today.`
}
