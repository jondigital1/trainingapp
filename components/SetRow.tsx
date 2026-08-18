'use client'

import { fmtTime, parseClock } from '@/lib/format'
import { columnsFor } from '@/lib/columns'
import type { SetEntry, SetType } from '@/lib/types'

// 16px so iOS does not zoom on focus, and no taller than that needs: a set row
// is read at arm's length between efforts, so it wants to be short and
// unmistakable rather than roomy.
const FIELD =
  'w-full rounded-lg bg-ink px-2 py-1.5 text-center text-base num outline-none ring-1 ring-edge focus:ring-accent'

export function SetHeader({ type, showRpe }: { type: SetType; showRpe: boolean }) {
  const columns = columnsFor(type, showRpe)
  if (!columns.length) return null
  const rpe = showRpe && (type === 'W' || type === 'R')
  const fields = rpe ? columns.slice(0, -1) : columns

  return (
    <div className="flex items-center gap-2 pb-0.5 text-[10px] uppercase tracking-wide text-muted">
      <span className="w-4 shrink-0" />
      <div className="flex flex-1 items-center gap-2">
        {fields.map((c) => (
          <span key={c} className="flex-1 text-center">
            {c}
          </span>
        ))}
        {rpe ? <span className="w-16 shrink-0 text-center">rpe</span> : null}
      </div>
      <span className="w-7 shrink-0" />
    </div>
  )
}

function NumberField({
  value,
  onChange,
  label,
  step,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
  step?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? '1'}
      value={value ?? ''}
      aria-label={label}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={FIELD}
    />
  )
}

function ClockField({
  value,
  onChange,
  label,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      defaultValue={value != null ? fmtTime(value) : ''}
      aria-label={label}
      placeholder="mm:ss"
      onBlur={(e) => onChange(parseClock(e.target.value))}
      className={FIELD}
    />
  )
}

export default function SetRow({
  index,
  set,
  type,
  showRpe: rpeEnabled,
  onChange,
  onRemove,
}: {
  index: number
  set: SetEntry
  type: SetType
  showRpe: boolean
  onChange: (patch: Partial<SetEntry>) => void
  onRemove: () => void
}) {
  // The column exists for the whole exercise, so a drop row leaves a gap
  // rather than shunting the columns above it sideways. It is not reserved at
  // all when RPE is off, which would be 64px of nothing on every row.
  const rpeColumn = rpeEnabled && (type === 'W' || type === 'R')
  const showRpe = rpeColumn && !set.drop

  return (
    <div className="flex items-center gap-2">
      {set.drop ? (
        <span className="w-4 shrink-0 text-[9px] font-medium uppercase leading-tight tracking-wide text-accent">
          drop
        </span>
      ) : (
        <span className="num w-4 shrink-0 text-xs text-muted">{index + 1}</span>
      )}
      <div className="flex flex-1 items-center gap-2">
        {type === 'W' ? (
          <>
            <NumberField value={set.w} onChange={(w) => onChange({ w })} label="Weight" step="2.5" />
            <NumberField value={set.r} onChange={(r) => onChange({ r })} label="Reps" />
          </>
        ) : null}

        {type === 'R' ? <NumberField value={set.r} onChange={(r) => onChange({ r })} label="Reps" /> : null}

        {type === 'T' ? <ClockField value={set.t} onChange={(t) => onChange({ t })} label="Time" /> : null}

        {type === 'WD' ? (
          <>
            <NumberField value={set.w} onChange={(w) => onChange({ w })} label="Weight" step="2.5" />
            <NumberField value={set.d} onChange={(d) => onChange({ d })} label="Feet" />
          </>
        ) : null}

        {type === 'C' ? (
          <>
            <ClockField value={set.t} onChange={(t) => onChange({ t })} label="Time" />
            <NumberField value={set.d} onChange={(d) => onChange({ d })} label="Miles" step="0.1" />
          </>
        ) : null}

        {rpeColumn ? (
          <div className="w-16 shrink-0">
            {showRpe ? (
              <NumberField value={set.rpe} onChange={(rpe) => onChange({ rpe })} label="RPE" step="0.5" />
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remove set ${index + 1}`}
        className="w-7 shrink-0 rounded-lg py-1.5 text-center text-sm text-muted"
      >
        &times;
      </button>
    </div>
  )
}
