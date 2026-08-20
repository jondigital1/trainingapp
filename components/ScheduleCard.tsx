'use client'

import { useState } from 'react'
import { dayById, type Plan, type Profile } from '@/lib/onboarding'
import { SPLITS } from '@/lib/templates'
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
  const [all, setAll] = useState(false)

  // Your plan's own days come first, because they are what the questionnaire
  // worked out and most people want them. They were also the only thing on
  // offer, which meant somebody who wanted Push on Monday could not say so:
  // Push exists, it is startable from the Start button, and it simply was not
  // schedulable. Every session in the library is here now, behind one tap.
  const mine = plan?.dayIds ?? []
  // Grouped under their split rather than each chip carrying its split's name,
  // because half these names repeat across splits and Hamstrings and Glutes
  // with 5 Day Split stuck on the end is wider than a phone.
  const others = SPLITS.map((split) => ({
    name: split.name,
    days: split.days.filter((d) => !mine.includes(d.id)),
  })).filter((s) => s.days.length)

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
                <span className="w-9 shrink-0 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
                  {short}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm ${day ? '' : 'text-muted'}`}>
                  {day ? day.name : 'Rest'}
                </span>
                <span aria-hidden className="shrink-0 text-xs text-muted">
                  {open === i ? '−' : 'change'}
                </span>
              </button>

              {open === i ? (
                <>
                  <div className="flex flex-wrap gap-1.5 border-t border-edge px-3 py-2.5">
                  <button
                    onClick={() => set(i, null)}
                    className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                      schedule[i] === null
                        ? 'bg-card text-bright ring-[1.5px] ring-accent-ink'
                        : 'surface text-muted ring-edge'
                    }`}
                  >
                    Rest
                  </button>
                  {mine.map((id, n) => {
                    const d = dayById(id)
                    if (!d) return null
                    return (
                      <button
                        key={`${id}-${n}`}
                        onClick={() => set(i, id)}
                        className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                          schedule[i] === id
                            ? 'bg-card text-bright ring-[1.5px] ring-accent-ink'
                            : 'surface text-muted ring-edge'
                        }`}
                      >
                        {d.name}
                      </button>
                    )
                  })}
                  {/* Everything else the library holds, one tap away rather
                      than absent. Folded by default so the common case stays
                      four buttons instead of twenty six. */}
                  {all ? null : (
                    <button
                      onClick={() => setAll(true)}
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-accent-ink ring-1 ring-accent-ink/45"
                    >
                      Every other session
                    </button>
                  )}
                  {mine.length === 0 && !all ? (
                    <span className="text-xs text-muted">
                      Answer the questionnaire and your sessions appear here.
                    </span>
                  ) : null}
                  </div>
                  {all ? (
                    <div className="border-t border-edge px-3 py-2.5">
                      {others.map((split) => (
                        <div key={split.name} className="mb-2 last:mb-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-faint">
                            {split.name}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {split.days.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => set(i, d.id)}
                                className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs ring-1 ${
                                  schedule[i] === d.id
                                    ? 'bg-card text-bright ring-[1.5px] ring-accent-ink'
                                    : 'surface text-muted ring-edge'
                                }`}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
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
