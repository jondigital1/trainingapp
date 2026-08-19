'use client'

import { useEffect, useState } from 'react'
import { fmtPrevious, fmtTime, parseClock } from '@/lib/format'
import { columnsFor } from '@/lib/columns'
import type { SetEntry, SetType } from '@/lib/types'

// Where a row is in the session. Done rows carry a lime wash, because lime
// means finished; the one you are on gets the accent outline, because that is
// the only thing on the screen asking for input; everything after it is a
// quiet placeholder that has not earned attention yet.
export type SetState = 'done' | 'current' | 'todo'

const GRID = 'grid items-center gap-[7px]'

// The columns, and only the ones that exist. Number, the ghost of last time,
// one field per measure, then the remove button.
function template(fields: number, showPrevious: boolean): string {
  return ['20px', showPrevious ? '52px' : null, ...Array(fields).fill('1fr'), '24px']
    .filter(Boolean)
    .join(' ')
}

export function SetHeader({ type, showPrevious }: { type: SetType; showPrevious: boolean }) {
  const columns = columnsFor(type)
  if (!columns.length) return null

  return (
    <div
      className={`${GRID} pb-0.5 text-[10px] font-extrabold uppercase tracking-[1px] text-faint`}
      style={{ gridTemplateColumns: template(columns.length, showPrevious) }}
    >
      <span />
      {showPrevious ? <span className="text-center">last</span> : null}
      {columns.map((c) => (
        <span key={c} className="text-center">
          {c}
        </span>
      ))}
      <span />
    </div>
  )
}

// 16px so iOS does not zoom on focus, and no taller than that needs: a set row
// is read at arm's length between efforts, so it wants to be short and
// unmistakable rather than roomy.
function fieldClass(state: SetState, drop: boolean): string {
  const base =
    'w-full rounded-[10px] px-2 text-center text-base num font-extrabold text-bright outline-none placeholder:font-normal placeholder:text-faint'
  if (drop) return `${base} h-[38px] bg-card ring-1 ring-edge focus:ring-[1.5px] focus:ring-accent-ink`
  if (state === 'done') return `${base} h-10 bg-tint-done focus:ring-[1.5px] focus:ring-accent-ink`
  if (state === 'current') return `${base} h-[42px] bg-card ring-2 ring-accent-ink`
  return `${base} h-[38px] bg-track/60 focus:ring-[1.5px] focus:ring-accent-ink`
}

function NumberField({
  value,
  onChange,
  label,
  step,
  className,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
  step?: string
  className: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? '1'}
      value={value ?? ''}
      aria-label={label}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={className}
    />
  )
}

function ClockField({
  value,
  onChange,
  label,
  className,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
  className: string
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      defaultValue={value != null ? fmtTime(value) : ''}
      aria-label={label}
      placeholder="mm:ss"
      onBlur={(e) => onChange(parseClock(e.target.value))}
      className={className}
    />
  )
}

// The fields the ghost hands over on a tap: everything last time measured,
// nothing it did not.
function copyOf(previous: SetEntry, type: SetType): Partial<SetEntry> {
  if (type === 'W') return { w: previous.w, r: previous.r }
  if (type === 'R') return { r: previous.r }
  if (type === 'T') return { t: previous.t }
  if (type === 'WD') return { w: previous.w, d: previous.d }
  if (type === 'C') return { t: previous.t, d: previous.d }
  return {}
}

export default function SetRow({
  index,
  set,
  type,
  previous,
  showPrevious,
  state = 'todo',
  onChange,
  onRemove,
}: {
  index: number
  set: SetEntry
  type: SetType
  // What you did on this numbered set last time. Beside the row rather than
  // summarised above it, so comparing set three to set three is reading rather
  // than arithmetic.
  previous?: SetEntry | null
  showPrevious: boolean
  state?: SetState
  onChange: (patch: Partial<SetEntry>) => void
  onRemove: () => void
}) {
  const drop = !!set.drop
  // Armed by the first tap on the remove button, disarmed by time.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])
  const last = drop ? null : fmtPrevious(previous, type)
  const f = fieldClass(state, drop)
  const fields = columnsFor(type).length || 1

  return (
    <div className={GRID} style={{ gridTemplateColumns: template(fields, showPrevious) }}>
      {drop ? (
        <span className="text-[10px] font-extrabold uppercase leading-tight tracking-[0.5px] text-accent-ink">
          drop
        </span>
      ) : (
        <span
          className={`num text-xs font-extrabold ${
            state === 'done' ? 'text-lime-ink' : state === 'current' ? 'text-accent-ink' : 'text-faint'
          }`}
        >
          {index + 1}
        </span>
      )}
      {showPrevious ? (
        // Tapping last time logs it again. The most common set in any long
        // history is the one that matches the last session, and its numbers
        // were already on the screen 20px from where they were being retyped:
        // a twenty set session was a hundred touches that are now twenty.
        last && state !== 'done' ? (
          <button
            type="button"
            onClick={() => onChange(copyOf(previous!, type))}
            aria-label={`Log ${last}, same as last time`}
            className="num truncate rounded-md text-center text-xs font-bold text-accent-ink ring-1 ring-edge py-1"
          >
            {last}
          </button>
        ) : (
          <span
            className={`num truncate text-center text-xs font-bold ${
              state === 'todo' ? 'text-faint/70' : 'text-faint'
            }`}
          >
            {last ?? '\u00b7'}
          </span>
        )
      ) : null}

      {type === 'W' ? (
        <>
          <NumberField value={set.w} onChange={(w) => onChange({ w })} label="Weight" step="2.5" className={f} />
          <NumberField value={set.r} onChange={(r) => onChange({ r })} label="Reps" className={f} />
        </>
      ) : null}

      {type === 'R' ? (
        <NumberField value={set.r} onChange={(r) => onChange({ r })} label="Reps" className={f} />
      ) : null}

      {type === 'T' ? (
        <ClockField value={set.t} onChange={(t) => onChange({ t })} label="Time" className={f} />
      ) : null}

      {type === 'WD' ? (
        <>
          <NumberField value={set.w} onChange={(w) => onChange({ w })} label="Weight" step="2.5" className={f} />
          <NumberField value={set.d} onChange={(d) => onChange({ d })} label="Feet" className={f} />
        </>
      ) : null}

      {type === 'C' ? (
        <>
          <ClockField value={set.t} onChange={(t) => onChange({ t })} label="Time" className={f} />
          <NumberField value={set.d} onChange={(d) => onChange({ d })} label="Miles" step="0.1" className={f} />
        </>
      ) : null}

      {/* Two taps, like every other destructive control in a session. This
          one sits in the most fat-finger-prone grid in the app, beside the
          reps field, and it used to erase a logged set on the first touch. */}
      <button
        onClick={() => {
          if (armed) onRemove()
          else setArmed(true)
        }}
        aria-label={armed ? `Really remove set ${index + 1}` : `Remove set ${index + 1}`}
        className={`text-center text-sm ${armed ? 'rounded-md bg-alert font-extrabold text-white' : 'text-faint'}`}
      >
        &times;
      </button>
    </div>
  )
}
