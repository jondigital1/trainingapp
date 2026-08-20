'use client'

import Sheet from './Sheet'
import { daysBetween, weekdayOf } from '@/lib/week'
import { dayById } from '@/lib/onboarding'
import { fmtDate } from '@/lib/format'
import { dayIdFor, datesAhead, trainedOn, upcomingDays, WEEKDAY_NAMES } from '@/lib/schedule'
import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

/**
 * Which day, for the two questions that turn out to be one question.
 *
 * Moving Thursday's session to Saturday and deciding to do Push on Saturday
 * are the same act from different directions, and both come down to picking a
 * date and seeing what is already on it. One list, used by both.
 *
 * Rest days are in it. A day the pattern left empty is the likeliest place a
 * session is going, so it cannot be the one place nobody is offered. A day
 * already trained is shown and says so rather than quietly going missing.
 */
export default function WhichDaySheet({
  title,
  note,
  profile,
  workouts,
  today,
  exclude,
  onPick,
  onClose,
}: {
  title: string
  note: string
  profile: Profile
  workouts: Workout[]
  today: string
  // A date that is not worth offering, being the one this started from.
  exclude?: string
  onPick: (date: string) => void
  onClose: () => void
}) {
  // Far enough to reach the end of the list this was opened from, so nothing
  // visible on the Calendar tab is unreachable from here, and no further.
  const last = upcomingDays(profile, today).at(-1)?.date
  const span = Math.min(28, Math.max(14, last ? daysBetween(today, last) + 1 : 14))

  const options = datesAhead(today, span)
    .filter((iso) => iso !== exclude)
    .map((iso) => {
      const id = dayIdFor(profile, iso)
      return { iso, holds: id ? dayById(id) : undefined, done: trainedOn(workouts, iso) }
    })

  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{note}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <button
            key={o.iso}
            onClick={() => onPick(o.iso)}
            disabled={o.done}
            className="flex items-center justify-between gap-3 rounded-2xl bg-track px-3.5 py-3 text-left ring-1 ring-edge disabled:opacity-40"
          >
            <span className="min-w-0">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
                {WEEKDAY_NAMES[weekdayOf(o.iso)]} {fmtDate(o.iso).slice(4)}
                {o.iso === today ? ', today' : ''}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold">
                {o.holds?.name ?? 'Rest day'}
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-faint">
              {o.done ? 'Trained' : 'Put it here'}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
