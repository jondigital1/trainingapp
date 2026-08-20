'use client'

import { useMemo, useState } from 'react'
import { LIBRARY, MINE, MUSCLE_GROUPS } from '@/lib/exercises'
import NewExercise from './NewExercise'
import { uid } from '@/lib/format'
import { supersetLetter } from '@/lib/superset'
import Sheet from './Sheet'
import type { CustomExercise, CustomWorkout, CustomWorkoutItem, Goal } from '@/lib/types'

export default function CustomBuilder({
  customs,
  goal,
  editing,
  seed,
  onSave,
  onCreate,
  onEdit,
  onDelete,
  onClose,
}: {
  customs: CustomExercise[]
  goal: Goal
  // The workout being changed, or nothing when building a new one. Editing
  // saves back over the same id rather than leaving a second copy behind.
  editing?: CustomWorkout | null
  // A template taken as a starting point: seeded like an edit, but with no id,
  // so saving leaves the template alone and creates one of your own.
  seed?: { name: string; items: CustomWorkoutItem[] } | null
  onSave: (name: string, items: CustomWorkoutItem[], id?: string) => void
  // A movement the library has never heard of. The same four answers the
  // picker inside a session asks for, because a movement created here has to
  // behave like one created there.
  onCreate: (exercise: CustomExercise) => void
  // Changing one of your own, from the same screen you made it on.
  onEdit?: (exercise: CustomExercise) => void
  onDelete?: (exercise: CustomExercise) => void
  onClose: () => void
}) {
  const [name, setName] = useState(editing?.name ?? (seed ? `My ${seed.name}` : ''))
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [picked, setPicked] = useState<CustomWorkoutItem[]>(editing?.items ?? seed?.items ?? [])
  // While on, everything picked joins the same superset, exactly like the
  // picker in a live session. Off and on again starts a new group.
  const [superset, setSuperset] = useState<string | null>(null)
  // Named apart from the `editing` prop above, which is the workout being
  // changed. This is one movement inside it.
  const [fixing, setFixing] = useState<CustomExercise | null>(null)

  const all = useMemo(
    () => [...customs.map((c) => ({ name: c.name, type: c.type, group: MINE })), ...LIBRARY],
    [customs],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((e) => {
      if (q) return e.name.toLowerCase().includes(q)
      if (group) return e.group === group
      return false
    })
  }, [all, query, group])

  // Already in the library, or already yours, so there is nothing to create.
  const exact = all.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  function toggle(item: CustomWorkoutItem) {
    setPicked((prev) =>
      prev.some((p) => p.name === item.name)
        ? prev.filter((p) => p.name !== item.name)
        : [...prev, { name: item.name, type: item.type, superset }],
    )
  }

  function move(index: number, direction: -1 | 1) {
    const to = index + direction
    if (to < 0 || to >= picked.length) return
    const next = [...picked]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    setPicked(next)
  }

  // Letters for display: first superset A, second B, in order of appearance.
  const letters = new Map<string, string>()
  for (const p of picked) {
    if (p.superset && !letters.has(p.superset)) {
      letters.set(p.superset, supersetLetter(letters.size))
    }
  }

  const groups = customs.length ? [MINE, ...MUSCLE_GROUPS] : MUSCLE_GROUPS

  return (
    <Sheet
      title={editing ? 'Edit workout' : seed ? `Your own ${seed.name}` : 'Build a workout'}
      onClose={onClose}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
        className="w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => {
              setGroup(group === g ? null : g)
              setQuery('')
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              group === g ? 'bg-midnight text-frost' : 'surface text-muted ring-1 ring-edge'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Or search every movement"
        className="mt-3 w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
      />

      <button
        onClick={() => setSuperset(superset ? null : uid())}
        className={`mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ring-1 ${
          superset ? 'bg-tint-cool ring-[1.5px] ring-accent-ink' : 'surface ring-edge'
        }`}
      >
        <span className="text-sm">Superset</span>
        <span className={`text-xs ${superset ? 'text-accent-ink' : 'text-muted'}`}>
          {superset ? 'everything picked now runs together' : 'off'}
        </span>
      </button>

      {picked.length ? (
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-muted">
            In this workout &middot; <span className="num">{picked.length}</span>
          </p>
          {/* A list rather than a cloud of chips, because the order here is the
              order they run in and a wrap cannot say that. */}
          {picked.map((p, i) => (
            <div
              key={p.name}
              className="flex items-center gap-1 rounded-xl bg-ink px-3 py-2 ring-1 ring-edge"
            >
              <span className="num w-4 shrink-0 text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.superset ? (
                  <span className="num mr-1.5 text-xs text-accent-ink">{letters.get(p.superset)}</span>
                ) : null}
                {p.name}
              </span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${p.name} up`}
                className="px-1.5 py-1 text-sm text-muted disabled:opacity-25"
              >
                &uarr;
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === picked.length - 1}
                aria-label={`Move ${p.name} down`}
                className="px-1.5 py-1 text-sm text-muted disabled:opacity-25"
              >
                &darr;
              </button>
              <button
                onClick={() => toggle(p)}
                aria-label={`Remove ${p.name}`}
                className="px-1.5 py-1 text-sm text-muted"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col">
        {results.map((e) => {
          const on = picked.some((p) => p.name === e.name)
          return (
            <div key={`${e.group}-${e.name}`} className="flex items-center border-b border-edge">
              <button
                onClick={() => toggle(e)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm">{e.name}</span>
                <span className={`shrink-0 text-xs ${on ? 'text-accent-ink' : 'text-muted'}`}>
                  {on ? 'Added' : e.group}
                </span>
              </button>
              {e.group === MINE && onEdit ? (
                <button
                  onClick={() => setFixing(customs.find((c) => c.name === e.name) ?? null)}
                  aria-label={`Edit ${e.name}`}
                  className="ml-3 grid h-7 w-7 flex-none place-items-center rounded-full text-xs text-muted ring-1 ring-edge"
                >
                  &#9998;
                </button>
              ) : null}
            </div>
          )
        })}
        {results.length === 0 && !query.trim() ? (
          <p className="py-6 text-center text-sm text-muted">Pick a muscle group or search</p>
        ) : null}
      </div>

      {/* Typing something the library does not have used to be a dead end
          here, while the picker inside a live session would happily create it.
          The same movement, the same person, two different answers depending
          on which screen they were standing on. */}
      {fixing ? (
        <NewExercise
          key={fixing.id}
          name={fixing.name}
          action="Save changes"
          goal={goal}
          editing={fixing}
          onCreate={(exercise) => {
            onEdit?.(exercise)
            // A rename has to follow into the list being built, or the workout
            // saves a movement under a name nothing has any more.
            setPicked((prev) =>
              prev.map((p) => (p.name === fixing.name ? { ...p, name: exercise.name, type: exercise.type } : p)),
            )
            setFixing(null)
          }}
          onDelete={(exercise) => {
            onDelete?.(exercise)
            setPicked((prev) => prev.filter((p) => p.name !== exercise.name))
            setFixing(null)
          }}
        />
      ) : query.trim() && !exact ? (
        <NewExercise
          name={query.trim()}
          action="Add it to this workout"
          goal={goal}
          onCreate={(exercise) => {
            onCreate(exercise)
            toggle({ name: exercise.name, type: exercise.type })
            setQuery('')
          }}
        />
      ) : null}

      <button
        disabled={!name.trim() || picked.length === 0}
        onClick={() => onSave(name.trim(), picked, editing?.id)}
        className="sticky bottom-0 mt-4 w-full rounded-xl bg-accent py-3 text-sm font-medium text-on-accent disabled:opacity-40"
      >
        {editing ? 'Save changes' : 'Save and start'}
      </button>
    </Sheet>
  )
}
