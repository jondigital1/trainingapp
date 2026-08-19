'use client'

import { useEffect, useState } from 'react'
import { fmtDate, fmtTime, isEmptySet, workoutVolume } from '@/lib/format'
import { durationOf, fmtDuration, intensityLabel, isRunning, wantsScore } from '@/lib/session'
import RunningClock from './RunningClock'
import SupersetSheet from './SupersetSheet'
import ExerciseBlock, { type LastSession } from './ExerciseBlock'
import { shareWorkout } from '@/lib/share'
import type { Bests } from '@/lib/gamify'
import { groupRuns, isSuperset, linkWith, supersetLetter, supersetRest } from '@/lib/superset'
import { hardestFirst, isHardestFirst, moveRun } from '@/lib/order'
import type { Exercise, Goal, Workout } from '@/lib/types'

interface BlockExtras {
  restSeconds: number
  restOnComplete: boolean
}

export default function WorkoutEditor({
  workout,
  goal,
  effort = 1,
  lighter = false,
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
  onOpenExercise,
  onEnd,
  showDate = false,
}: {
  workout: Workout
  goal: Goal
  // What the block week does to the rest timer. 1 when no block is running.
  effort?: number
  // The plan's lighter version: one set fewer on every prescription.
  lighter?: boolean
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
  // Opens the movement's own screen: the note kept against it, the chart, and
  // every time it has been done.
  onOpenExercise?: (name: string) => void
  onEnd?: () => void
  showDate?: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [pairing, setPairing] = useState<string | null>(null)
  const [noting, setNoting] = useState(false)
  const [shared, setShared] = useState<string | null>(null)

  useEffect(() => {
    if (!shared) return
    const timer = setTimeout(() => setShared(null), 3000)
    return () => clearTimeout(timer)
  }, [shared])

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
            className="flex-1 rounded-lg bg-card px-3 py-2 text-base outline-none ring-1 ring-accent-ink"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            aria-label="Rename this workout"
            className="min-w-0 flex-1 text-left"
          >
            <h2 className="flex items-baseline gap-1.5 font-display text-xl font-semibold tracking-tight">
              <span className="truncate">{workout.title}</span>
              <span aria-hidden className="shrink-0 text-xs font-normal text-faint">&#9998;</span>
            </h2>
            <p className="num text-xs font-bold text-faint">
              {fmtDate(workout.date)}
              {workout.exercises.length ? ` · ${workout.exercises.length} exercises` : ''}
              {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} lb` : ''}
              {duration ? ` · ${duration}` : ''}
            </p>
            {score ? (
              <p className="mt-0.5 text-xs font-bold text-accent-ink">
                Felt like {workout.intensity} of 10, {score.toLowerCase()}
              </p>
            ) : null}
          </button>
        )}
        <div className="flex shrink-0 items-center">
          {/* Hands the session to the phone's own share sheet as a PDF, so it
              goes wherever the person already sends things. */}
          <button
            onClick={async () => {
              const result = await shareWorkout(workout)
              if (result === 'saved') setShared('Saved the PDF')
            }}
            aria-label={`Share ${workout.title}`}
            className="px-2 py-1.5 text-[12.5px] font-extrabold text-muted"
          >
            Share
          </button>
          <button
            onClick={() => (confirm ? onDelete() : setConfirm(true))}
            className={`px-2 py-1.5 text-[12.5px] font-extrabold ${
              confirm ? 'rounded-lg bg-alert text-white' : 'text-muted'
            }`}
          >
            {confirm ? 'Sure?' : 'Delete'}
          </button>
        </div>
      </div>

      {shared ? <p className="text-xs text-muted">{shared}</p> : null}

      {onEnd && (running || unscored) ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-edge">
          {running ? (
            <RunningClock startedAt={workout.startedAt!} />
          ) : (
            <span className="num text-sm font-bold text-faint">{duration ?? 'Session over'}</span>
          )}
          <button
            onClick={onEnd}
            className="shrink-0 rounded-xl bg-accent px-[18px] py-2.5 font-display text-sm font-bold text-on-accent"
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
          className="w-full rounded-lg bg-card px-3 py-2 text-sm num outline-none ring-1 ring-edge focus:ring-accent-ink"
        />
      ) : null}

      {(() => {
        const runs = groupRuns(workout.exercises)
        // Only one card wears the outline, and only while the session is live.
        const activeId = live
          ? workout.exercises.find((e) => e.sets.some((s) => isEmptySet(s, e.type)))?.id
          : undefined

        // Joining two neighbouring runs into one superset. Everything in both
        return runs.map((run, runIndex) => {
        const block = (exercise: Exercise, label?: string, extra?: Partial<BlockExtras>) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            goal={goal}
            effort={effort}
            lighter={lighter}
            active={exercise.id === activeId}
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
            onOpen={onOpenExercise ? () => onOpenExercise(exercise.name) : undefined}
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
          <div key={run.exercises[0].id} className="rounded-2xl bg-card p-2 ring-1 ring-accent-ink">
            <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
              <span className="num text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-accent-ink">
                Superset {letter}
                <span className="ml-1.5 text-faint">
                  · rest {fmtTime(rest)} after {letter}
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
                className="text-[12px] font-extrabold text-muted"
              >
                Unlink
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {run.exercises.map((exercise, i) =>
                block(exercise, `${letter}${i + 1}`, {
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
        className="rounded-[14px] border-[1.5px] border-dashed border-edge py-3 text-[13.5px] font-extrabold text-muted"
      >
        Add exercise
      </button>

      {/* The last set of a long session leaves you at the bottom, and the End
          button used to live several screens up. Finishing should be where
          the finishing happened. */}
      {onEnd && running && workout.exercises.length > 1 ? (
        <button
          onClick={onEnd}
          className="rounded-xl bg-accent py-3 font-display text-sm font-bold text-on-accent"
        >
          End workout
        </button>
      ) : null}

      {/* Why, not what. Folded away until there is something to say, so it is
          never in the way of the numbers. */}
      {noting || workout.note ? (
        <textarea
          value={workout.note ?? ''}
          onChange={(e) => onChange({ ...workout, note: e.target.value })}
          onBlur={() => setNoting(false)}
          placeholder="Slept badly, shoulder felt off, gym was heaving"
          aria-label="Note about this session"
          rows={2}
          className="w-full resize-none rounded-xl bg-card px-3 py-2.5 text-base leading-snug outline-none ring-1 ring-edge focus:ring-accent-ink"
        />
      ) : (
        <button
          onClick={() => setNoting(true)}
          className="self-start px-1 py-1 text-[12.5px] font-extrabold text-faint"
        >
          + Add a note
        </button>
      )}

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
