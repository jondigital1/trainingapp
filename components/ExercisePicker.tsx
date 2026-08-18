'use client'

import { useMemo, useState } from 'react'
import { LIBRARY, MUSCLE_GROUPS, groupOf, similarTo } from '@/lib/exercises'
import { uid } from '@/lib/format'
import Sheet from './Sheet'
import { TIER_LABELS, type RestTier } from '@/lib/rest'
import { fmtTime } from '@/lib/format'
import { SET_TYPES, type CustomExercise, type SetType } from '@/lib/types'

export default function ExercisePicker({
  customs,
  replacing,
  onPick,
  onCreate,
  onClose,
}: {
  customs: CustomExercise[]
  // The movement being swapped out, when this was opened to substitute rather
  // than to add. Picking replaces it in place instead of appending.
  replacing?: string | null
  onPick: (name: string, type: SetType, superset: string | null) => void
  onCreate: (exercise: CustomExercise) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [added, setAdded] = useState<string[]>([])
  const [newType, setNewType] = useState<SetType>('W')
  const [newGroup, setNewGroup] = useState<string>(MUSCLE_GROUPS[0])
  const [newTier, setNewTier] = useState<RestTier>('compound')
  const [newSets, setNewSets] = useState(3)
  // While this is on, everything picked joins the same superset. Off, and each
  // pick is its own exercise. One tag per run of the toggle.
  const [superset, setSuperset] = useState<string | null>(null)

  const all = useMemo(
    () => [...customs.map((c) => ({ name: c.name, type: c.type, group: 'My exercises' })), ...LIBRARY],
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
            customs.map((c) => ({ name: c.name, type: c.type, group: c.group ?? '' })),
          )
        : [],
    [replacing, customs],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (replacing && !q && !group) return suggestions
    return all.filter((e) => {
      if (group && e.group !== group) return false
      if (!q) return true
      return e.name.toLowerCase().includes(q)
    })
  }, [all, query, group, replacing, suggestions])

  const exact = all.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  function pick(name: string, type: SetType) {
    onPick(name, type, superset)
    setAdded((prev) => [...prev, name])
  }

  const groups = customs.length ? ['My exercises', ...MUSCLE_GROUPS] : MUSCLE_GROUPS

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
        className="w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent"
      />

      <button
        onClick={() => setSuperset(superset ? null : uid())}
        className={`mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ring-1 ${
          superset ? 'bg-accent text-on-accent ring-accent' : 'bg-ink ring-edge'
        }`}
      >
        <span className="text-sm">Superset</span>
        <span className={`text-xs ${superset ? 'text-on-accent' : 'text-muted'}`}>
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
          className={`rounded-full px-3 py-1 text-xs ${group === null ? 'bg-accent text-on-accent' : 'bg-ink text-muted ring-1 ring-edge'}`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(group === g ? null : g)}
            className={`rounded-full px-3 py-1 text-xs ${group === g ? 'bg-accent text-on-accent' : 'bg-ink text-muted ring-1 ring-edge'}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col">
        {results.map((e) => (
          <button
            key={`${e.group}-${e.name}`}
            onClick={() => pick(e.name, e.type)}
            className="flex items-center justify-between border-b border-edge py-3 text-left"
          >
            <span className="text-sm">{e.name}</span>
            <span className="text-xs text-muted">
              {added.includes(e.name) ? 'Added' : e.group}
            </span>
          </button>
        ))}
        {results.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nothing matches</p> : null}
      </div>
      {query.trim() && !exact ? (
        <div className="mt-4 rounded-xl bg-ink p-3 ring-1 ring-edge">
          <p className="text-sm">
            Create <span className="text-accent">{query.trim()}</span>
          </p>

          {/* Four questions, because the answers are what let a movement the
              library has never heard of behave like one it has: counted in the
              weekly total, swapped around a sore joint, and rested properly. */}
          <Label>What do you measure</Label>
          <Chips
            options={SET_TYPES.map((t) => ({ v: t.type as string, label: t.label }))}
            value={newType}
            onPick={(v) => setNewType(v as SetType)}
          />

          <Label>What does it train</Label>
          <Chips
            options={MUSCLE_GROUPS.map((g) => ({ v: g, label: g }))}
            value={newGroup}
            onPick={setNewGroup}
          />

          <Label>How hard is it</Label>
          <Chips
            options={TIER_LABELS.map((t) => ({ v: t.tier as string, label: t.label }))}
            value={newTier}
            onPick={(v) => setNewTier(v as RestTier)}
          />
          <p className="mt-1 text-xs text-muted">
            {TIER_LABELS.find((t) => t.tier === newTier)?.hint}. Rests{' '}
            <span className="num">{fmtTime(TIER_SECONDS[newTier])}</span>.
          </p>

          <Label>Sets to lay out</Label>
          <Chips
            options={[1, 2, 3, 4, 5].map((n) => ({ v: String(n), label: String(n) }))}
            value={String(newSets)}
            onPick={(v) => setNewSets(Number(v))}
          />

          <button
            onClick={() => {
              const exercise: CustomExercise = {
                id: uid(),
                name: query.trim(),
                type: newType,
                group: newGroup,
                tier: newTier,
                sets: newSets,
              }
              onCreate(exercise)
              pick(exercise.name, exercise.type)
              setQuery('')
            }}
            className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-medium text-on-accent"
          >
            Save and add
          </button>
        </div>
      ) : null}

    </Sheet>
  )
}

const TIER_SECONDS: Record<RestTier, number> = {
  heavy: 120,
  compound: 90,
  isolation: 60,
  cable: 45,
  small: 30,
}

function Label({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-4 text-xs uppercase tracking-wide text-muted">{children}</h4>
}

function Chips({
  options,
  value,
  onPick,
}: {
  options: { v: string; label: string }[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          aria-pressed={value === o.v}
          className={`rounded-full px-3 py-1.5 text-xs ${
            value === o.v ? 'bg-accent text-on-accent' : 'bg-card text-muted ring-1 ring-edge'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
