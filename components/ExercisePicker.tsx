'use client'

import { useMemo, useState } from 'react'
import { LIBRARY, MINE, MUSCLE_GROUPS, isExistingName, matchesQuery, similarTo } from '@/lib/exercises'
import { uid } from '@/lib/format'
import Sheet from './Sheet'
import NewExercise from './NewExercise'
import { type CustomExercise, type Goal, type SetType } from '@/lib/types'

export default function ExercisePicker({
  customs,
  goal,
  replacing,
  onPick,
  onUnpick,
  onOpen,
  onCreate,
  onEdit,
  onDelete,
  onClose,
}: {
  customs: CustomExercise[]
  goal: Goal
  // The movement being swapped out, when this was opened to substitute rather
  // than to add. Picking replaces it in place instead of appending.
  replacing?: string | null
  onPick: (name: string, type: SetType, superset: string | null) => void
  // Second tap on a row already added this visit. The builder taught people
  // that tapping Added un-adds; without this, the same tap here appended a
  // silent duplicate to the running session.
  onUnpick?: (name: string) => void
  // Opens the movement's own screen. Wanting to know what something is before
  // adding it is a different question from adding it, so it gets its own tap
  // rather than making the row do two jobs.
  onOpen?: (name: string) => void
  onCreate: (exercise: CustomExercise) => void
  // Changing one of your own. Same four questions, kept in one place, because
  // an answer you cannot change is an answer that is wrong forever.
  onEdit?: (exercise: CustomExercise) => void
  onDelete?: (exercise: CustomExercise) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<CustomExercise | null>(null)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [added, setAdded] = useState<string[]>([])
  // While this is on, everything picked joins the same superset. Off, and each
  // pick is its own exercise. One tag per run of the toggle.
  const [superset, setSuperset] = useState<string | null>(null)

  const all = useMemo(
    // Filed under My exercises, and also under whatever muscles it says it
    // trains, so browsing Adductors finds the one you typed in yourself
    // alongside the seven the library has.
    () => [
      ...customs.map((c) => ({
        name: c.name,
        type: c.type,
        group: MINE,
        groups: [MINE, ...(c.groups ?? [])],
      })),
      ...LIBRARY,
    ],
    [customs],
  )

  // Swapping something out opens on movements that train the same thing,
  // closest swap first, which is the answer nine times out of ten. Typing or
  // picking another group goes back to searching everything.
  const suggestions = useMemo(
    () =>
      replacing
        ? similarTo(
            replacing,
            customs.map((c) => ({ name: c.name, type: c.type, group: c.groups?.[0] ?? '' })),
          )
        : [],
    [replacing, customs],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (replacing && !q && !group) return suggestions
    return all.filter((e) => {
      // Anything that trains it, not only what it is filed under, so the
      // Copenhagen Plank turns up under Adductors as well as Core.
      if (group && !(e.groups ?? [e.group]).includes(group)) return false
      if (!q) return true
      return matchesQuery(e.name, q)
    })
  }, [all, query, group, replacing, suggestions])

  const exact = all.some((e) => isExistingName(e.name, query))

  function pick(name: string, type: SetType) {
    if (added.includes(name) && onUnpick) {
      onUnpick(name)
      setAdded((prev) => prev.filter((n) => n !== name))
      return
    }
    onPick(name, type, superset)
    setAdded((prev) => [...prev, name])
  }

  const groups = customs.length ? [MINE, ...MUSCLE_GROUPS] : MUSCLE_GROUPS

  return (
    <Sheet title={replacing ? `Swap out ${replacing}` : 'Add exercise'} onClose={onClose}>
      {replacing ? (
        <p className="mb-3 text-sm text-muted">
          {suggestions.length
            ? `Movements that train the same thing, closest first. Or search for anything.`
            : `Nothing in the library trains the same thing. Search for a replacement.`}
        </p>
      ) : null}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movements"
        className="surface w-full rounded-xl px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-[1.5px] focus:ring-accent-ink"
      />

      <button
        onClick={() => setSuperset(superset ? null : uid())}
        className={`mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ${
          superset ? 'bg-tint-cool ring-[1.5px] ring-accent-ink' : 'surface ring-1 ring-edge'
        }`}
      >
        <span className="text-sm font-bold">Superset</span>
        <span className={`text-xs ${superset ? 'font-bold text-accent-ink' : 'text-muted'}`}>
          {superset
            ? added.length
              ? `${added.length} in this one, keep picking`
              : 'pick the movements that run together'
            : 'off'}
        </span>
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setGroup(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            group === null ? 'bg-midnight text-frost' : 'surface text-muted ring-1 ring-edge'
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(group === g ? null : g)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              group === g ? 'bg-midnight text-frost' : 'surface text-muted ring-1 ring-edge'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col">
        {results.map((e) => (
          <div key={`${e.group}-${e.name}`} className="flex items-center border-b border-edge">
            <button
              onClick={() => pick(e.name, e.type)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left"
            >
              <span className="text-sm">{e.name}</span>
              <span className="shrink-0 text-xs text-muted">
                {added.includes(e.name) ? 'Added' : e.group}
              </span>
            </button>
            {/* Your own movement gets the pencil rather than the info button.
                The library has nothing to tell you about something you
                invented, and fixing it is the thing you actually came for. */}
            {e.group === MINE && onEdit ? (
              <button
                onClick={() => setEditing(customs.find((c) => c.name === e.name) ?? null)}
                aria-label={`Edit ${e.name}`}
                className="ml-3 grid h-7 w-7 flex-none place-items-center rounded-full text-xs text-muted ring-1 ring-edge"
              >
                &#9998;
              </button>
            ) : onOpen ? (
              <button
                onClick={() => onOpen(e.name)}
                aria-label={`About ${e.name}`}
                className="ml-3 grid h-7 w-7 flex-none place-items-center rounded-full font-display text-xs font-bold text-muted ring-1 ring-edge"
              >
                i
              </button>
            ) : null}
          </div>
        ))}
        {results.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nothing matches</p> : null}
      </div>
      {editing ? (
        <NewExercise
          key={editing.id}
          name={editing.name}
          action="Save changes"
          goal={goal}
          editing={editing}
          onCreate={(exercise) => {
            onEdit?.(exercise)
            setEditing(null)
          }}
          onDelete={(exercise) => {
            onDelete?.(exercise)
            setEditing(null)
          }}
        />
      ) : query.trim() && !exact ? (
        <NewExercise
          name={query.trim()}
          action="Save and add"
          goal={goal}
          onCreate={(exercise) => {
            onCreate(exercise)
            pick(exercise.name, exercise.type)
            setQuery('')
          }}
        />
      ) : null}

    </Sheet>
  )
}
