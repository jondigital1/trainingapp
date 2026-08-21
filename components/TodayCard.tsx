'use client'

import { dayById } from '@/lib/onboarding'
import { shiftDays, weekStart, weekdayOf } from '@/lib/week'
import {
  hasSchedule,
  scheduledDays,
  todaysDayId,
  dayIdFor,
  trainedOn,
  WEEKDAYS,
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
  onPlanWeek,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onStart: (dayId: string) => void
  // The way to lay a week out, offered from the one card that can tell it has
  // not been done.
  onPlanWeek: () => void
  // Opens the day for reading: what is in it, what it costs, and a Start that
  // is its own tap. Browsing Friday must never start Friday's workout.
  onPeek: (dayId: string) => void
}) {
  const planned = todaysDayId(profile, today)
  const day = planned ? dayById(planned) : null
  const target = scheduledDays(profile) || profile.days || 3
  const streak = weeklyStreak(workouts, today, target)
  const doneToday = trainedOn(workouts, today)
  // No week laid out at all is not a rest day. A rest day is a decision, and
  // calling an empty profile one hides the single setup step that makes the
  // rest of this screen work.
  const planned7 = hasSchedule(profile)

  // This week, Sunday to Saturday, which is the week the streak and the
  // coverage count already use. What is coming next lives in its own list
  // underneath rather than in here, so this card answers one question: where
  // are you in the week you are in.
  const sunday = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const iso = shiftDays(sunday, i)
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
            {doneToday ? 'Done' : day ? day.name : planned7 ? 'Rest day' : 'No week set yet'}
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
              {/* No names in here.
              
                  It used to print the session's name at nine pixels in a box
                  forty four wide, which is not a size any of them fit in:
                  Shoulders came out as SHOULD and Vertical Pull as VERTICA
                  PULL. Clipped words are not information, and the name of
                  today's session is already the headline directly above this
                  row.
                  
                  So the row says the thing it is actually for: which days hold
                  work, which are behind you, and which one is today. Lime for
                  done, and the week fills with it as you go. Midnight for
                  today when there is something to do, because that is the one
                  cell worth looking at. The tick carries done on its own, so
                  the state does not rest on telling two colours apart. */}
              <span className="mt-1 flex h-9 w-full items-center justify-center">
                <span
                  className={`grid h-7 w-full place-items-center rounded-[9px] ${
                    d.done
                      ? 'bg-accent'
                      : d.today && d.dayId
                        ? 'bg-midnight'
                        : d.today
                          ? 'bg-card ring-[1.5px] ring-accent-ink'
                          : d.dayId
                            ? 'bg-tint-cool ring-1 ring-accent-ink/30'
                            : 'ring-1 ring-edge'
                  }`}
                >
                  {d.done ? <span className="text-[11px] font-extrabold text-on-accent">&#10003;</span> : null}
                </span>
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

      {/* Said here rather than only in the empty list below it, because this
          is the card that is wrong without it: seven blank boxes and a heading
          that cannot say what today is. */}
      {planned7 ? null : (
        <button
          onClick={onPlanWeek}
          className="mt-3 w-full rounded-xl bg-accent py-3 font-display text-[15px] font-bold text-on-accent"
        >
          Lay out your week
        </button>
      )}
    </div>
  )
}
