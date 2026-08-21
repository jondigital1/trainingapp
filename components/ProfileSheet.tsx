'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ageBand,
  GOAL_FROM_CHOICE,
  planFor,
  SORE_JOINTS,
  unitOf,
  type Profile,
} from '@/lib/onboarding'
import BodyWeightCard from './BodyWeightCard'
import ScheduleCard from './ScheduleCard'
import { fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { summarise } from '@/lib/body'
import { fmtTime, today } from '@/lib/format'
import HeightField from './HeightField'
import NewExercise from './NewExercise'
import { LIBRARY } from '@/lib/exercises'
import { blockWeek } from '@/lib/block'
import { restForTier } from '@/lib/rest'
import { weekStart } from '@/lib/week'
import type { BodyWeight, CustomExercise, Goal, Workout } from '@/lib/types'
import { Chips, Field, NumberInput, Note, Options, TextInput } from './Form'
import AdminDashboard from './AdminDashboard'
import Sheet from './Sheet'

type Focus = 'sore' | 'week' | 'all'

// What this page is for, now that what you set lives in Settings: your week,
// your body, and the movements you made. Three subjects, each with enough in
// it to be worth a tab of its own.
const SECTIONS = [
  // Body first, because it opens here and it is where your name is: the page
  // starts with who you are and moves out to what you are doing.
  //
  // There was a Me tab holding a name and an age. Once what you want out of
  // training moved to Settings there was nothing else in it, and a tab with
  // two fields is a tab people learn to skip. Your name and your age are
  // things about your body in the only sense this app cares about, so they
  // sit with the rest of them.
  { id: 'body', label: 'My body' },
  { id: 'week', label: 'My week' },
  // Movements you made yourself. They were only ever reachable as a filter
  // chip inside the picker you get mid session and inside the workout builder,
  // which meant the only way to look at your own library was to start doing
  // something else first.
  { id: 'moves', label: 'My movements' },
] as const

type Section = (typeof SECTIONS)[number]['id']

function numOrNull(s: string): number | null {
  const n = Number(s)
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
}

function fmtHeight(inches: number, unit: Unit): string {
  if (unit === 'kg') return `${Math.round(inches * 2.54)} cm`
  const ft = Math.floor(inches / 12)
  const inch = Math.round(inches % 12)
  return inch ? `${ft} ft ${inch} in` : `${ft} ft`
}

function inputFor(lb: number | undefined, unit: Unit): string {
  if (lb == null) return ''
  const n = Math.round(toDisplay(lb, unit) * 10) / 10
  return String(n)
}

export default function ProfileSheet({
  profile,
  focus,
  weights,
  workouts,
  customs,
  goal,
  inline,
  onSave,
  onApply,
  onLogWeight,
  onCreateExercise,
  onEditExercise,
  onDeleteExercise,
  onOpenSettings,
  onRerunQuestionnaire,
  admin,
  email,
  onClose,
}: {
  profile: Profile
  focus: Focus
  weights: BodyWeight[]
  workouts: Workout[]
  // Your own movements, and the goal that decides what a rest tier is worth,
  // so the number this screen promises is the number the session counts down.
  customs?: CustomExercise[]
  goal?: Goal
  inline?: boolean
  onSave: (next: Profile) => void
  // Saving something that must not also navigate. Done and Save mean save and
  // leave; tapping a day of the week means save and stay exactly where you
  // are, and routing both through onSave closed the page under somebody in
  // the middle of laying out their week.
  onApply?: (next: Profile) => void
  onLogWeight: (pounds: number) => void
  // A new one is an insert and a changed one is an update by id. Routing a
  // new movement through the update would have matched no row and written
  // nothing, quietly.
  onCreateExercise?: (exercise: CustomExercise) => void
  onEditExercise?: (exercise: CustomExercise) => void
  onDeleteExercise?: (exercise: CustomExercise) => void
  onOpenSettings?: () => void
  // The way back to the questions that are asked once. Days a week, session
  // length and which gym are answered there and nowhere else.
  onRerunQuestionnaire?: () => void
  // Set when the person looking at this page can see everybody else's. The
  // admin screen lives here rather than at its own address, because this is
  // where you already are when you want it.
  admin?: boolean
  email?: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Profile>(profile)
  // What was last handed to onSave, so closing an untouched page saves
  // nothing and closing a touched one saves everything.
  const saved = useRef('')
  const [asAdmin, setAsAdmin] = useState(false)
  // Off by default: the answers read as answers until somebody asks for the
  // boxes back.
  const [editing, setEditing] = useState(false)
  const [section, setSection] = useState<Section>(focus === 'week' ? 'week' : 'body')
  const unit = unitOf(profile)

  const [name, setName] = useState(profile.name ?? '')
  const [age, setAge] = useState(profile.ageYears != null ? String(profile.ageYears) : '')
  const [goalWeight, setGoalWeight] = useState(inputFor(profile.goalWeight, unitOf(profile)))
  const [heightIn, setHeightIn] = useState<number | undefined>(profile.heightIn)

  // Every tap on this page saves itself.
  //
  // The answers here were a draft, flushed when the page unmounted, which
  // meant they survived only if you left it the way the code expected. Anything
  // else, a backgrounded phone, a reload, an app the system decided to reclaim,
  // and the answer was gone. That was tolerable for a name typed into a box and
  // not for a flagged knee, which is the whole reason sessions get built around
  // it. Every one of these is a tap on an option, deliberate and small, so it
  // saves on the tap rather than on the way out.
  //
  // Typed fields stay on the flush. Saving a name a letter at a time is a write
  // per keystroke, and nobody loses a name they are halfway through typing in
  // the way they lose a joint they flagged three screens ago.
  const set = (patch: Partial<Profile>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    const next = { ...buildNext(), ...patch }
    saved.current = JSON.stringify(next)
    ;(onApply ?? onSave)(next)
  }
  const toggle = (key: 'sore' | 'other' | 'dislikes', v: string) => {
    const list = draft[key] ?? []
    set({ [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } as Partial<Profile>)
  }

  function buildNext(): Profile {
    const gw = numOrNull(goalWeight)
    const next: Profile = {
      ...draft,
      // Settings owns these, and Settings opens as a sheet over this page, so
      // both are mounted at once. A draft seeded when this page opened would
      // hand back the goal you had before you changed it a moment ago, which
      // is the same disagreement the two goal editors used to have, arriving
      // by a quieter route.
      units: profile.units,
      sex: profile.sex,
      goals: profile.goals,
      goalChoice: profile.goalChoice,
      focus: profile.focus,
      name: name.trim() || undefined,
      ageYears: numOrNull(age) ?? undefined,
      heightIn,
      goalWeight: gw != null ? toPounds(gw, unit) : undefined,
    }
    next.age = ageBand(next)
    return next
  }

  // Seeded on first render, so closing an untouched page saves nothing.
  if (!saved.current) saved.current = JSON.stringify(buildNext())

  function commit() {
    const next = buildNext()
    saved.current = JSON.stringify(next)
    onSave(next)
  }

  // Done, the scrim and Escape all commit rather than discard. Settings
  // trains people that every tap sticks and Done just closes, and a screen
  // that looks the same but quietly throws edits away is how somebody flags a
  // sore knee and gets programmed a squat anyway. Save stays as the loud way
  // out; there is no longer a silent one.
  function close() {
    if (JSON.stringify(buildNext()) !== saved.current) commit()
    else onClose()
  }

  // The nav-tab copy of this page has no Done: leaving it is switching tabs,
  // which unmounts. Same contract, so the flush happens here.
  const flush = useRef<() => void>(() => {})
  flush.current = () => {
    if (JSON.stringify(buildNext()) !== saved.current) commit()
  }
  useEffect(() => () => flush.current(), [])

  // Straight to the one question that was asked, when the app asked it in
  // context. The full page is a different job from "how long have you got".
  // Week is a section of the full page, not a one question detour, so it does
  // not belong in this branch. It landed here when the type gained a third
  // value and the condition still said anything but all, which meant Lay out
  // your week opened Anything sore.
  // How long have you got used to be asked here too, in its own sheet in the
  // doorway of a session. It was taken out of that doorway because two things
  // between somebody and the workout they opened the app to do is one too
  // many, and nothing has set this focus since. It is asked in the
  // questionnaire and nowhere else now.
  if (focus === 'sore') {
    return (
      <Sheet title="Anything sore?" onClose={close}>
        <SoreFields draft={draft} set={set} toggle={toggle} />
        <SaveButton onClick={commit} />
      </Sheet>
    )
  }

  // Everything filled in, in the order it reads: how old, how tall, what you
  // weigh, what you are heading for. Blanks are left out rather than shown as
  // dashes, so the line says what is known and nothing about what is not.
  const body = summarise(weights, draft.goalWeight)
  const stats = [
    numOrNull(age) != null ? `${numOrNull(age)} years` : null,
    heightIn != null ? fmtHeight(heightIn, unit) : null,
    body.current != null ? fmtWeight(body.current, unit) : null,
    draft.goalWeight != null ? `heading for ${fmtWeight(draft.goalWeight, unit)}` : null,
  ].filter((s): s is string => !!s)

  const plan = planFor(draft, GOAL_FROM_CHOICE[draft.goalChoice ?? 'muscle'] ?? 'muscle')

  return (
    <Sheet
      title="Your profile"
      onClose={close}
      inline={inline}
      action={
        onOpenSettings ? (
          <button
            onClick={onOpenSettings}
            className="rounded-full bg-card px-3 py-1.5 text-xs text-muted ring-1 ring-edge"
          >
            Settings
          </button>
        ) : null
      }
    >
      {/* Your stats, read rather than typed.
          
          This was a dark card naming the program and the split, which is the
          plan telling you about itself on the one page that is meant to be
          about you, and the numbers it was talking around sat lower down as
          five text boxes permanently open for editing. A saved answer is not a
          form field: leaving it as one invites a stray tap into your height
          and gives no sense that anything was ever written down.
          
          So the answers read as answers, and turn back into boxes only when
          you say so. */}
      {editing ? (
        <div className="rounded-[20px] bg-card p-4 ring-1 ring-edge">
          <Field label="Name" optional>
            <TextInput value={name} onChange={setName} placeholder="Name" />
          </Field>
          <Field label="Age" optional>
            <NumberInput value={age} onChange={setAge} suffix="years" />
          </Field>
          <HeightField inches={heightIn} unit={unit} onChange={setHeightIn} />
          <Field label="Goal weight" optional>
            <NumberInput decimal value={goalWeight} onChange={setGoalWeight} suffix={unitLabel(unit)} />
          </Field>
          <button
            onClick={() => {
              commit()
              setEditing(false)
            }}
            className="mt-4 w-full rounded-xl bg-accent py-2.5 font-display text-sm font-bold text-on-accent"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="rounded-[20px] bg-card p-4 ring-1 ring-edge">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-display text-lg font-semibold">
              {name.trim() || 'You'}
            </p>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-edge"
            >
              Edit stats
            </button>
          </div>
          {stats.length ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {stats.map((s, i) => (
                <span key={s}>
                  {i ? ' · ' : ''}
                  <span className="num">{s}</span>
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Nothing filled in yet. Edit stats to add your age, height and what you are heading for.
            </p>
          )}
        </div>
      )}

      {/* Two views of the same page, and only one person ever sees the switch. */}
      {admin ? (
        <div className="mt-4 flex gap-1 rounded-[13px] bg-track p-1">
          {[
            { on: false, label: 'You' },
            { on: true, label: 'Admin' },
          ].map((v) => (
            <button
              key={v.label}
              onClick={() => setAsAdmin(v.on)}
              aria-pressed={asAdmin === v.on}
              className={`flex-1 rounded-[9px] py-2 text-sm font-bold ${
                asAdmin === v.on ? 'bg-card text-bright ring-[1.5px] ring-accent-ink' : 'text-muted'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : null}

      {asAdmin ? (
        <div className="mt-4">
          <AdminDashboard today={today()} me={email ?? ''} />
        </div>
      ) : (
      <>
      {/* One way in, not two. This page carried a full width Settings card as
          well as the pill in its own header, on the reasoning that the pill
          was easy to miss. Two doors to the same room on the same screen is
          not the fix for a door being small. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={`rounded-full px-3.5 py-2 text-sm font-bold ${
              section === s.id
                ? 'bg-midnight text-frost'
                : 'surface text-muted ring-1 ring-edge'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5">

        {/* There is no Experience section any more, on purpose. How long you
            had been lifting, whether you knew your weights and how the barbell
            felt were questions about the day you signed up, and they were
            asked to calibrate the starting program. Two years later the honest
            answer to all of them is the log itself, and an editable snapshot
            of who somebody used to be is not a setting, it is a trap: change
            it and the program quietly re-derives from a fiction. Rerunning the
            questionnaire from Settings is the sanctioned way to be re-read,
            and it asks these in context, once, again. */}

        {section === 'week' ? (
          <>
            <ScheduleCard
              profile={draft}
              plan={plan}
              onChange={(schedule) => set({ schedule })}
            />

            {/* Days a week, leg days, how long you have got and where you
                train were all asked at signup and then sat loose here as well,
                which is the same answer in two places and one of them always
                the stale one. They are asked once, in the questionnaire, and
                this is the way back to it. */}
            <button
              onClick={onRerunQuestionnaire}
              className="surface mt-4 flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left ring-1 ring-edge"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold">Days a week, session length, your gym</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Answered in the questionnaire. Run it again to change them.
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">open</span>
            </button>

            <Field
              label="Training blocks"
              hint="Six weeks: five of climbing effort, then a deload. The deload is the week the other five turn into progress."
            >
              <Options
                columns={2}
                value={draft.block ? 'on' : 'off'}
                onPick={(v) =>
                  set(
                    v === 'on'
                      ? { block: true, blockStart: draft.blockStart ?? weekStart(today()) }
                      : { block: false },
                  )
                }
                options={[
                  { v: 'off' as const, label: 'Off' },
                  { v: 'on' as const, label: 'Six week blocks' },
                ]}
              />
              {draft.block ? (
                <Note>
                  Currently week {blockWeek(draft, today())?.index ?? 1} of 6,{' '}
                  {blockWeek(draft, today())?.name.toLowerCase()}.
                </Note>
              ) : null}
            </Field>
          </>
        ) : null}

        {/* Records moved to its own place on the nav. Everything that
            answers "how am I doing" was three taps deep inside a screen that
            otherwise looks like a form, and nobody would guess it lived
            there. */}

        {section === 'body' ? (
          <>
            {/* Name, age, height and goal weight moved to the card at the top,
                where they are read rather than typed. What is left here is the
                weight you log rather than state, and anything giving you
                trouble, which changes week to week. */}
            <BodyWeightCard
              weights={weights}
              goalWeight={draft.goalWeight}
              unit={unit}
              onLog={onLogWeight}
            />

            <SoreFields draft={draft} set={set} toggle={toggle} />
          </>
        ) : null}

        {section === 'moves' ? (
          <MyMovements
            customs={customs ?? []}
            goal={goal ?? 'muscle'}
            onCreate={onCreateExercise}
            onEdit={onEditExercise}
            onDelete={onDeleteExercise}
          />
        ) : null}
      </div>

      {/* No Save down here any more. The typed fields moved into the stats
          card at the top, which has its own Done, and everything left on this
          page saves on the tap it was made with. A button that commits nothing
          is worse than no button: this one would have said Saved. */}
      </>
      )}
    </Sheet>
  )
}

function SoreFields({
  draft,
  set,
  toggle,
}: {
  draft: Profile
  set: (patch: Partial<Profile>) => void
  toggle: (key: 'sore' | 'other' | 'dislikes', v: string) => void
}) {
  return (
    <>
      <Field label="Anything giving you trouble" optional>
        <Chips options={SORE_JOINTS} selected={draft.sore ?? []} onToggle={(v) => toggle('sore', v)} />
      </Field>
      {(draft.sore ?? []).length ? (
        <>
          <div className="mt-3 rounded-2xl surface p-3 ring-1 ring-edge">
            <p className="text-sm">
              You will still train it. Everything crossing that joint runs a set shorter while it settles,
              rather than disappearing, because working around something is not the same as avoiding it.
              Keep it at <span className="num text-accent-ink">5 out of 10</span> or under while you lift,
              and it should be back to its usual self the next morning. Worse the next day means that was
              too heavy.
            </p>
          </div>
          <Field label="Any of these?" hint="Pain that wakes you at night, numbness or pins and needles down the limb, the joint giving way, a recent bad fall, weight loss you cannot explain.">
            <Options
              columns={2}
              value={draft.redFlag === undefined ? undefined : draft.redFlag ? 'yes' : 'no'}
              onPick={(v) => set({ redFlag: v === 'yes' })}
              options={[
                { v: 'no' as const, label: 'None of those' },
                { v: 'yes' as const, label: 'Yes, one of those' },
              ]}
            />
          </Field>
          {draft.redFlag ? (
            <Note>
              Worth a professional eye before you load it. Sessions drop that joint's work
              entirely, swaps included, and everything else stays. Flip this back to none of
              those once you are cleared.
            </Note>
          ) : null}
        </>
      ) : null}
    </>
  )
}

/**
 * Save, and say so.
 *
 * This page is a tab, so saving cannot close anything, and every option on it
 * already saves on the tap. That left the button with nothing visible to do:
 * it wrote the typed fields and the screen stayed exactly as it was, which is
 * indistinguishable from a button that does nothing. It was reported as
 * broken, and it was not broken, which is its own kind of broken.
 *
 * The same button on the one question sheets closes them, so the word is gone
 * before it can be read there. No harm: something visible happened.
 */
function SaveButton({ onClick }: { onClick: () => void }) {
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <button
      onClick={() => {
        onClick()
        setSaved(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setSaved(false), 1600)
      }}
      className="mt-6 w-full rounded-xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent"
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

/**
 * Movements you made yourself, in one place you can actually get to.
 *
 * They were only ever reachable as a filter chip inside the picker you get mid
 * session and inside the workout builder, which meant looking at your own
 * library required starting a workout first. The screen that lets you change
 * one was reachable the same way, which is a door inside a room you have to be
 * doing something else to enter.
 */
function MyMovements({
  customs,
  goal,
  onCreate,
  onEdit,
  onDelete,
}: {
  customs: CustomExercise[]
  goal: Goal
  onCreate?: (exercise: CustomExercise) => void
  onEdit?: (exercise: CustomExercise) => void
  onDelete?: (exercise: CustomExercise) => void
}) {
  const [fixing, setFixing] = useState<CustomExercise | null>(null)
  const [making, setMaking] = useState(false)

  // Already in the library, or already yours. The pickers get this for free
  // from the search that failed to find it; this screen has no search, so it
  // asks outright.
  const taken = (name: string) => {
    const key = name.trim().toLowerCase()
    return (
      customs.some((c) => c.name.toLowerCase() === key) ||
      LIBRARY.some((e) => e.name.toLowerCase() === key)
    )
  }

  const create = making ? (
    <NewExercise
      name=""
      action="Create it"
      goal={goal}
      taken={taken}
      onCreate={(exercise) => {
        onCreate?.(exercise)
        setMaking(false)
      }}
    />
  ) : (
    <button
      onClick={() => {
        setMaking(true)
        setFixing(null)
      }}
      className="surface mt-3 w-full rounded-xl py-3 text-sm font-bold ring-1 ring-edge"
    >
      Create a movement
    </button>
  )

  if (!customs.length) {
    return (
      <>
        <p className="py-6 text-sm leading-relaxed text-muted">
          Nothing yet. Search for a movement the app does not have, in a workout
          or while you are training, and you can create it there. Or make one
          from scratch here.
        </p>
        {create}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col">
        {customs.map((c) => (
          <button
            key={c.id}
            onClick={() => setFixing(fixing?.id === c.id ? null : c)}
            aria-expanded={fixing?.id === c.id}
            className="flex items-center justify-between gap-3 border-b border-edge py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm">{c.name}</span>
              {/* What it does in the app, said plainly, because these are the
                  answers that decide which muscle it credits and how long it
                  rests, and they are invisible everywhere else. */}
              <span className="mt-0.5 block text-xs text-faint">
                {c.group ?? 'No group'} &middot; <span className="num">{c.sets ?? 3}</span> sets &middot; rests{' '}
                <span className="num">{fmtTime(restForTier(c.tier ?? 'compound', goal))}</span>
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted">{fixing?.id === c.id ? 'close' : 'change'}</span>
          </button>
        ))}
      </div>

      {fixing ? (
        <NewExercise
          key={fixing.id}
          name={fixing.name}
          action="Save changes"
          goal={goal}
          editing={fixing}
          taken={taken}
          onCreate={(exercise) => {
            onEdit?.(exercise)
            setFixing(null)
          }}
          onDelete={(exercise) => {
            onDelete?.(exercise)
            setFixing(null)
          }}
        />
      ) : (
        create
      )}
    </>
  )
}
