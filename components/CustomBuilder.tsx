'use client'

import { useMemo, useState } from 'react'
import { LIBRARY, MINE, MUSCLE_GROUPS, isExistingName, matchesQuery } from '@/lib/exercises'
import NewExercise from './NewExercise'
import { ACCESS, accessLabel } from '@/lib/questions'
import {
  AWAY_FULL_BODY,
  awaySession,
  fitsKit,
  FOCUS_GROUPS,
  type Profile,
} from '@/lib/onboarding'
import { estimateSeconds, fmtEstimate } from '@/lib/estimate'
import { Many, Options } from './Form'
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
  profile,
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
  // Everything the plan knows about you. The kit filter starts from the gym
  // you usually train in, and filling a session from muscle groups needs the
  // rest of it: the joints you flagged, what you are bringing up, what you
  // never want offered.
  profile: Profile
  onClose: () => void
}) {
  const [name, setName] = useState(editing?.name ?? (seed ? `My ${seed.name}` : ''))
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  // Today only, and stored nowhere. A hotel is not a move: the profile keeps
  // saying which gym is yours.
  const [kit, setKit] = useState<Profile['access']>(profile.access ?? 'full')
  const [kitOpen, setKitOpen] = useState(false)
  // Filling the list from muscle groups rather than picking every movement.
  // This was its own section on the Start sheet called "Build me one for
  // today", next to a button called Create custom workout, and the word build
  // was doing two jobs a few inches apart. They are the same errand: make me
  // something that is not a plan day. The difference is only who picks the
  // movements, which is a choice inside one screen rather than two doors.
  const [fillGroups, setFillGroups] = useState<string[]>([])
  const [fillOpen, setFillOpen] = useState(false)
  const [picked, setPicked] = useState<CustomWorkoutItem[]>(editing?.items ?? seed?.items ?? [])
  // While on, everything picked joins the same superset, exactly like the
  // picker in a live session. Off and on again starts a new group.
  const [superset, setSuperset] = useState<string | null>(null)
  // Named apart from the `editing` prop above, which is the workout being
  // changed. This is one movement inside it.
  const [fixing, setFixing] = useState<CustomExercise | null>(null)

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((e) => {
      // Your own movements are never filtered by kit. The app has no idea
      // what a movement somebody typed in needs, and guessing wrong hides the
      // thing they made specifically because the library did not have it.
      if (e.group !== MINE && !fitsKit(e.name, kit)) return false
      if (q) return matchesQuery(e.name, q)
      if (group) return (e.groups ?? [e.group]).includes(group)
      return false
    })
  }, [all, query, group, kit])

  // Already in the library, or already yours, so there is nothing to create.
  // Read off the unfiltered list on purpose: a movement the kit is hiding is
  // still a movement, and offering to create a second one would be the
  // duplicate this guard exists to stop.
  const exact = all.some((e) => isExistingName(e.name, query))

  // Searched for something real that this room cannot do. Worth saying, since
  // an empty list under a search box reads as "we have never heard of it".
  const hiddenByKit =
    !!query.trim() && results.length === 0 && all.some((e) => matchesQuery(e.name, query))

  // What it would give you for the muscles ticked, recomputed as they change
  // so the button can say how many movements and how long before you commit.
  const filling = useMemo(
    () => awaySession(fillGroups.length ? fillGroups : AWAY_FULL_BODY, profile, kit),
    [fillGroups, profile, kit],
  )

  function fill() {
    if (!filling.length) return
    // Stripped back to a name and a type. What comes out of the plan builder
    // also carries why it chose each one, which is a note about a session
    // rather than part of a saved workout.
    setPicked(filling.map((i) => ({ name: i.name, type: i.type })))
    if (!name.trim()) setName(listed(fillGroups))
    setFillOpen(false)
  }

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
      // A name typed or a movement picked is work that closing throws away,
      // and this is the screen somebody lost twice to a stray click.
      dirty={!!name.trim() || picked.length > 0}
      onClose={onClose}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
        className="w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
      />

      {/* A mode rather than a panel. The first version opened underneath the
          muscle group chips that browse the library, which put two identical
          lists of muscles on one screen doing entirely different jobs: one
          filters what you are looking at, the other decides what goes in.
          Found by rendering it. While this is open it is the only thing here. */}
      {fillOpen ? (
        <div className="mt-4">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            What do you want to train?
          </p>
          <div className="mt-2">
            <Many
              columns={2}
              value={fillGroups}
              onToggle={(g) =>
                setFillGroups((v) => (v.includes(g) ? v.filter((x) => x !== g) : [...v, g]))
              }
              options={FOCUS_GROUPS.map((g) => ({ v: g, label: g }))}
            />
          </div>

          <KitLine kit={kit} open={kitOpen} onToggle={setKitOpen} onPick={setKit} />

          <button
            onClick={fill}
            disabled={!filling.length}
            className="mt-3 w-full rounded-2xl bg-accent py-3.5 font-display text-sm font-bold text-on-accent disabled:opacity-40"
          >
            {filling.length
              ? `Fill it in \u00b7 ${filling.length} exercises${
                  fmtEstimate(estimateSeconds(filling, goal))
                    ? ` \u00b7 ${fmtEstimate(estimateSeconds(filling, goal))}`
                    : ''
                }`
              : `Nothing for that with ${accessLabel(kit).toLowerCase()}`}
          </button>
          <button
            onClick={() => setFillOpen(false)}
            className="mt-1 w-full py-2.5 text-sm font-extrabold text-muted"
          >
            I will pick them myself
          </button>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Nothing picked is a full body session. Sore joints and what you are bringing up still
            apply, and everything it picks lands in the list here so you can change it before you
            start.
          </p>
        </div>
      ) : (
      <>
      {/* Offered on an empty builder only, because it fills the list rather
          than adding to it, and because it is a way to start rather than a
          tool you reach for halfway through.

          It was its own section on the Start sheet called "Build me one for
          today", a few inches under a button called Create custom workout,
          with the word build doing two jobs. Same errand, and the only
          difference was who picks the movements, which is a choice inside one
          screen rather than two doors. */}
      {picked.length === 0 && !editing && !seed ? (
        <button
          onClick={() => setFillOpen(true)}
          className="surface mt-3 flex w-full items-center justify-between rounded-[14px] px-3.5 py-3 text-left ring-1 ring-edge"
        >
          <span className="text-sm font-bold">Or tell me what to train</span>
          <span className="text-xs text-muted">open</span>
        </button>
      ) : null}

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

      <KitLine kit={kit} open={kitOpen} onToggle={setKitOpen} onPick={setKit} />

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
        {/* Three different nothings, and they used to all say "pick a muscle
            group or search", which tells somebody to do the thing they just
            did. The kit filter can empty a group outright: there is no
            bodyweight trap work, and there never will be. */}
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm leading-relaxed text-muted">
            {hiddenByKit
              ? `${query.trim()} needs more than ${accessLabel(kit).toLowerCase()}. Change what you have above to reach it.`
              : group
                ? `Nothing for ${group.toLowerCase()} with ${accessLabel(kit).toLowerCase()}. Try another muscle, or change what you have above.`
                : query.trim()
                  ? null
                  : 'Pick a muscle group or search'}
          </p>
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
      </>
      )}
    </Sheet>
  )
}

