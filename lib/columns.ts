import type { SetType } from './types'

// What each column of a set row is, per movement type. Named once above the
// rows so the numbers underneath do not have to carry their own labels:
// filled in, 80 x 9 is two anonymous numbers the moment the placeholders go.
export function columnsFor(type: SetType): string[] {
  switch (type) {
    case 'W':
      return ['lb', 'reps']
    case 'R':
      return ['reps']
    case 'T':
      return ['time']
    case 'WD':
      return ['lb', 'feet']
    case 'C':
      return ['time', 'miles']
    default:
      return []
  }
}
