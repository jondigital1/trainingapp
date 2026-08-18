import type { BodyWeight } from './types'

export interface BodySummary {
  current: number | null
  currentDate: string | null
  first: number | null
  firstDate: string | null
  // Signed, in pounds, current minus day one. Null until there are two
  // readings, because one reading is a number, not a direction.
  change: number | null
  goal: number | null
  // 0 to 1 along the road from day one to the goal, and null when there is no
  // goal or the goal was the starting weight.
  toGoal: number | null
  reached: boolean
}

// Readings come out of the database in date order. Sorting again here means
// the summary is right whatever order it is handed.
export function sortWeights(list: BodyWeight[]): BodyWeight[] {
  return list.slice().sort((a, b) => a.date.localeCompare(b.date))
}

export function summarise(list: BodyWeight[], goal: number | null | undefined): BodySummary {
  const rows = sortWeights(list)
  const first = rows[0] ?? null
  const last = rows[rows.length - 1] ?? null
  const g = goal != null && Number.isFinite(goal) && goal > 0 ? goal : null

  let toGoal: number | null = null
  let reached = false
  if (g != null && first && last) {
    const span = g - first.weight
    if (span !== 0) {
      toGoal = Math.max(0, Math.min(1, (last.weight - first.weight) / span))
      // Losing weight means the goal is below the start, so "reached" is
      // whichever side of the goal the road was travelling toward.
      reached = span < 0 ? last.weight <= g : last.weight >= g
    } else {
      reached = last.weight === g
      toGoal = reached ? 1 : null
    }
  }

  return {
    current: last?.weight ?? null,
    currentDate: last?.date ?? null,
    first: first?.weight ?? null,
    firstDate: first?.date ?? null,
    change: first && last && rows.length > 1 ? last.weight - first.weight : null,
    goal: g,
    toGoal,
    reached,
  }
}

// A weekly moving average is what people actually mean by "my weight". Day to
// day swings are water and a big dinner, not fat, and a chart that shows them
// tells a story that is not happening.
export function trend(list: BodyWeight[], windowDays = 7): BodyWeight[] {
  const rows = sortWeights(list)
  if (rows.length < 2) return rows
  const out: BodyWeight[] = []
  for (let i = 0; i < rows.length; i += 1) {
    const end = new Date(rows[i].date + 'T00:00:00').getTime()
    const start = end - (windowDays - 1) * 86400000
    let sum = 0
    let n = 0
    for (let j = i; j >= 0; j -= 1) {
      const t = new Date(rows[j].date + 'T00:00:00').getTime()
      if (t < start) break
      sum += rows[j].weight
      n += 1
    }
    out.push({ date: rows[i].date, weight: sum / n })
  }
  return out
}
