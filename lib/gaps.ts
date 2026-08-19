import { lookupType } from './exercises'

// What the library is missing, according to the people using it.
//
// Every custom exercise is somebody searching the picker, not finding the
// thing, and typing it in by hand. One of those is a personal habit. Three
// people independently inventing a belt squat is the library being told what
// it lacks, and this report exists so that gets read rather than guessed at.
//
// Nothing is promoted automatically, on purpose. Custom names are personal
// shorthand, and the library's worth is that every entry has a type, a group,
// a rest tier and swap behaviour somebody thought about. The report points;
// a person adds.

export interface GapRow {
  // The most common spelling people used, so the report reads like the users
  // wrote it rather than like a normaliser did.
  name: string
  users: number
  type: string
  group: string | null
}

// Lower case, single spaces, and the plural taken off, so Viking Presses and
// viking press are one row. The plural rule has to know that press is not a
// plural: an s is only stripped when it is not part of a double s, and the es
// on presses comes off as a pair. Exact beyond that: fuzzier matching merges
// things that are genuinely different, and a report that lies about counts is
// worse than one with a duplicate row.
export function gapKey(name: string): string {
  const flat = name.trim().toLowerCase().replace(/\s+/g, ' ')
  return singular(flat)
}

function singular(flat: string): string {
  if (flat.endsWith('sses')) return flat.slice(0, -2)
  if (flat.endsWith('s') && !flat.endsWith('ss')) return flat.slice(0, -1)
  return flat
}

// In the library already, under either the exact name or its singular. Those
// are not gaps, they are people who did not find the search.
function inLibrary(name: string): boolean {
  if (lookupType(name)) return true
  return !!lookupType(singular(name.trim().toLowerCase()))
}

export function gapReport(
  rows: { userId: string; name: string; type: string; group: string | null }[],
): GapRow[] {
  const byKey = new Map<
    string,
    { users: Set<string>; spellings: Map<string, number>; type: string; group: string | null }
  >()

  for (const row of rows) {
    const name = row.name.trim()
    if (!name || inLibrary(name)) continue
    const key = gapKey(name)
    if (!byKey.has(key)) byKey.set(key, { users: new Set(), spellings: new Map(), type: row.type, group: row.group })
    const entry = byKey.get(key)!
    entry.users.add(row.userId)
    entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1)
    if (!entry.group && row.group) entry.group = row.group
  }

  return [...byKey.values()]
    .map((entry) => {
      const [name] = [...entry.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
      return { name, users: entry.users.size, type: entry.type, group: entry.group }
    })
    .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name))
}
