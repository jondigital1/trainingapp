// What people ask Lifty, gathered into something worth reading.
//
// One person typing a question is a person. Six people typing the same
// question in a fortnight is the library being told what it is missing, which
// is the same argument the exercise gap report makes and the same shape of
// answer: the report points, a person writes.
//
// Nothing is answered automatically from this. An unanswered question is a
// prompt to sit down and write an entry, because the whole promise of the
// panel is that a human wrote what it says.

export interface AskedRow {
  // The most common spelling people used, so the report reads the way they
  // typed it rather than the way a normaliser left it.
  question: string
  // How many separate people, which is the number that means anything. One
  // person asking eleven times is one person who could not find it.
  people: number
  times: number
  answered: boolean
  last: string
}

// Lower case, single spaces, no trailing punctuation. Deliberately shallow:
// merging "sore shoulder" into "shoulder pain" would flatter the counts, and a
// report that overstates demand sends somebody off to write the wrong entry.
export function askedKey(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?!.]+$/, '')
}

export function askedReport(
  rows: { userId: string; question: string; answered: boolean; at: string }[],
): AskedRow[] {
  const byKey = new Map<
    string,
    { users: Set<string>; spellings: Map<string, number>; times: number; answered: boolean; last: string }
  >()

  for (const row of rows) {
    const question = row.question.trim()
    if (!question) continue
    const key = askedKey(question)
    const seen = byKey.get(key) ?? {
      users: new Set<string>(),
      spellings: new Map<string, number>(),
      times: 0,
      answered: row.answered,
      last: row.at,
    }
    seen.users.add(row.userId)
    seen.spellings.set(question, (seen.spellings.get(question) ?? 0) + 1)
    seen.times += 1
    // Answered wins over unanswered for the same wording, because an entry
    // written since it was first asked has closed it, and a closed question
    // has no business sitting at the top of a list of work to do.
    seen.answered = seen.answered || row.answered
    if (row.at > seen.last) seen.last = row.at
    byKey.set(key, seen)
  }

  return [...byKey.values()]
    .map((v) => ({
      // Most typed wins, and an even split falls back to alphabetical rather
      // than to whichever row the database happened to return first.
      question: [...v.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      people: v.users.size,
      times: v.times,
      answered: v.answered,
      last: v.last,
    }))
    .sort((a, b) => b.people - a.people || b.times - a.times || a.question.localeCompare(b.question))
}

// The ones with nothing written for them, which is the list somebody works
// from. Answered questions stay in the report for what is popular; this is
// what is missing.
export function unanswered(rows: AskedRow[]): AskedRow[] {
  return rows.filter((r) => !r.answered)
}

// What the report can honestly say about itself, including when it has nothing
// to say. An empty section used to be drawn as no section at all, so a miss log
// that was recording nothing and a miss log nobody had used yet looked the
// same on screen, and stayed indistinguishable for weeks. This is the line
// that tells them apart.
export function askedState(rows: AskedRow[]): string {
  if (!rows.length) {
    return 'Nothing recorded yet. Ask Lifty something and this should count it within a few seconds.'
  }
  let times = 0
  let last = ''
  for (const r of rows) {
    times += r.times
    if (r.last > last) last = r.last
  }
  const misses = unanswered(rows).length
  const wordings = rows.length === 1 ? '1 wording' : `${rows.length} wordings`
  const asks = times === 1 ? '1 search' : `${times} searches`
  const missing =
    misses === 0 ? 'none of them unanswered' : misses === 1 ? '1 unanswered' : `${misses} unanswered`
  return `${asks} across ${wordings}, ${missing}. Last recorded ${last.slice(0, 10)}.`
}
