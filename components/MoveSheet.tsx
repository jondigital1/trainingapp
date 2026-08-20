'use client'

import Sheet from './Sheet'
import { dayById } from '@/lib/onboarding'
import { fmtDate } from '@/lib/format'
import { dayIdFor, datesAhead, daysBetween, trainedOn, upcomingDays, WEEKDAY_NAMES, weekdayOf } from '@/lib/schedule'
import type { Profile } from '@/lib/onboarding'
import type { Workout } from '@/lib/types'

/**
 * Where this session is going.
 *
 * Arrows that trade a card with the card beside it can only move a session
 * one slot at a time, and getting from Monday to Friday that way shuffles
 * everything in between. Picking the day outright touches two dates and
 * nothing else.
 *
 * Rest days are in the list. A day the pattern left empty is the most likely
 * place somebody wants to put a session, so it cannot be the one place they
 * are not offered.
 */
export default function MoveSheet({
  profile,
  workouts,
  today,
  date,
  onPick,
  onClose,
}: {
  profile: Profile
  workouts: Workout[]
  today: string
  // The date whose session is being moved.
  date: string
  onPick: (target: string) => void
  onClose: () => void
}) {
  const mine = dayIdFor(profile, date)
  const its = mine ? dayById(mine) : undefined

  // Far enough to reach the end of the list this was opened from, so nothing
  // visible on the Calendar tab is unreachable from here, and no further.
  const last = upcomingDays(profile, today).at(-1)?.date
  const span = Math.min(28, Math.max(14, last ? daysBetween(today, last) + 1 : 14))

  const options = datesAhead(today, span)
    .filter((iso) => iso !== date)
    .map((iso) => {
      const id = dayIdFor(profile, iso)
      const holds = id ? dayById(id) : undefined
      return { iso, holds, done: trainedOn(workouts, iso) }
    })

  return (
    <Sheet title={`Move ${its?.name ?? 'this session'}`} onClose={onClose}>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
        From {fmtDate(date)}. Whatever the day you pick already holds comes back here, and
        only these two dates change. The weeks after this one keep the schedule you set.
      </p>
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
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold">
                {o.holds?.name ?? 'Rest day'}
              </span>
            </span>
            {/* A day already trained is not somewhere a session can be sent,
                and saying why beats an arrow that does nothing when tapped. */}
            <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-faint">
              {o.done ? 'Trained' : 'Move here'}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
