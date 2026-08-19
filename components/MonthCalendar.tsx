'use client'

import { useState } from 'react'
import { dayById } from '@/lib/onboarding'
import { monthGrid, monthLabel, shiftMonth, WEEKDAYS } from '@/lib/schedule'
import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

/**
 * The month, on the tab called Calendar.
 *
 * That tab showed today and nothing else, which made a page named after a
 * calendar the emptiest screen in the app: on a rest day it was a heading, a
 * line of grey text, and half a phone of white. A log is worth keeping because
 * it accumulates, and the accumulation was three taps away on another tab.
 *
 * Trained days are filled, because lime means done and this is the one screen
 * where a month of them lands at once. Planned days are outlined, so the shape
 * of the week you meant to have is visible against the one you had. Rest days
 * are nothing at all, which is the point of a rest day.
 */
export default function MonthCalendar({
  profile,
  workouts,
  today,
  onOpenDate,
  onPeek,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  // A day that was trained: opens what was logged.
  onOpenDate: (date: string) => void
  // A planned day that was not: opens what it holds.
  onPeek: (dayId: string) => void
}) {
  const [anchor, setAnchor] = useState(today)
  const cells = monthGrid(profile, workouts, anchor, today)
  const trainedThisMonth = cells.filter((c) => c.inMonth && c.trained).length

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-edge">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setAnchor(shiftMonth(anchor, -1))}
          aria-label="Previous month"
          className="rounded-lg px-2 py-1 text-sm text-muted"
        >
          &larr;
        </button>
        <div className="text-center">
          <p className="font-display text-[15px] font-bold">{monthLabel(anchor)}</p>
          <p className="text-[11px] font-bold text-faint">
            {trainedThisMonth} {trainedThisMonth === 1 ? 'session' : 'sessions'}
          </p>
        </div>
        <button
          onClick={() => setAnchor(shiftMonth(anchor, 1))}
          aria-label="Next month"
          className="rounded-lg px-2 py-1 text-sm text-muted"
        >
          &rarr;
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-center text-[10px] font-extrabold uppercase text-faint">
            {w.slice(0, 1)}
          </span>
        ))}
        {cells.map((c) => {
          const its = c.dayId ? dayById(c.dayId) : null
          // Trained opens what was logged. A planned day that has not happened
          // opens what it holds. A rest day with nothing on it does nothing,
          // because there is nothing to show.
          const act = c.trained ? () => onOpenDate(c.date) : c.dayId ? () => onPeek(c.dayId!) : undefined
          return (
            <button
              key={c.date}
              onClick={act}
              disabled={!act}
              aria-label={`${c.date}${c.trained ? ', trained' : its ? `, ${its.name} planned` : ', rest'}`}
              className={`num flex aspect-square items-center justify-center rounded-[10px] text-xs font-bold disabled:cursor-default ${
                c.inMonth ? '' : 'opacity-35'
              } ${
                c.trained
                  ? 'bg-accent text-on-accent'
                  : c.dayId
                    ? `text-accent-ink ring-1 ${c.future ? 'ring-accent-ink/35' : 'ring-accent-ink/20'}`
                    : 'text-faint'
              } ${c.today ? 'ring-2 ring-accent-ink' : ''}`}
            >
              {c.day}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Filled is trained. Outlined is what your week asks for. Tap a filled day to see what you
        did, or a planned one to see what it holds.
      </p>
    </section>
  )
}
