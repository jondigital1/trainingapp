// Calendar arithmetic on plain dates, in UTC and only in UTC.
//
// Every date this app stores is a bare day, "2026-08-19", with no time and no
// place attached. The temptation is to hand it to Date, which parses a bare
// date as local midnight, do the arithmetic, and read it back with
// toISOString, which prints UTC. Those two are the same day only if you are
// west of Greenwich. In London, Tokyo or Sydney the round trip lands on
// yesterday, and it did: the streak read zero with three sessions logged that
// week, the activity grid stopped a day short of today, and the list of days
// you can move a session to opened on yesterday.
//
// None of that showed up here, because the container this is built in runs on
// UTC. So the checks run in a zone that is not UTC, and the arithmetic below
// never touches local time at all.
export function weekStart(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

export function shiftDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Sunday is 0, the way the weekly schedule is indexed.
export function weekdayOf(iso: string): number {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').getUTCDay()
}

// How far apart two dates are, in days. Takes a timestamp as happily as a
// date, because the admin screen counts from a created_at and everything else
// counts from a day.
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from.slice(0, 10) + 'T00:00:00Z')
  const b = Date.parse(to.slice(0, 10) + 'T00:00:00Z')
  return Math.round((b - a) / 86_400_000)
}
