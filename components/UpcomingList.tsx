'use client'

import { useState } from 'react'
import { dayById } from '@/lib/onboarding'
import { weekdayOf } from '@/lib/week'
import { fmtDate } from '@/lib/format'
import { trainedOn, upcomingDays, WEEKDAY_NAMES } from '@/lib/schedule'
import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

/**
 * What is coming, one card per day.
 *
 * The week above answers where you are in the week you are in. This answers
 * the other question, which is what the next fortnight actually asks of you,
 * with real dates on it so it can be read against a calendar that has the rest
 * of your life in it.
 *
 * A card each rather than rows in one, because these are ten separate things
 * to plan around rather than one list to scan, and each one carries the same
 * three facts in the same places: which day it is, what it is, and the way in.
 *
 * Names only, no movements. Ten sessions with six exercises each is sixty
 * lines of text nobody reads, so what is in a day sits one tap inside it.
 */
export default function UpcomingList({
  profile,
  workouts,
  today,
  onPeek,
  onMove,
  onSkip,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onPeek: (dayId: string) => void
  // Open the day picker for this date. Plans change, and a schedule you cannot
  // bend without editing the pattern it repeats is a schedule people abandon.
  onMove: (date: string) => void
  // Not doing this one at all. Moving was the only way to clear a date, and
  // moving is a swap, so the session came back on whatever day you sent it
  // to. There was no way to say a week is a write off without editing the
  // pattern that repeats every week after it.
  onSkip?: (date: string) => void
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const upcoming = upcomingDays(profile, today).map((u) => ({
    ...u,
    done: trainedOn(workouts, u.date),
    today: u.date === today,
  }))

  if (!upcoming.length) {
    return (
      <section>
        <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
          What is coming
        </h3>
        {/* Says what this becomes, and nothing else. The button lives on the
            card above, which is where the problem is stated, and two of the
            same lime button on one screen is one button asked twice. */}
        <p className="mt-2 rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted ring-1 ring-edge">
          Say which day you train what, once, and the next ten sessions appear here with their
          dates. You can move any of them afterwards.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        What is coming
      </h3>
      {/* One card each was ten cards on a phone, every one the same shape
          and the same hundred pixels tall, which is a wall rather than a list.
          Rows say the same three things in a third of the height, and a
          fortnight fits on one screen instead of four.

          The date leads because that is what you are scanning for. The row
          itself opens the day, which is what the whole card did before without
          saying so; the chevron says so. */}
      <ul className="mt-2 overflow-hidden rounded-2xl bg-card ring-1 ring-edge">
        {upcoming.map((u) => {
          const its = dayById(u.dayId)
          const when = `${WEEKDAY_NAMES[weekdayOf(u.date)].slice(0, 3)} ${fmtDate(u.date).slice(4)}`
          return (
            <li
              key={u.date}
              className={`flex items-stretch gap-1 border-b border-edge last:border-b-0 ${
                u.today ? 'bg-tint-cool' : ''
              }`}
            >
              <button
                onClick={() => onPeek(u.dayId)}
                aria-label={`${its?.name ?? 'Session'} on ${fmtDate(u.date)}, see the exercises`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 text-left"
              >
                <span
                  className={`num w-[74px] shrink-0 text-[10.5px] font-extrabold uppercase ${
                    u.today ? 'text-accent-ink' : 'text-faint'
                  }`}
                >
                  {u.today ? 'Today' : when}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-accent-ink">
                  {its?.name ?? ''}
                </span>
                {/* Lime means done, here as everywhere. */}
                {u.done ? (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-extrabold text-on-accent">
                    &#10003;
                  </span>
                ) : null}
              </button>

              {/* Pick the day rather than nudge the row one slot at a time:
                  this session goes where you say and the days in between are
                  left alone. A day already trained stays where it happened, so
                  it offers nothing. */}
              {u.done ? (
                <span className="w-[86px] shrink-0" />
              ) : (
                <span className="flex shrink-0 items-center gap-1 pr-2.5">
                  <button
                    onClick={() => onMove(u.date)}
                    aria-label={`Move ${its?.name ?? 'this session'} from ${fmtDate(u.date)} to another day`}
                    className="rounded-lg px-2 py-1 text-[11.5px] font-extrabold text-muted"
                  >
                    Move
                  </button>
                  {/* Two taps, because the row goes when you do it and a row
                      that vanishes under a stray thumb is worse than one extra
                      tap. Nothing is lost: the weekly pattern is untouched, so
                      the same session is back next week. */}
                  {onSkip ? (
                    <button
                      onClick={() => (confirm === u.date ? onSkip(u.date) : setConfirm(u.date))}
                      aria-label={`Skip ${its?.name ?? 'this session'} on ${fmtDate(u.date)}`}
                      className={`rounded-lg px-2 py-1 text-[11.5px] font-extrabold ${
                        confirm === u.date ? 'text-alert' : 'text-muted'
                      }`}
                    >
                      {confirm === u.date ? 'Sure?' : 'Skip'}
                    </button>
                  ) : null}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