// "Chest", "Chest and Back", "Chest, Back and Quads". Used to name a session
// after the muscles it was asked for, so saving it is one tap rather than a
// naming exercise nobody wants standing in a gym.
function listed(groups: string[]): string {
  if (!groups.length) return 'Full body'
  if (groups.length === 1) return groups[0]
  return `${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}`
}

// Where you are training today, said once and placed twice: the manual side of
// this screen and the tell-me-what-to-train side both need it, and they are
// never on screen together. One definition, because two copies of a control
// over one piece of state is how the two of them come to look different.
//
// A quiet line rather than a question. The honest answer is "my gym" almost
// every day, so asking outright would put a decision in front of everybody
// that matters to somebody a few times a year. It says where it thinks you are
// and opens only when that is wrong.
function KitLine({
  kit,
  open,
  onToggle,
  onPick,
}: {
  kit: Profile['access']
  open: boolean
  onToggle: (open: boolean) => void
  onPick: (kit: Profile['access']) => void
}) {
  return (
    <>
      <button
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between gap-3 px-1 py-1.5 text-left"
      >
        <span className="text-xs text-muted">
          Building for <span className="font-bold text-accent-ink">{accessLabel(kit)}</span>
        </span>
        <span className="shrink-0 text-xs text-faint">{open ? 'close' : 'change'}</span>
      </button>
      {open ? (
        <div className="mt-1">
          <Options
            value={kit ?? 'full'}
            onPick={(v) => {
              onPick(v)
              onToggle(false)
            }}
            options={ACCESS.options}
            columns={ACCESS.columns}
          />
          <p className="mt-1.5 text-xs text-muted">For this workout only. Your gym stays your gym.</p>
        </div>
      ) : null}
    </>
  )
}
