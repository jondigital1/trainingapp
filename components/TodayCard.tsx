'use client'

import { dayById } from '@/lib/onboarding'
import {
  scheduledDays,
  scheduleOf,
  todaysDayId,
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
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onStart: (dayId: string) => void
}) {
  const schedule = scheduleOf(profile)
  const planned = todaysDayId(profile, today)
  const day = planned ? dayById(planned) : null
  const target = scheduledDays(profile) || profile.days || 3
  const streak = weeklyStreak(workouts, today, target)
  const doneToday = trainedOn(workouts, today)

  // The seven days of this week, so the row reads as a week rather than a
  // list: filled where you trained, outlined where you are meant to.
  const sunday = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const weekday = weekdayOf(iso)
    return {
      iso,
      label: WEEKDAYS[weekday],
      dayId: schedule[weekday] ?? null,
      done: trainedOn(workouts, iso),
      today: iso === today,
    }
  })

  return (
    <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">Today</p>
          <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">
            {doneToday ? 'Done' : day ? day.name : 'Rest day'}
          </p>
        </div>
        {streak > 0 ? (
          <div className="shrink-0 text-right">
            <p className="num text-lg font-semibold leading-none text-accent">{streak}</p>
            <p className="text-[11px] text-muted">week{streak === 1 ? '' : 's'} in a row</p>
          </div>
        ) : null}
      </div>

      {/* Every day is a button. Tapping Thursday starts Thursday's session,
          which is the other way into a workout: the Start button picks any of
          them, this picks the one the week says. */}
      <div className="mt-3 flex gap-1">
        {week.map((d) => {
          const its = d.dayId ? dayById(d.dayId) : null
          return (
            <button
              key={d.iso}
              onClick={() => d.dayId && onStart(d.dayId)}
              disabled={!d.dayId}
              aria-label={
                its
                  ? `${d.label}, ${its.name}${d.done ? ', trained' : ''}`
                  : `${d.label}, rest${d.done ? ', trained anyway' : ''}`
              }
              className="flex-1 text-center disabled:cursor-default"
            >
              <span className={`block text-[10px] uppercase ${d.today ? 'text-bright' : 'text-muted'}`}>
                {d.label}
              </span>
              <span
                className={`mx-auto mt-1 flex h-9 items-center justify-center rounded-md px-0.5 text-[9px] leading-tight ring-1 ${
                  d.done
                    ? 'bg-accent text-on-accent ring-accent'
                    : d.dayId
                      ? 'bg-transparent text-accent ring-accent'
                      : 'bg-transparent text-muted ring-edge'
                } ${d.today ? 'ring-2' : ''}`}
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
          className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-on-accent"
        >
          Start {day.name}
        </button>
      ) : null}
    </div>
  )
}
