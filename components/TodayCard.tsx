'use client'

import { dayById } from '@/lib/onboarding'
import {
  scheduledDays,
  todaysDayId,
  trainedOn,
  upcomingDays,
  WEEKDAYS,
  weekdayOf,
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

  // The next ten sessions the schedule holds, with real dates on them. The
  // fixed Sunday to Saturday grid spent cells on rest days and showed a week
  // that was mostly over by Friday; what somebody planning their life wants is
  // what is coming: Mon 25, Tue 26, Thu 28. Today rides along until it is done.
  const upcoming = upcomingDays(profile, today).map((u) => ({
    ...u,
    label: WEEKDAYS[weekdayOf(u.date)],
    dayNum: Number(u.date.slice(8, 10)),
    done: trainedOn(workouts, u.date),
    today: u.date === today,
  }))

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

      {upcoming.length ? (
        // Sideways, because ten dated sessions deserve more than seven
        // squeezed columns. Tapping one opens it for reading; starting stays
        // its own tap inside, so the strip is safe to browse.
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {upcoming.map((u) => {
            const its = dayById(u.dayId)
            return (
              <button
                key={u.date}
                onClick={() => onPeek(u.dayId)}
                aria-label={`${u.label} ${u.dayNum}, ${its?.name ?? ''}${u.done ? ', trained' : ''}`}
                className="w-[72px] flex-none text-center"
              >
                <span
                  className={`block text-[10px] font-extrabold uppercase ${
                    u.today ? 'text-bright' : 'text-faint'
                  }`}
                >
                  {u.label} <span className="num">{u.dayNum}</span>
                </span>
                {/* Trained is the only filled state, because lime means done.
                    Today is the one with the thicker ring around whatever it
                    already was. */}
                <span
                  className={`mt-1 flex h-11 items-center justify-center rounded-[10px] px-1 text-[9px] font-extrabold uppercase leading-tight ${
                    u.done
                      ? 'bg-accent text-on-accent'
                      : 'text-accent-ink ring-[1.5px] ring-accent-ink/45'
                  } ${u.today ? 'ring-2 ring-accent-ink' : ''}`}
                >
                  <span className="line-clamp-2 overflow-hidden">{its?.name ?? ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Lay your week out on your profile and the next ten sessions appear here, dated.
        </p>
      )}

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
