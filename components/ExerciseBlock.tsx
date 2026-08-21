'use client'

import { useEffect, useRef, useState } from 'react'
import { coach } from '@/lib/coach'
import { fmtPrescription, prescribe } from '@/lib/prescribe'
import { fmtDate, isEmptySet, topSet, uid } from '@/lib/format'
import { beatsLast, PR_LABEL, prsFor, volumePr, type Bests } from '@/lib/gamify'
import { isFullSet, restFor } from '@/lib/rest'
import { fmtTime } from '@/lib/format'
import SetRow, { SetHeader, type SetState } from './SetRow'
import CoachChip from './CoachChip'
import type { Exercise, Goal, SetEntry } from '@/lib/types'

export interface LastSession {
  date: string
  exercise: Exercise
}

// Carries the weight forward: last set of this exercise, else the top set of
// the last session.
function seedSet(exercise: Exercise, last: LastSession | null): SetEntry {
  const previous = exercise.sets[exercise.sets.length - 1]
  const source = previous && !isEmptySet(previous, exercise.type) ? previous : last ? topSet(last.exercise) : null
  return {
    id: uid(),
    w: source?.w ?? null,
    r: null,
    rpe: null,
    t: null,
    d: null,
    raw: null,
  }
}

export default function ExerciseBlock({
  exercise,
  goal,
  last,
  bests,
  live,
  active = false,
  onRest,
  label,
  restSeconds,
  effort = 1,
  lighter = false,
  restOnComplete = true,
  onMove,
  onOpen,
  onSuperset,
  onSwap,
  onChange,
  onRemove,
}: {
  exercise: Exercise
  goal: Goal
  last: LastSession | null
  bests: Bests
  live: boolean
  // The exercise holding the set you are on. Gets the outline, so a session
  // with ten movements in it still says where you are.
  active?: boolean
  onRest: (exerciseId: string, name: string, seconds: number) => void
  label?: string
  restSeconds?: number
  effort?: number
  // The plan's lighter version: one set fewer on everything.
  lighter?: boolean
  restOnComplete?: boolean
  onMove: (direction: -1 | 1) => void
  // Opens everything the app knows about this movement: the note kept against
  // it, the chart, and every time it has been done.
  onOpen?: () => void
  onSuperset?: () => void
  onSwap?: () => void
  onChange: (next: Exercise) => void
  onRemove: () => void
}) {
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!confirm) return
    const timer = setTimeout(() => setConfirm(false), 3000)
    return () => clearTimeout(timer)
  }, [confirm])

  const working = exercise.sets.filter((s) => !s.drop)
  const filled = working.filter((s) => !isEmptySet(s, exercise.type))
  const basis = filled.length ? filled[filled.length - 1] : last ? topSet(last.exercise) ?? undefined : undefined
  const asked = prescribe(exercise.name, exercise.type, goal, lighter)
  const advice = coach(basis, exercise.type, goal, asked?.reps)
  const fromLast = filled.length === 0 && !!basis

  const rest = restSeconds ?? restFor(exercise.name, exercise.type, goal, effort)

  // Sets that have already started their clock. Fixing a typo in a logged
  // set clears it and completes it again, and without this the correction
  // restarted a full rest and scheduled a push alert at somebody mid lift.
  const rested = useRef(new Set<string>())

  function patchSet(id: string, patch: Partial<SetEntry>) {
    const before = exercise.sets.find((s) => s.id === id)
    const after = before ? { ...before, ...patch } : null
    onChange({ ...exercise, sets: exercise.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

    // The moment a set becomes a set is the moment you want the clock running,
    // and only the first time it becomes one. Only on today's session: editing
    // last Tuesday should not start a timer. In a superset the clock only
    // starts after the last movement in the group, because the whole point is
    // that you do not rest in between.
    if (
      live &&
      restOnComplete &&
      before &&
      after &&
      !rested.current.has(id) &&
      !isFullSet(before, exercise.type) &&
      isFullSet(after, exercise.type)
    ) {
      rested.current.add(id)
      onRest(exercise.id, exercise.name, rest)
    }
  }

  return (
    <div
      className={`rounded-[18px] bg-card p-3.5 ${
        active ? 'ring-2 ring-accent-ink' : 'ring-1 ring-edge'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[16.5px] font-semibold leading-snug">
            {label ? (
              <span className="num mr-2 inline-grid h-6 w-6 place-items-center rounded-md bg-accent-ink align-middle text-[11px] font-extrabold text-card">
                {label}
              </span>
            ) : null}
            {onOpen ? (
              // The name is the way in, because it is the thing somebody is
              // already looking at when they want to know about the movement.
              <button
                type="button"
                onClick={onOpen}
                aria-label={`About ${exercise.name}`}
                className="text-left underline decoration-edge decoration-2 underline-offset-4"
              >
                {exercise.name}
              </button>
            ) : (
              exercise.name
            )}
            {volumePr(exercise, bests) ? (
              <span className="ml-2 align-middle rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-on-accent">
                Best session
              </span>
            ) : null}
          </h3>
          {/* What the plan asks for, then the date. What you did is on the
              rows themselves now, where set three sits beside set three
              instead of being summarised into a line you have to parse. */}
          <p className="num mt-0.5 text-xs font-bold text-faint">
            {asked ? <span className="text-accent-ink">{fmtPrescription(asked)}</span> : null}
            {asked && last ? ' \u00b7 ' : ''}
            {last ? `Last ${fmtDate(last.date)}` : asked ? '' : 'First time logging this'}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={() => onMove(-1)} aria-label="Move up" className="px-1.5 py-1 text-sm text-faint">
            &uarr;
          </button>
          <button onClick={() => onMove(1)} aria-label="Move down" className="px-1.5 py-1 text-sm text-faint">
            &darr;
          </button>
          <button
            onClick={() => (confirm ? onRemove() : setConfirm(true))}
            aria-label={confirm ? 'Confirm remove exercise' : 'Remove exercise'}
            className={`ml-0.5 rounded-lg px-1.5 py-1 text-sm ${confirm ? 'bg-alert text-white' : 'text-faint'}`}
          >
            {confirm ? 'Sure?' : '\u00d7'}
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        <SetHeader type={exercise.type} showPrevious={!!last} />
        {(() => {
          // set numbers and the ghost comparison count working rows only, so a
          // drop between sets two and three does not shift everything after it
          const lastWorking = (last?.exercise.sets ?? []).filter((s) => !s.drop)
          // The row you are on is the first one still empty. Everything before
          // it is done, everything after is waiting.
          const firstUnfinished = exercise.sets.findIndex((s) => !isFullSet(s, exercise.type))
          let workingIndex = -1
          return exercise.sets.map((set, position) => {
          if (!set.drop) workingIndex += 1
          const i = workingIndex
          // Only the exercise you are on gets a current row. Ten movements
          // showing ten outlined rows would be ten places to look.
          // Done means full, because lime means finished: a row seeded with
          // last time's weight but no reps yet is a set you are about to do.
          const state: SetState = isFullSet(set, exercise.type)
            ? 'done'
            : active && position === firstUnfinished
              ? 'current'
              : 'todo'
          const records = prsFor(set, exercise.type, bests, goal)
          const beat = !set.drop && records.length === 0 && beatsLast(set, lastWorking[i], exercise.type)
          return (
            <div key={set.id} className="flex flex-col gap-0.5">
              <SetRow
                index={i}
                set={set}
                type={exercise.type}
                previous={lastWorking[i]}
                showPrevious={!!last}
                state={state}
                onChange={(patch) => patchSet(set.id, patch)}
                onRemove={() => onChange({ ...exercise, sets: exercise.sets.filter((s) => s.id !== set.id) })}
              />
              {records.length ? (
                <p className="pl-[27px] text-[11.5px] font-extrabold leading-tight text-accent-ink">
                  PR &middot; {records.map((k) => PR_LABEL[k].toLowerCase()).join(', ')}
                </p>
              ) : beat ? (
                <p className="pl-[27px] text-[11.5px] font-bold leading-tight text-faint">Up on last time</p>
              ) : null}
            </div>
          )
        })
        })()}
      </div>

      {advice ? (
        <CoachChip className="mt-2.5">
          {fromLast ? 'Next set, ' : ''}
          {advice}
        </CoachChip>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onChange({ ...exercise, sets: [...exercise.sets, seedSet(exercise, last)] })}
          className="flex-1 rounded-full bg-track py-2.5 text-[13px] font-extrabold text-bright"
        >
          + Add set
        </button>
        {onSwap ? (
          <button
            onClick={onSwap}
            aria-label={`Swap out ${exercise.name}`}
            className="px-2.5 py-2 text-[13px] font-extrabold text-muted"
          >
            Swap
          </button>
        ) : null}
        {/* The seam between two cards makes a superset out of neighbours, which
            is nearly always the case. This is the other one: pairing with
            something further down the session, which has to come up beside
            this movement first. Named apart from the seam so that two controls
            an inch apart are not both called Superset. */}
        {onSuperset ? (
          <button
            onClick={onSuperset}
            aria-label={`Pair ${exercise.name} with a movement further down`}
            className="px-2.5 py-2 text-[13px] font-extrabold text-muted"
          >
            Pair with
          </button>
        ) : null}
        {live && rest > 0 && restOnComplete ? (
          <button
            onClick={() => onRest(exercise.id, exercise.name, rest)}
            className="num px-2.5 py-2 text-[13px] font-extrabold text-accent-ink"
          >
            Rest {fmtTime(rest)}
          </button>
        ) : null}
      </div>
    </div>
  )
}
