'use client'

import { useState } from 'react'
import { dayById, type Plan, type Profile } from '@/lib/onboarding'
import { emptySchedule, scheduleOf, suggestSchedule, WEEKDAY_NAMES, WEEKDAYS } from '@/lib/schedule'
import { Field, Note } from './Form'

// Your week, laid out Sunday to Saturday. Days of the week rather than dates,
// because training repeats weekly: say Push on Monday once and it is Push
// every Monday, forever, with nothing to fill in again.
export default function ScheduleCard({
  profile,
  plan,
  onChange,
}: {
  profile: Profile
  plan: Plan | null
  onChange: (schedule: (string | null)[]) => void
}) {
  const schedule = scheduleOf(profile)
  const [open, setOpen] = useState<number | null>(null)
  const choices = plan?.dayIds ?? []

  function set(weekday: number, dayId: string | null) {
    const next = [...schedule]
    next[weekday] = dayId
    onChange(next)
    setOpen(null)
  }

  return (
    <Field
      label="Your week"
      hint="Which session lands on which day. Days of the week, not dates, so it repeats without you touching it again."
    >
      <div className="flex flex-col gap-1">
        {WEEKDAYS.map((short, i) => {
          const day = schedule[i] ? dayById(schedule[i]!) : null
          return (
            <div key={short} className="rounded-xl surface ring-1 ring-edge">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-label={`${WEEKDAY_NAMES[i]}, ${day ? day.name : 'rest'}`}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className="w-9 shrink-0 text-xs uppercase tracking-wide text-muted">{short}</span>
                <span className={`min-w-0 flex-1 truncate text-sm ${day ? '' : 'text-muted'}`}>
                  {day ? day.name : 'Rest'}
                </span>
                <span aria-hidden className="shrink-0 text-xs text-muted">
                  {open === i ? '−' : 'change'}
                </span>
              </button>

              {open === i ? (
                <div className="flex flex-wrap gap-1.5 border-t border-edge px-3 py-2.5">
                  <button
                    onClick={() => set(i, null)}
                    className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                      schedule[i] === null ? 'bg-accent text-on-accent ring-accent' : 'bg-ink text-muted ring-edge'
                    }`}
                  >
                    Rest
                  </button>
                  {choices.map((id, n) => {
                    const d = dayById(id)
                    if (!d) return null
                    return (
                      <button
                        key={`${id}-${n}`}
                        onClick={() => set(i, id)}
                        className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                          schedule[i] === id ? 'bg-accent text-on-accent ring-accent' : 'bg-ink text-muted ring-edge'
                        }`}
                      >
                        {d.name}
                      </button>
                    )
                  })}
                  {choices.length === 0 ? (
                    <span className="text-xs text-muted">
                      Answer the questionnaire and your sessions appear here.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onChange(suggestSchedule(plan))}
          className="rounded-lg surface px-3 py-1.5 text-xs text-muted ring-1 ring-edge"
        >
          Lay out my plan
        </button>
        {schedule.some(Boolean) ? (
          <button
            onClick={() => onChange(emptySchedule())}
            className="rounded-lg px-3 py-1.5 text-xs text-muted"
          >
            Clear
          </button>
        ) : null}
      </div>

      {schedule.some(Boolean) ? (
        <Note>
          The streak counts weeks you hit these days. Nothing stops you training on a rest day, and a
          session on the wrong day still counts toward the week.
        </Note>
      ) : null}
    </Field>
  )
}
