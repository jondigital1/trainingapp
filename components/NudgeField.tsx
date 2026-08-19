'use client'

import { NUDGE_DAYS } from '@/lib/nudge'
import { Field, Options } from './Form'

export interface NudgePref {
  day: number | null
  hour: number
}

// Whole hours. Nobody needs to be checked in on at 18:45.
export const HOURS = Array.from({ length: 24 }, (_, h) => ({
  v: h,
  label: h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`,
}))

/**
 * Asking whether somebody wants a weekly check in, without asking the browser
 * anything.
 *
 * This is a preference, not a permission. The browser's notification prompt is
 * one shot: a no can never be taken back from inside the app, only from the
 * browser's own settings, which nobody opens. Spending it during a
 * questionnaire, before anybody has trained or had a week, is spending it at
 * the moment it is most likely to be refused, and on an iPhone it cannot even
 * be granted until the app is on the home screen.
 *
 * So the questionnaire takes the intent and the finish screen spends the
 * prompt, once they have something to be checked in on.
 */
export function NudgeField({
  value,
  onChange,
  label = 'Want me to check in on your week?',
  hint = 'One message, on the day you pick. Nothing else, ever.',
}: {
  value: NudgePref
  onChange: (v: NudgePref) => void
  label?: string
  hint?: string
}) {
  const on = value.day !== null
  return (
    <>
      <Field label={label} hint={hint}>
        <Options
          columns={2}
          value={on ? 'yes' : 'no'}
          onPick={(v) => onChange({ day: v === 'yes' ? 0 : null, hour: value.hour })}
          options={[
            { v: 'yes' as const, label: 'Yes' },
            { v: 'no' as const, label: 'No thanks' },
          ]}
        />
      </Field>

      {on ? (
        <Field label="When?" hint="Changeable any time in settings.">
          <div className="grid grid-cols-7 gap-1">
            {NUDGE_DAYS.map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => onChange({ day: d.v, hour: value.hour })}
                aria-pressed={value.day === d.v}
                aria-label={d.label}
                className={`rounded-lg py-2 text-xs font-bold ${
                  value.day === d.v
                    ? 'bg-card text-bright ring-[1.5px] ring-accent-ink'
                    : 'surface text-muted ring-1 ring-edge'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
          <label className="surface mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 ring-edge">
            <span className="font-bold">At</span>
            <select
              value={value.hour}
              onChange={(e) => onChange({ day: value.day, hour: Number(e.target.value) })}
              className="bg-transparent text-sm font-bold text-bright outline-none"
            >
              {HOURS.map((h) => (
                <option key={h.v} value={h.v}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
        </Field>
      ) : null}
    </>
  )
}
