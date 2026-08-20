'use client'

import { dayById } from '@/lib/onboarding'
import { fmtDate } from '@/lib/format'
import { trainedOn, upcomingDays } from '@/lib/schedule'
import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

/**
 * What is coming, as a list you scroll rather than a grid you decode.
 *
 * The week above answers where you are in the week you are in. This answers
 * the other question, which is what the next fortnight actually asks of you:
 * Monday arms, Tuesday shoulders, Thursday legs, with real dates on them so it
 * can be read against a calendar that has the rest of your life in it.
 *
 * Names only, no movements. A list of ten sessions with six exercises each is
 * sixty lines of text nobody reads, and what is in a day is one tap away on
 * the day itself.
 */
export default function UpcomingList({
  profile,
  workouts,
  today,
  onPeek,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  onPeek: (dayId: string) => void
}) {
  const upcoming = upcomingDays(profile, today).map((u) => ({
    ...u,
    done: trainedOn(workouts, u.date),
    today: u.date === today,
  }))

  if (!upcoming.length) {
    return (
      <section className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
          What is coming
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Lay your week out on your profile and the next ten sessions appear here, dated.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-edge">
      <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        What is coming
      </h3>
      <ul className="mt-2 flex flex-col">
        {upcoming.map((u, i) => {
          const its = dayById(u.dayId)
          return (
            <li key={u.date}>
              <button
                onClick={() => onPeek(u.dayId)}
                aria-label={`${fmtDate(u.date)}, ${its?.name ?? ''}${u.done ? ', trained' : ''}`}
                className={`flex w-full items-center justify-between gap-3 py-3 text-left ${
                  i > 0 ? 'border-t border-edge' : ''
                }`}
              >
                <span className="min-w-0">
                  <span
                    className={`num block text-xs font-extrabold ${
                      u.today ? 'text-accent-ink' : 'text-faint'
                    }`}
                  >
                    {u.today ? 'Today' : fmtDate(u.date)}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-bold">{its?.name ?? ''}</span>
                </span>
                {/* Lime means done, here as everywhere. Nothing else needs a
                    badge: a day that has not happened yet is just a day. */}
                {u.done ? (
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-on-accent">
                    Done
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
