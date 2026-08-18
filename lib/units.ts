// Everything is stored in pounds. The unit is a display choice, applied at the
// edges, so a person who switches from kilos to pounds sees the same history
// re-expressed rather than a different history.
export type Unit = 'lb' | 'kg'

const PER_KG = 2.2046226218

export function toDisplay(lb: number, unit: Unit): number {
  return unit === 'kg' ? lb / PER_KG : lb
}

export function toPounds(value: number, unit: Unit): number {
  return unit === 'kg' ? value * PER_KG : value
}

export function unitLabel(unit: Unit): string {
  return unit === 'kg' ? 'kg' : 'lb'
}

// One decimal at most, and none when the number is round. 181.4 kg reads fine,
// 181.43718 does not.
export function fmtWeight(lb: number | null | undefined, unit: Unit): string {
  if (lb == null || !Number.isFinite(lb)) return '--'
  const n = toDisplay(lb, unit)
  const r = Math.round(n * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)} ${unitLabel(unit)}`
}

// Signed, for "down 6.2 lb since day 1". Zero comes back as null: no change is
// not a direction and should not be dressed as one.
export function fmtDelta(lb: number, unit: Unit): string | null {
  const n = toDisplay(lb, unit)
  const r = Math.round(n * 10) / 10
  if (r === 0) return null
  const size = Math.abs(r)
  const text = `${Number.isInteger(size) ? size : size.toFixed(1)} ${unitLabel(unit)}`
  return r > 0 ? `up ${text}` : `down ${text}`
}
