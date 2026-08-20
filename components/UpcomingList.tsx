'use client'

import { dayById } from '@/lib/onboarding'
import { fmtDate } from '@/lib/format'
import { trainedOn, upcomingDays, WEEKDAY_NAMES, weekdayOf } from '@/lib/schedule'
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
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onPeek: (dayId: string) => void
  // Open the day picker for this date. Plans change, and a schedule you cannot
  // bend without editing the pattern it repeats is a schedule people abandon.
  onMove: (date: string) => void
}) {
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
        <p className="mt-2 rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted ring-1 ring-edge">
          Lay your week out on your profile and the next ten sessions appear here, dated.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        What is coming
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {upcoming.map((u, i) => {
          const its = dayById(u.dayId)
          // "Thu 21 Aug" is the app's date everywhere else; the weekday is
          // spelled out here because a card has the room and a day you are
          // planning around deserves its name.
          const when = `${WEEKDAY_NAMES[weekdayOf(u.date)]} ${fmtDate(u.date).slice(4)}`
          return (
            <div
              key={u.date}
              className={`w-full rounded-2xl bg-card p-4 ring-1 ${
                u.today ? 'ring-[1.5px] ring-accent-ink' : 'ring-edge'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`text-[10.5px] font-extrabold uppercase tracking-[1.5px] ${
                    u.today ? 'text-accent-ink' : 'text-faint'
                  }`}
                >
                  {u.today ? `Today, ${when}` : when}
                </span>
                {/* Lime means done, here as everywhere. Nothing else needs a
                    badge: a day that has not happened yet is just a day. */}
                {u.done ? (
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-on-accent">
                    Done
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate font-display text-[17px] font-semibold tracking-tight">
                {its?.name ?? ''}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                {/* Said out loud, because the whole card being tappable is not
                    an affordance anybody can see. */}
                <button onClick={() => onPeek(u.dayId)} className="text-[12.5px] font-extrabold text-accent-ink">
                  See the exercises &rarr;
                </button>
                {/* Pick the day rather than nudge the card one slot at a
                    time: this session goes where you say, and the days in
                    between are left alone. A day already trained stays where
                    it happened, so it offers nothing. */}
                {u.done ? null : (
                  <button
                    onClick={() => onMove(u.date)}
                    aria-label={`Move ${its?.name ?? 'this session'} from ${fmtDate(u.date)} to another day`}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] font-extrabold text-muted ring-1 ring-edge"
                  >
                    Move
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
