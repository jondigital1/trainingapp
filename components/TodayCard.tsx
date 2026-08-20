'use client'

import { dayById } from '@/lib/onboarding'
import {
  scheduledDays,
  todaysDayId,
  dayIdFor,
  trainedOn,
  WEEKDAYS,
  weekdayOf,
  weekStart,
} from '@/lib/schedule'
import { weeklyStreak } from '@/lib/gamify'

import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

// The week, and how long you have been keeping it. Every day is a way into a
// session: the Start button picks any workout, this picks the one your week
// says belongs to that day.
//
// The streak sits here because it was three taps deep before, which is no use
// for a number whose whole job is that you do not want to see it end.
export default function TodayCard({
  profile,
  workouts,
  today,
  onStart,
  onPeek,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onStart: (dayId: string) => void
  // Opens the day for reading: what is in it, what it costs, and a Start that
  // is its own tap. Browsing Friday must never start Friday's workout.
  onPeek: (dayId: string) => void
}) {
  const planned = todaysDayId(profile, today)
  const day = planned ? dayById(planned) : null
  const target = scheduledDays(profile) || profile.days || 3
  const streak = weeklyStreak(workouts, today, target)
  const doneToday = trainedOn(workouts, today)

  // This week, Sunday to Saturday, which is the week the streak and the
  // coverage count already use. What is coming next lives in its own list
  // underneath rather than in here, so this card answers one question: where
  // are you in the week you are in.
  const sunday = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const weekday = weekdayOf(iso)
    return {
      iso,
      label: WEEKDAYS[weekday],
      dayId: dayIdFor(profile, iso),
      done: trainedOn(workouts, iso),
      today: iso === today,
    }
  })

  return (
    <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Today</p>
          <p className="mt-0.5 truncate font-display text-[21px] font-semibold tracking-tight">
            {doneToday ? 'Done' : day ? day.name : 'Rest day'}
          </p>
        </div>
        {streak > 0 ? (
          <div className="shrink-0 text-right">
            <p className="num font-display text-xl font-bold leading-none text-accent-ink">{streak}</p>
            <p className="text-[11px] font-bold text-faint">week{streak === 1 ? '' : 's'} in a row</p>
          </div>
        ) : null}
      </div>

      {/* Every planned day opens for reading. Starting stays its own tap
          inside, so the week is safe to browse. */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const its = d.dayId ? dayById(d.dayId) : null
          return (
            <button
              key={d.iso}
              onClick={() => d.dayId && onPeek(d.dayId)}
              disabled={!d.dayId}
              aria-label={
                its
                  ? `${d.label}, ${its.name}${d.done ? ', trained' : ''}`
                  : `${d.label}, rest${d.done ? ', trained anyway' : ''}`
              }
              className="text-center disabled:cursor-default"
            >
              <span
                className={`block text-[10px] font-extrabold uppercase ${
                  d.today ? 'text-bright' : 'text-faint'
                }`}
              >
                {d.label}
              </span>
              {/* Trained is the only filled state, because lime means done.
                  Planned is an outline, rest is a hairline, and today is the
                  one with a thicker ring around whatever it already was. */}
              <span
                className={`mt-1 flex h-9 items-center justify-center rounded-[10px] px-0.5 text-[9px] font-extrabold uppercase leading-tight ${
                  d.done
                    ? 'bg-accent text-on-accent'
                    : d.dayId
                      ? 'text-accent-ink ring-[1.5px] ring-accent-ink/45'
                      : 'ring-1 ring-edge'
                } ${d.today ? 'ring-2 ring-accent-ink' : ''}`}
              >
                <span className="line-clamp-2 overflow-hidden">{its ? its.name : ''}</span>
              </span>
            </button>
          )
        })}
      </div>

      {day && !doneToday ? (
        <button
          onClick={() => onStart(planned!)}
          className="mt-3 w-full rounded-xl bg-accent py-3 font-display text-[15px] font-bold text-on-accent"
        >
          Start {day.name}
        </button>
      ) : null}
    </div>
  )
}
