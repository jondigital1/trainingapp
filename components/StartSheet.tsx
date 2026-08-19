'use client'

import { useEffect, useState } from 'react'
import { SPLITS, dayItems, dayNames } from '@/lib/templates'
import { buildDay, dayById, type Plan, type Profile } from '@/lib/onboarding'
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
  onCopy: (name: string, items: CustomWorkoutItem[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [openSplit, setOpenSplit] = useState<string | null>(SPLITS[0].id)
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!confirm) return
    const timer = setTimeout(() => setConfirm(null), 3000)
    return () => clearTimeout(timer)
  }, [confirm])

  const planDays = (plan?.dayIds ?? []).map((id) => dayById(id)).filter(Boolean)

  return (
    <Sheet title="Start a workout" onClose={onClose}>
      {planDays.length ? (
        <div className="mb-5">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Your plan &middot; {plan!.splitName}</h3>
          <div className="mt-2 flex flex-col gap-2">
            {planDays.map((day, i) => {
              // What is actually in it and what it will cost you, so the choice
              // is made before you commit rather than after.
              const items = buildDay(day!, profile)
              const est = fmtEstimate(estimateSeconds(items, goal))
              return (
                <button
                  key={`${day!.id}-${i}`}
                  onClick={() => onStart(day!.name, items, true, day!.id)}
                  className="surface rounded-[14px] px-3.5 py-3 text-left ring-1 ring-edge"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold">{day!.name}</span>
                    <span className="num shrink-0 text-xs font-bold text-accent-ink">
                      {items.length} exercises{est ? ` \u00b7 ${est}` : ''}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-faint">
                    {items.slice(0, 3).map((it) => it.name).join(', ')}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <button
        onClick={onBuild}
        className="w-full rounded-full border-[1.5px] border-dashed border-edge py-3 text-[13.5px] font-extrabold text-muted"
      >
        Build one from scratch
      </button>

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
