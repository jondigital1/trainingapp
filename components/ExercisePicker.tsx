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
  onUnpick,
  onOpen,
  onCreate,
  onClose,
}: {
  customs: CustomExercise[]
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
    if (added.includes(name) && onUnpick) {
      onUnpick(name)
      setAdded((prev) => prev.filter((n) => n !== name))
      return
    }
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
            {onOpen ? (
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
      {query.trim() && !exact ? (
        <div className="surface mt-4 rounded-[14px] p-3.5 ring-1 ring-edge">
          <p className="text-sm">
            Create <span className="text-accent-ink">{query.trim()}</span>
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
            className="mt-4 w-full rounded-xl bg-accent py-2.5 font-display text-sm font-bold text-on-accent"
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
  return <h4 className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">{children}</h4>
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
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            value === o.v ? 'bg-card text-bright ring-[1.5px] ring-accent-ink' : 'bg-card text-muted ring-1 ring-edge'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
