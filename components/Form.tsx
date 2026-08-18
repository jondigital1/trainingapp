'use client'

// One form vocabulary, used by the questionnaire and by the profile page that
// edits the same answers afterwards. A question should not look like one thing
// on the way in and something else on the way back.

const PILL = 'rounded-xl px-3 py-2.5 text-sm ring-1 text-left'
const ON = 'bg-accent text-on-accent ring-accent'
const OFF = 'bg-ink text-bright ring-edge'

// 16px, always. Anything smaller and iOS zooms the page on focus, which on a
// form this long is genuinely disorienting.
const INPUT =
  'w-full rounded-xl bg-ink px-3 py-3 text-base text-bright ring-1 ring-edge outline-none focus:ring-accent'

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {optional ? <span className="text-xs text-muted">optional</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
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
          {o.note ? (
            <span className={`mt-0.5 block text-xs ${value === o.v ? 'opacity-80' : 'text-muted'}`}>
              {o.note}
            </span>
          ) : null}
        </button>
      ))}
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
          className={`rounded-full px-3 py-2 text-sm ring-1 ${selected.includes(o) ? ON : 'bg-ink text-muted ring-edge'}`}
        >
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

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted">{children}</p>
  )
}
