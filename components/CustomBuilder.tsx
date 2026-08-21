'use client'

import { Fragment, useMemo, useState } from 'react'

// Three muscle groups, both when browsing the library and when asking for a
// session to be built.
//
// Browsing, because four is most of the library again and a filter that
// returns everything has stopped filtering. Asking, because a session split
// four ways in the time most people have is one movement each, which is not
// training a muscle, it is visiting it.
const GROUP_CAP = 3
import { LIBRARY, MINE, MUSCLE_GROUPS, groupsOf, isExistingName, matchesQuery } from '@/lib/exercises'
import NewExercise from './NewExercise'
import { SESSION_MINUTES, accessLabel } from '@/lib/questions'
import KitPill from './KitPill'
import {
  AWAY_FULL_BODY,
  awaySession,
  fitsKit,
  FOCUS_GROUPS,
  type Profile,
} from '@/lib/onboarding'
import { estimateSeconds, fmtEstimate } from '@/lib/estimate'
import { Many, Options } from './Form'
import {
  anyLinked,
  groupRuns,
  isSuperset,
  linkAll,
  linkAt,
  linkedAt,
  splitAt,
  supersetLetter,
  tidy,
  unlinkAll,
} from '@/lib/superset'
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
  // Saving and starting are two outcomes, not one. A workout built on Sunday
  // for Tuesday is the ordinary case, and until now building one always threw
  // you straight into a live session you had not asked to be in.
  onSave: (name: string, items: CustomWorkoutItem[], id: string | undefined, start: boolean) => void
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
  // Several at once, capped at three. One at a time meant building an upper
  // day was Chest, scroll, pick, Back, scroll, pick, Shoulders, and the filter
  // reset your place in the list every time. Three because four is most of the
  // library again, at which point the filter has stopped filtering.
  const [browse, setBrowse] = useState<string[]>([])
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
  // How long you have got today, which is not what you told the questionnaire.
  // That answer is a standing ceiling for the days the plan writes; this one is
  // about this afternoon. Somebody who said ninety at signup and has forty five
  // today was handed an hour and twenty five minutes of work.
  const [minutes, setMinutes] = useState<NonNullable<Profile['minutes']>>(profile.minutes ?? 60)
  const [picked, setPicked] = useState<CustomWorkoutItem[]>(editing?.items ?? seed?.items ?? [])
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
      if (browse.length) return (e.groups ?? [e.group]).some((g) => browse.includes(g))
      return false
    })
  }, [all, query, browse, kit])

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
    () => awaySession(fillGroups.length ? fillGroups : AWAY_FULL_BODY, { ...profile, minutes }, kit),
    [fillGroups, profile, kit, minutes],
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
        ? // Tidied, because taking one half of a pair out leaves the other
          // half wearing a group letter on its own.
          tidy(prev.filter((p) => p.name !== item.name))
        : [...prev, { name: item.name, type: item.type, superset: null }],
    )
  }

  function move(index: number, direction: -1 | 1) {
    const to = index + direction
    if (to < 0 || to >= picked.length) return
    const next = [...picked]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    // A superset is neighbours, so moving one out of the middle of a group is
    // how you leave it: the tag goes with the position rather than surviving
    // it.
    setPicked(tidy(next))
  }

  // Letters for display, read off the runs rather than off the tags: a tag is
  // only a superset where two neighbours share it, so a run of one wears no
  // letter even if something upstream left a tag on it.
  const letters = new Map<number, string>()
  {
    let at = 0
    let shown = 0
    for (const run of groupRuns(picked)) {
      if (isSuperset(run)) {
        const letter = supersetLetter(shown++)
        for (let k = 0; k < run.exercises.length; k += 1) letters.set(at + k, letter)
      }
      at += run.exercises.length
    }
  }

  const groups = customs.length ? [MINE, ...MUSCLE_GROUPS] : MUSCLE_GROUPS

  // What it saves under. Typed if you typed one, otherwise read off the
  // movements you picked.
  const saveName = name.trim() || autoName(picked)

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

      {/* Where you are, directly under the name and above both ways of filling
          the session, because it shapes whichever one you pick. */}
      <div className="mt-3">
        <KitPill
          kit={kit}
          home={profile.access}
          open={kitOpen}
          note="For this workout only. Your gym stays your gym."
          onToggle={setKitOpen}
          onPick={setKit}
        />
      </div>

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
                setFillGroups((v) =>
                  v.includes(g) ? v.filter((x) => x !== g) : v.length >= GROUP_CAP ? v : [...v, g],
                )
              }
              options={FOCUS_GROUPS.map((g) => ({
                v: g,
                label: g,
                // Three is the limit, and the ones you have not picked say so
                // by going quiet rather than by ignoring a tap.
                disabled: !fillGroups.includes(g) && fillGroups.length >= GROUP_CAP,
              }))}
            />
          </div>

          {/* Asked here rather than taken from the profile. That answer is a
              standing ceiling for the days the plan writes; this is about this
              afternoon. Somebody who said ninety at signup and has forty five
              today was handed an hour and twenty five minutes of work. */}
          <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            {SESSION_MINUTES.label}
          </p>
          <div className="mt-2">
            <Options
              value={minutes}
              onPick={setMinutes}
              options={SESSION_MINUTES.options}
              columns={SESSION_MINUTES.columns}
            />
          </div>


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
              setBrowse((v) => (v.includes(g) ? v.filter((x) => x !== g) : [...v, g]))
              setQuery('')
            }}
            aria-pressed={browse.includes(g)}
            // At the cap, the ones you have not picked go quiet and stop
            // responding, so the limit is something you can see rather than a
            // tap that silently does nothing.
            disabled={!browse.includes(g) && browse.length >= GROUP_CAP}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              browse.includes(g)
                ? 'bg-midnight text-frost'
                : browse.length >= GROUP_CAP
                  ? 'surface text-faint opacity-45 ring-1 ring-edge'
                  : 'surface text-muted ring-1 ring-edge'
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

      {picked.length ? (
        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-wide text-muted">
              In this workout &middot; <span className="num">{picked.length}</span>
            </p>
            {/* The long way round is eight taps on a nine movement session, so
                the whole session in one is worth offering. A shortcut past the
                seams, not a replacement for them: this used to be the only
                control there was, and a session was supersetted end to end or
                not at all. */}
            {picked.length > 1 ? (
              <button
                onClick={() => setPicked((prev) => (anyLinked(prev) ? unlinkAll(prev) : linkAll(prev)))}
                className="text-[12px] font-extrabold text-muted"
              >
                {anyLinked(picked) ? 'Unlink all' : 'Superset all'}
              </button>
            ) : null}
          </div>
          {/* A list rather than a cloud of chips, because the order here is the
              order they run in and a wrap cannot say that. */}
          {picked.map((p, i) => (
            <Fragment key={p.name}>
            <div
              className="flex items-center gap-1 rounded-xl bg-ink px-3 py-2 ring-1 ring-edge"
            >
              <span className="num w-4 shrink-0 text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {letters.has(i) ? (
                  <span className="num mr-1.5 text-xs text-accent-ink">{letters.get(i)}</span>
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
            {/* The seam between two movements is the control. Tapping it joins
                them, tapping it again breaks them apart, and a group of any
                size is however many seams in a row you joined.

                This replaces a switch that put everything picked into one
                superset while it was on, which is the only shape a superset
                could ever have: all of them, or none of them. Breaking one
                movement out of a group of four was not expressible. */}
            {i < picked.length - 1 ? (
              <button
                onClick={() =>
                  setPicked((prev) => (linkedAt(prev, i) ? splitAt(prev, i) : linkAt(prev, i)))
                }
                aria-label={
                  linkedAt(picked, i)
                    ? `Split ${p.name} from ${picked[i + 1].name}`
                    : `Superset ${p.name} with ${picked[i + 1].name}`
                }
                className="flex items-center gap-2 px-2 py-1"
              >
                <span
                  className={`h-px flex-1 ${linkedAt(picked, i) ? 'bg-accent-ink/40' : 'bg-edge'}`}
                />
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-[1.2px] ${
                    linkedAt(picked, i) ? 'text-accent-ink' : 'text-faint'
                  }`}
                >
                  {linkedAt(picked, i) ? 'Unlink' : 'Superset'}
                </span>
                <span
                  className={`h-px flex-1 ${linkedAt(picked, i) ? 'bg-accent-ink/40' : 'bg-edge'}`}
                />
              </button>
            ) : null}
            </Fragment>
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
              : browse.length
                ? `Nothing for ${listed(browse).toLowerCase()} with ${accessLabel(kit).toLowerCase()}. Try another muscle, or change what you have above.`
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

      {/* Its own bar rather than a bare sticky button. Floating over the
          movement list with nothing behind it, the words sat on top of the
          rows they were covering and both were unreadable. */}
      <div className="sticky bottom-0 -mx-4 mt-4 bg-card px-4 pb-1 pt-3">
        {/* A name is not a requirement, it is a nicety. Nine movements picked
            and a greyed out button that said nothing about why is what this
            screen did before, and the only thing wrong was an empty field
            further up than the button somebody was looking at. So it names
            itself after what is in it, the same way filling from muscle
            groups already did, and says so before you commit. */}
        {picked.length && !name.trim() ? (
          <p className="mb-2 text-xs text-muted">
            No name, so it saves as <span className="font-bold text-body">{autoName(picked)}</span>.
          </p>
        ) : null}
        {editing ? (
          <button
            disabled={picked.length === 0}
            onClick={() => onSave(saveName, picked, editing.id, false)}
            className="w-full rounded-xl bg-accent py-3 text-sm font-medium text-on-accent disabled:opacity-40"
          >
            Save changes
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              disabled={picked.length === 0}
              onClick={() => onSave(saveName, picked, undefined, false)}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-body ring-1 ring-edge disabled:opacity-40"
            >
              Save for later
            </button>
            <button
              disabled={picked.length === 0}
              onClick={() => onSave(saveName, picked, undefined, true)}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-medium text-on-accent disabled:opacity-40"
            >
              Save and start
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </Sheet>
  )
}

// Names a workout after the muscles it actually works, most represented
// first, three at most so it stays a name rather than an inventory. Anything
// the library cannot file falls back to the day it was built.
function autoName(items: CustomWorkoutItem[]): string {
  const count = new Map<string, number>()
  for (const i of items) {
    for (const g of groupsOf(i.name)) {
      if (g === MINE) continue
      count.set(g, (count.get(g) ?? 0) + 1)
    }
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g)
  if (!top.length) return `Workout ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
  return listed(top)
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
