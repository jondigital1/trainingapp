import type { SetType } from './types'

// What each column of a set row is, per movement type. Named once above the
// rows so the numbers underneath do not have to carry their own labels: filled
// in, 80 x 9 @8 is three anonymous numbers the moment the placeholders go.
export function columnsFor(type: SetType, showRpe: boolean): string[] {
  const base =
    type === 'W'
      ? ['lb', 'reps']
      : type === 'R'
        ? ['reps']
        : type === 'T'
          ? ['time']
          : type === 'WD'
            ? ['lb', 'feet']
            : type === 'C'
              ? ['time', 'miles']
              : []
  // RPE is only ever asked of the two types where a number of reps in reserve
  // means anything.
  return showRpe && (type === 'W' || type === 'R') ? [...base, 'rpe'] : base
}
