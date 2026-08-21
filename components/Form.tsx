'use client'

import CoachChip from './CoachChip'
import type { Question } from '@/lib/questions'

// One form vocabulary, used by the questionnaire and by the profile page that
// edits the same answers afterwards. A question should not look like one thing
// on the way in and something else on the way back.

// Selection is an outline, never a fill. Lime means "this is the one thing to
// press on this screen", and a list of six chosen answers is not six primary
// actions. So a picked option is the card colour with an accent-ink edge and a
// check, and the eye still finds it instantly because nothing else has an edge.
const PILL = 'relative rounded-xl px-3 py-2.5 pr-9 text-sm ring-1 text-left leading-snug'
const ON = 'bg-card text-bright ring-[1.5px] ring-accent-ink'
const OFF = 'surface text-bright ring-edge'

// 16px, always. Anything smaller and iOS zooms the page on focus, which on a
// form this long is genuinely disorienting.
const INPUT =
  'w-full rounded-xl surface px-3 py-3 text-base text-bright ring-1 ring-edge outline-none focus:ring-accent-ink'

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  // Optional, for the one case where the thing above already named it and
  // saying it twice on one screen is just saying it twice.
  label?: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 first:mt-0">
      {label || optional ? (
        <div className="flex items-baseline justify-between gap-2">
          {label ? <h3 className="text-sm font-medium">{label}</h3> : null}
          {optional ? <span className="text-xs text-muted">optional</span> : null}
        </div>
      ) : null}
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  )
}

// One of the shared questions, drawn the same way wherever it is asked. The
// label, the hint and the choices come from the question itself, so a screen
// cannot ask it and leave the explanation behind.
export function Ask<T extends string | number>({
  q,
  value,
  onPick,
  optional,
  hint,
}: {
  q: Question<T>
  value: T | undefined
  onPick: (v: T) => void
  optional?: boolean
  // Only for the rare case where one screen honestly has more to say than the
  // other. Everything else belongs on the question.
  hint?: string
}) {
  return (
    <Field label={q.label} hint={hint ?? q.hint} optional={optional}>
      <Options columns={q.columns} value={value} onPick={onPick} options={q.options} />
    </Field>
  )
}

export function Options<T extends string | number>({
  options,
  value,
  onPick,
  columns = 1,
}: {
  options: { v: T; label: string; note?: string }[]
  value: T | undefined
  onPick: (v: T) => void
  columns?: 1 | 2
}) {
  return (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onPick(o.v)}
          className={`${PILL} ${value === o.v ? ON : OFF}`}
        >
          <span className="block">{o.label}</span>
          {o.note ? <span className="mt-0.5 block text-xs text-muted">{o.note}</span> : null}
          {value === o.v ? <Check /> : null}
        </button>
      ))}
    </div>
  )
}

// Pick as many as you like. Same shape as Options, same outline selection, but
// the answer is a list. Used for goals, where somebody wanting three things is
// a fact about them rather than a mistake to correct.
export function Many<T extends string>({
  options,
  value,
  onToggle,
  columns = 1,
  ordered = false,
}: {
  // disabled is for a cap: the ones you have not picked go quiet once the
  // limit is reached, so the limit is something you can see rather than a tap
  // that silently does nothing.
  options: { v: T; label: string; note?: string; disabled?: boolean }[]
  value: T[]
  onToggle: (v: T) => void
  columns?: 1 | 2
  // The badge counts instead of ticking, because the order things were tapped
  // in is the order they are wanted in and the card should say so.
  ordered?: boolean
}) {
  return (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
      {options.map((o) => {
        const on = value.includes(o.v)
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={on}
            disabled={o.disabled}
            onClick={() => onToggle(o.v)}
            className={`${PILL} ${on ? ON : OFF} ${o.disabled ? 'opacity-45' : ''}`}
          >
            <span className="block">{o.label}</span>
            {o.note ? <span className="mt-0.5 block text-xs text-muted">{o.note}</span> : null}
            {on ? ordered ? <Rank n={value.indexOf(o.v) + 1} /> : <Check /> : null}
          </button>
        )
      })}
    </div>
  )
}

export function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={selected.includes(o)}
          onClick={() => onToggle(o)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm ring-1 ${
            selected.includes(o)
              ? 'bg-card text-bright ring-[1.5px] ring-accent-ink'
              : 'surface text-muted ring-edge'
          }`}
        >
          {selected.includes(o) ? <Tick /> : null}
          {o}
        </button>
      ))}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={INPUT}
    />
  )
}

// Numbers come back as strings and stay strings while they are being typed:
// parsing on every keystroke turns "18." into 18 and fights the person typing
// 18.5. The caller parses when it saves.
export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  decimal,
}: {
  value: string
  onChange: (v: string) => void
  suffix?: string
  placeholder?: string
  decimal?: boolean
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        placeholder={placeholder}
        className={`${INPUT} num ${suffix ? 'pr-12' : ''}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

// A note is the bot talking, so it looks like the bot talking.
export function Note({ children }: { children: React.ReactNode }) {
  return <CoachChip bubble className="mt-3">{children}</CoachChip>
}

// The check that says which one is picked, since the fill no longer does.
function Rank({ n }: { n: number }) {
  return (
    <span className="absolute right-3 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-accent-ink text-[11px] font-semibold leading-none text-card">
      {n}
    </span>
  )
}

function Check() {
  return (
    <span className="absolute right-3 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-accent-ink">
      <Tick on />
    </span>
  )
}

function Tick({ on }: { on?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden className="flex-none">
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.8"
        fill="none"
        stroke={on ? 'var(--color-card)' : 'var(--color-accent-ink)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
