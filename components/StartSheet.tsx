'use client'

import { useEffect, useState } from 'react'
import { SPLITS, dayItems, dayNames } from '@/lib/templates'
import {
  AWAY_FULL_BODY,
  AWAY_KITS,
  awayDayFor,
  awaySession,
  buildDay,
  dayById,
  FOCUS_GROUPS,
  type AwayKit,
  type Plan,
  type Profile,
} from '@/lib/onboarding'
import { Many, Options } from './Form'
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
  // The away section. A kit is chosen for today and stored nowhere: the
  // profile keeps saying which gym is yours, because a hotel is not a move.
  const [away, setAway] = useState(false)
  const [kit, setKit] = useState<AwayKit>('home')
  const [awayGroups, setAwayGroups] = useState<string[]>([])

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
      {planDays.length ? (
        <div className="mb-5">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            {own ? 'If you want one handed to you' : 'Your plan'} &middot; {plan!.splitName}
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {planDays.map((day, i) => {
              // What is actually in it and what it will cost you, so the choice
              // is made before you commit rather than after.
              const items = buildDay(day!, profile)
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

      {/* Training somewhere that is not your gym. The plan days are rebuilt
          for what the room has, so a quad day in a hotel is still a quad day,
          and there is a from-scratch builder for when the plan does not fit
          the room at all. Nothing here touches the profile: tomorrow is
          normal. */}
      <div className="mt-5">
        <button
          onClick={() => setAway((v) => !v)}
          aria-expanded={away}
          className="surface flex w-full items-center justify-between rounded-[14px] px-3.5 py-3 text-left ring-1 ring-edge"
        >
          <span className="text-sm font-bold">Away from your gym?</span>
          <span className="text-xs text-muted">{away ? 'close' : 'open'}</span>
        </button>

        {away ? (
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <h4 className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
                What have you got?
              </h4>
              <Options value={kit} onPick={setKit} options={AWAY_KITS} />
            </div>

            {planDays.length ? (
              <div>
                <h4 className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
                  Your plan, on today's kit
                </h4>
                <div className="flex flex-col gap-2">
                  {planDays.map((day, i) => {
                    const items = awayDayFor(day!, profile, kit)
                    if (!items.length) return null
                    return (
                      <DayCard
                        key={`away-${day!.id}-${i}`}
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

            <div>
              <h4 className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
                Or just for what you have
              </h4>
              <Many
                columns={2}
                value={awayGroups}
                onToggle={(g) =>
                  setAwayGroups((v) => (v.includes(g) ? v.filter((x) => x !== g) : [...v, g]))
                }
                options={FOCUS_GROUPS.map((g) => ({ v: g, label: g }))}
              />
              {(() => {
                const groups = awayGroups.length ? awayGroups : AWAY_FULL_BODY
                const items = awaySession(groups, profile, kit)
                if (!items.length) return null
                const est = fmtEstimate(estimateSeconds(items, goal))
                const title = awayGroups.length
                  ? awayGroups.length === 1
                    ? awayGroups[0]
                    : `${awayGroups.slice(0, -1).join(', ')} and ${awayGroups[awayGroups.length - 1]}`
                  : 'Full body'
                return (
                  <button
                    onClick={() => onStart(title, items, true)}
                    className="mt-2 w-full rounded-2xl bg-accent py-3 font-display text-sm font-bold text-on-accent"
                  >
                    Start {title.toLowerCase()} &middot; {items.length} exercises{est ? ` \u00b7 ${est}` : ''}
                  </button>
                )
              })()}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Nothing picked is a full body session. Sore joints and what you are bringing up
                still apply, and your gym stays your gym: this is for today only.
              </p>
            </div>
          </div>
        ) : null}
      </div>

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
