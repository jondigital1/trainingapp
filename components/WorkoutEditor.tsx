'use client'

import { useEffect, useState } from 'react'
import { fmtDate, workoutVolume } from '@/lib/format'
import { durationOf, fmtDuration, intensityLabel, isRunning, wantsScore } from '@/lib/session'
import RunningClock from './RunningClock'
import SupersetSheet from './SupersetSheet'
import ExerciseBlock, { type LastSession } from './ExerciseBlock'
import type { Bests } from '@/lib/gamify'
import { groupRuns, isSuperset, linkWith, supersetLetter, supersetRest } from '@/lib/superset'
import { hardestFirst, isHardestFirst, moveRun } from '@/lib/order'
import type { Exercise, Goal, Workout } from '@/lib/types'

interface BlockExtras {
  nested: boolean
  restSeconds: number
  restOnComplete: boolean
}

export default function WorkoutEditor({
  workout,
  goal,
  effort = 1,
  lastFor,
  bestsFor,
  live,
  onRest,
  loads,
  offerSort = false,
  onChange,
  onDelete,
  onAddExercise,
  onSwapExercise,
  onEnd,
  showDate = false,
}: {
  workout: Workout
  goal: Goal
  // What the block week does to the rest timer. 1 when no block is running.
  effort?: number
  lastFor: (name: string, workout: Workout) => LastSession | null
  bestsFor: (name: string, workout: Workout) => Bests
  live: boolean
  onRest: (exerciseId: string, name: string, seconds: number) => void
  loads: Map<string, number>
  offerSort?: boolean
  onChange: (next: Workout) => void
  onDelete: () => void
  onAddExercise: () => void
  onSwapExercise?: (exerciseId: string, name: string) => void
  onEnd?: () => void
  showDate?: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [pairing, setPairing] = useState<string | null>(null)

  useEffect(() => {
    if (!confirm) return
    const timer = setTimeout(() => setConfirm(false), 3000)
    return () => clearTimeout(timer)
  }, [confirm])

  function patchExercise(next: Exercise) {
    onChange({ ...workout, exercises: workout.exercises.map((e) => (e.id === next.id ? next : e)) })
  }

  const volume = workoutVolume(workout)
  const duration = fmtDuration(durationOf(workout))
  const score = intensityLabel(workout.intensity)
  const running = isRunning(workout)
  const unscored = wantsScore(workout)
  const sorted = !offerSort || isHardestFirst(workout.exercises, loads)

  const move = (exerciseId: string, direction: -1 | 1) =>
    onChange({ ...workout, exercises: moveRun(workout.exercises, exerciseId, direction) })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            value={workout.title}
            onChange={(e) => onChange({ ...workout, title: e.target.value })}
            onBlur={() => setRenaming(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setRenaming(false)
            }}
            className="flex-1 rounded-lg bg-card px-3 py-2 text-base outline-none ring-1 ring-accent"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            aria-label="Rename this workout"
            className="min-w-0 flex-1 text-left"
          >
            <h2 className="flex items-baseline gap-1.5 text-lg font-semibold tracking-tight">
              <span className="truncate">{workout.title}</span>
              <span aria-hidden className="shrink-0 text-xs font-normal text-muted">&#9998;</span>
            </h2>
            <p className="num text-xs text-muted">
              {fmtDate(workout.date)}
              {workout.exercises.length ? ` · ${workout.exercises.length} exercises` : ''}
              {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} lb` : ''}
              {duration ? ` · ${duration}` : ''}
            </p>
            {score ? <p className="mt-0.5 text-xs text-accent">Felt like {workout.intensity} of 10, {score.toLowerCase()}</p> : null}
          </button>
        )}
        <button
          onClick={() => (confirm ? onDelete() : setConfirm(true))}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs ${confirm ? 'bg-accent text-on-accent' : 'text-muted'}`}
        >
          {confirm ? 'Sure?' : 'Delete'}
        </button>
      </div>

      {onEnd && (running || unscored) ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-edge">
          {running ? (
            <RunningClock startedAt={workout.startedAt!} />
          ) : (
            <span className="num text-sm text-muted">{duration ?? 'Session over'}</span>
          )}
          <button
            onClick={onEnd}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent"
          >
            {running ? 'End workout' : 'How was it?'}
          </button>
        </div>
      ) : null}

      {workout.exercises.length > 1 && !sorted ? (
        <button
          onClick={() => onChange({ ...workout, exercises: hardestFirst(workout.exercises, loads) })}
          className="self-start rounded-lg bg-card px-3 py-1.5 text-xs text-muted ring-1 ring-edge"
        >
          Put the hardest first
        </button>
      ) : null}

      {showDate ? (
        <input
          type="date"
          value={workout.date}
          onChange={(e) => onChange({ ...workout, date: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm num outline-none ring-1 ring-edge focus:ring-accent"
        />
      ) : null}

      {(() => {
        const runs = groupRuns(workout.exercises)

        // Joining two neighbouring runs into one superset. Everything in both
        return runs.map((run, runIndex) => {
        const block = (exercise: Exercise, label?: string, extra?: Partial<BlockExtras>) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            goal={goal}
            effort={effort}
            last={lastFor(exercise.name, workout)}
            bests={bestsFor(exercise.name, workout)}
            live={live}
            onRest={onRest}
            label={label}
            {...extra}
            onMove={(direction) => move(exercise.id, direction)}
            onSuperset={
              workout.exercises.length > 1 ? () => setPairing(exercise.id) : undefined
            }
            onSwap={
              onSwapExercise ? () => onSwapExercise(exercise.id, exercise.name) : undefined
            }
            onChange={patchExercise}
            onRemove={() =>
              onChange({ ...workout, exercises: workout.exercises.filter((e) => e.id !== exercise.id) })
            }
          />
        )

        if (!isSuperset(run)) {
          return run.exercises.map((exercise) => block(exercise))
        }

        // One clock for the group, set by the movement that asks for the most.
        const rest = supersetRest(run, goal, effort)
        const letter = supersetLetter(run.index)

        return (
          <div key={run.exercises[0].id} className="rounded-2xl bg-card p-2 ring-1 ring-accent">
            <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
              <span className="text-[11px] uppercase tracking-wide text-accent">
                Superset {letter}
                <span className="ml-2 normal-case tracking-normal text-muted">
                  rest after {letter}
                  {run.exercises.length}
                </span>
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...workout,
                    exercises: workout.exercises.map((e) =>
                      e.superset === run.superset ? { ...e, superset: null } : e,
                    ),
                  })
                }
                className="text-[11px] text-muted"
              >
                Unlink
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {run.exercises.map((exercise, i) =>
                block(exercise, `${letter}${i + 1}`, {
                  nested: true,
                  restSeconds: rest,
                  restOnComplete: i === run.exercises.length - 1,
                }),
              )}
            </div>
          </div>
        )
        })
      })()}

      <button
        onClick={onAddExercise}
        className="rounded-xl border border-dashed border-edge py-3 text-sm text-muted"
      >
        Add exercise
      </button>

      {pairing ? (
        <SupersetSheet
          exercises={workout.exercises}
          anchorId={pairing}
          goal={goal}
          effort={effort}
          onPick={(partnerId) => {
            onChange({ ...workout, exercises: linkWith(workout.exercises, pairing, partnerId) })
            setPairing(null)
          }}
          onClose={() => setPairing(null)}
        />
      ) : null}
    </section>
  )
}
