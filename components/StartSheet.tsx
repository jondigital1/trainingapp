'use client'

import { useEffect, useState } from 'react'
import { SPLITS, dayItems, dayNames } from '@/lib/templates'
import { awayDayFor, dayById, type Plan, type Profile } from '@/lib/onboarding'
import KitPill from './KitPill'
import { estimateSeconds, fmtEstimate } from '@/lib/estimate'
import Sheet from './Sheet'
import type { CustomWorkout, CustomWorkoutItem, Goal } from '@/lib/types'

export default function StartSheet({
  plan,
  profile,
  goal,
  customWorkouts,
  onStart,
  onBuild,
  onEdit,
  onShare,
  onCopy,
  onDelete,
  onClose,
}: {
  plan: Plan | null
  profile: Profile
  goal: Goal
  customWorkouts: CustomWorkout[]
  onStart: (title: string, items: CustomWorkoutItem[], sort?: boolean, dayId?: string) => void
  onBuild: () => void
  onEdit: (id: string) => void
  // Publishes a copy and hands back the link, so a workout can be passed to
  // somebody without either of them being anybody's client.
  onShare: (workout: CustomWorkout) => void
  onCopy: (name: string, items: CustomWorkoutItem[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [openSplit, setOpenSplit] = useState<string | null>(SPLITS[0].id)
  const [confirm, setConfirm] = useState<string | null>(null)
  // One kit for the whole sheet, chosen for today and stored nowhere: the
  // profile keeps saying which gym is yours, because a hotel is not a move.
  //
  // Asked once rather than per section. Both things on this sheet that build
  // you a session read it, and two controls for one question on one screen is
  // how the two of them come to disagree.
  const [kit, setKit] = useState<Profile['access']>(profile.access ?? 'full')
  const [kitOpen, setKitOpen] = useState(false)


  useEffect(() => {
    if (!confirm) return
    const timer = setTimeout(() => setConfirm(null), 3000)
    return () => clearTimeout(timer)
  }, [confirm])

  const planDays = (plan?.dayIds ?? []).map((id) => dayById(id)).filter(Boolean)

  const own = !!plan?.selfDirected

  // First on the sheet for everybody. It sat under the plan for anybody
  // following one, which put the one thing you came here to make below four
  // things you did not, and it was the last thing on a sheet that scrolls.
  //
  // Two treatments, one position. Somebody who writes their own workouts gets
  // it as the loud button, since it is the whole reason they opened this.
  // Somebody on a plan gets it quietly, because the plan days under it are
  // still what they are most likely to want.
  const build = (
    <button
      onClick={onBuild}
      className={
        own
          ? 'mb-5 w-full rounded-2xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent'
          : 'mb-5 w-full rounded-full border-[1.5px] border-dashed border-edge py-3 text-[13.5px] font-extrabold text-muted'
      }
    >
      Create custom workout
    </button>
  )

  return (
    <Sheet title="Start a workout" onClose={onClose}>
      {build}
      {/* One line, not a question. The honest answer is "my gym" almost every
          day, so asking outright would put a decision in front of everybody
          that matters to somebody a few times a year. It says where it thinks
          you are and opens only when that is wrong.

          There was a whole collapsible section called "Away from your gym?"
          here. It held three things: this control, a second copy of the plan
          days rebuilt for the kit, and a session built from muscle groups.
          Only the first was about being away. The plan days are the plan
          whatever room you are in, and building a session for chosen muscles
          is what somebody at their own gym wants when the day does not suit
          them. A general feature behind a specific pretext, and a duplicate
          list, both gone. */}
      <div className="mb-4">
        <KitPill
          kit={kit}
          home={profile.access}
          open={kitOpen}
          note="For today only. Your gym stays your gym, and tomorrow is normal."
          onToggle={setKitOpen}
          onPick={setKit}
        />
      </div>

      {planDays.length ? (
        <div className="mb-5">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            {own ? 'If you want one handed to you' : 'Your plan'} &middot; {plan!.splitName}
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {planDays.map((day, i) => {
              // Built against today's kit rather than the profile's, which for
              // most people on most days is the same thing. A quad day in a
              // hotel is still a quad day: the same build makes it, so the
              // swaps land where a sore joint would send them.
              const items = awayDayFor(day!, profile, kit)
              if (!items.length) return null
              return (
                <DayCard
                  key={`${day!.id}-${i}`}
                  name={day!.name}
                  items={items}
                  goal={goal}
                  onStart={() => onStart(day!.name, items, true, day!.id)}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {customWorkouts.length ? (
        <div className="mt-5">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">My workouts</h3>
          <div className="mt-2 flex flex-col gap-2">
            {customWorkouts.map((w) => (
              <div key={w.id} className="flex items-center gap-2">
                <button
                  onClick={() => onStart(w.name, w.items)}
                  className="surface flex-1 rounded-[14px] px-3.5 py-3 text-left ring-1 ring-edge"
                >
                  <span className="text-sm font-bold">{w.name}</span>
                  <span className="num ml-2 text-xs text-faint">{w.items.length}</span>
                </button>
                <button
                  onClick={() => onShare(w)}
                  aria-label={`Share ${w.name}`}
                  className="px-2 py-3 text-[12.5px] font-extrabold text-muted"
                >
                  Share
                </button>
                <button
                  onClick={() => onEdit(w.id)}
                  aria-label={`Edit ${w.name}`}
                  className="px-2 py-3 text-[12.5px] font-extrabold text-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => (confirm === w.id ? onDelete(w.id) : setConfirm(w.id))}
                  aria-label={`Delete ${w.name}`}
                  className={`px-2 py-3 text-[12.5px] font-extrabold ${
                    confirm === w.id ? 'rounded-lg bg-alert text-white' : 'text-muted'
                  }`}
                >
                  {confirm === w.id ? 'Sure?' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Templates</h3>
        <div className="mt-2 flex flex-col gap-2">
          {SPLITS.map((split) => (
            <div key={split.id} className="surface overflow-hidden rounded-[14px] ring-1 ring-edge">
              <button
                onClick={() => setOpenSplit(openSplit === split.id ? null : split.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left"
              >
                <span>
                  <span className="text-sm font-bold">{split.name}</span>
                  <span className="ml-2 text-xs text-faint">{split.note}</span>
                </span>
                <span className="num text-xs text-faint">{split.days.length}</span>
              </button>
              {openSplit === split.id ? (
                <div className="flex flex-col border-t border-edge">
                  {/* Start it as written, or take a copy into the builder and
                      make it yours. A template that nearly fits is worth
                      changing rather than working around every week. */}
                  {split.days.map((day) => (
                    <div key={day.id} className="flex items-center">
                      <button
                        onClick={() => onStart(day.name, dayItems(day))}
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <span className="block text-sm font-bold text-bright">{day.name}</span>
                        <span className="block truncate text-xs text-faint">
                          {dayNames(day).slice(0, 2).join(', ')}
                        </span>
                      </button>
                      <button
                        onClick={() => onCopy(day.name, dayItems(day))}
                        aria-label={`Make my own version of ${day.name}`}
                        className="shrink-0 px-3 py-3 text-[12.5px] font-extrabold text-muted"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

/**
 * One session, offered. What is in it and what it will cost you, so the choice
 * is made before you commit rather than after.
 *
 * Written out twice, once for the plan and once for the same plan rebuilt on
 * whatever kit the room has. The two cards said the same thing and had to keep
 * on saying the same thing, since a quad day is a quad day whether you are in
 * your gym or a hotel.
 */
function DayCard({
  name,
  items,
  goal,
  onStart,
}: {
  name: string
  items: CustomWorkoutItem[]
  goal: Goal
  onStart: () => void
}) {
  const est = fmtEstimate(estimateSeconds(items, goal))
  return (
    <button onClick={onStart} className="surface rounded-[14px] px-3.5 py-3 text-left ring-1 ring-edge">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{name}</span>
        <span className="num shrink-0 text-xs font-bold text-accent-ink">
          {items.length} exercises{est ? ` · ${est}` : ''}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-faint">
        {items.slice(0, 3).map((it) => it.name).join(', ')}
      </p>
    </button>
  )
}
