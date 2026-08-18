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

// What today asks of you, and how long you have been answering. The streak was
// buried three taps deep, which is no use for a number whose whole job is that
// you do not want to see it end.
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
      planned: schedule[weekday] !== null && schedule[weekday] !== undefined,
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

      <div className="mt-3 flex gap-1">
        {week.map((d) => (
          <div key={d.iso} className="flex-1 text-center">
            <span className={`block text-[10px] uppercase ${d.today ? 'text-bright' : 'text-muted'}`}>
              {d.label}
            </span>
            <span
              aria-label={`${d.label}${d.done ? ', trained' : d.planned ? ', planned' : ''}`}
              className={`mx-auto mt-1 block h-6 rounded-md ring-1 ${
                d.done
                  ? 'bg-accent ring-accent'
                  : d.planned
                    ? 'bg-transparent ring-accent'
                    : 'bg-transparent ring-edge'
              } ${d.today ? 'ring-2' : ''}`}
            />
          </div>
        ))}
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
