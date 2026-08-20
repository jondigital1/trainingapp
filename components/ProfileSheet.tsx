'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ageBand,
  LONG_SESSION,
  COMMON_DISLIKES,
  goalsOf,
  GOAL_FROM_CHOICE,
  legDaysOf,
  OTHER_NOTES,
  OTHER_TRAINING,
  planFor,
  PROGRAMS,
  SORE_JOINTS,
  unitOf,
  type Profile,
} from '@/lib/onboarding'
import BodyWeightCard from './BodyWeightCard'
import ScheduleCard from './ScheduleCard'
import { fmtDelta, fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { fmtDate, today } from '@/lib/format'
import { blockWeek, mondayOf } from '@/lib/block'
import type { BodyWeight, Workout } from '@/lib/types'
import { Chips, Field, NumberInput, Note, Options, TextInput } from './Form'
import { GoalPicker } from './GoalPicker'
import { BringUpField, SexField } from './FocusField'
import AdminDashboard from './AdminDashboard'
import LiftyMark from './LiftyMark'
import Sheet from './Sheet'

type Focus = 'minutes' | 'sore' | 'week' | 'all'

// The same five sections the questionnaire asked, in the same order, so coming
// back to change an answer means going to where you gave it.
const SECTIONS = [
  { id: 'you', label: 'You' },
  { id: 'week', label: 'Your week' },
  { id: 'body', label: 'Your body' },
] as const

type Section = (typeof SECTIONS)[number]['id']

function numOrNull(s: string): number | null {
  const n = Number(s)
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
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
  inline,
  onSave,
  onApply,
  onLogWeight,
  onOpenSettings,
  admin,
  email,
  onClose,
}: {
  profile: Profile
  focus: Focus
  weights: BodyWeight[]
  workouts: Workout[]
  inline?: boolean
  onSave: (next: Profile) => void
  // Saving something that must not also navigate. Done and Save mean save and
  // leave; tapping a day of the week means save and stay exactly where you
  // are, and routing both through onSave closed the page under somebody in
  // the middle of laying out their week.
  onApply?: (next: Profile) => void
  onLogWeight: (pounds: number) => void
  onOpenSettings?: () => void
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
  const [section, setSection] = useState<Section>(focus === 'minutes' || focus === 'week' ? 'week' : focus === 'sore' ? 'body' : 'you')
  const unit = unitOf(draft)

  const [name, setName] = useState(profile.name ?? '')
  const [age, setAge] = useState(profile.ageYears != null ? String(profile.ageYears) : '')
  const [goalWeight, setGoalWeight] = useState(inputFor(profile.goalWeight, unitOf(profile)))
  const [heightFt, setHeightFt] = useState(
    profile.heightIn != null ? String(Math.floor(profile.heightIn / 12)) : '',
  )
  const [heightInch, setHeightInch] = useState(
    profile.heightIn != null ? String(Math.round(profile.heightIn % 12)) : '',
  )
  const [todayWeight, setTodayWeight] = useState('')

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
    const ft = Number(heightFt)
    const inch = Number(heightInch)
    const height = Number.isFinite(ft) && ft > 0 ? ft * 12 + (Number.isFinite(inch) ? inch : 0) : null
    const gw = numOrNull(goalWeight)
    const next: Profile = {
      ...draft,
      name: name.trim() || undefined,
      ageYears: numOrNull(age) ?? undefined,
      heightIn: height ?? undefined,
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
    const w = numOrNull(todayWeight)
    if (w != null) onLogWeight(toPounds(w, unit))
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
  if (focus === 'minutes' || focus === 'sore') {
    return (
      <Sheet title={focus === 'minutes' ? 'How long have you got?' : 'Anything sore?'} onClose={close}>
        {focus === 'minutes' ? (
          <Field label="How long have you got?" hint="A ceiling, not a target. Sessions land where they land and the app tells you what each one costs.">
            <Options
              columns={2}
              value={draft.minutes}
              onPick={(v) => set({ minutes: v })}
              options={[
                { v: 30 as const, label: 'Up to 30 minutes' },
                { v: 45 as const, label: 'Up to 45 minutes' },
                { v: 60 as const, label: 'Up to an hour' },
                { v: LONG_SESSION, label: 'No limit' },
              ]}
            />
          </Field>
        ) : (
          <SoreFields draft={draft} set={set} toggle={toggle} />
        )}
        <SaveButton onClick={commit} />
      </Sheet>
    )
  }

  const plan = planFor(draft, GOAL_FROM_CHOICE[draft.goalChoice ?? 'muscle'] ?? 'muscle')
  const blurb = PROGRAMS.find((p) => p.id === plan.program)?.blurb ?? ''

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
      {/* The one dark surface in the app, which is where Cyan is allowed to be
          text. It is the summary of who the plan thinks you are, so it earns
          being the loudest thing on the page. */}
      <div className="flex items-start gap-3 rounded-[20px] bg-midnight p-4">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-navy">
          <LiftyMark size={30} />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-cyan">
            {plan.program}
          </p>
          <p className="mt-1 font-display text-base font-semibold text-frost">
            {name.trim() ? `${name.trim()}, on ` : ''}
            {plan.splitName}, {plan.days} days a week
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#9FB0C4]">{blurb}</p>
        </div>
      </div>

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
        {section === 'you' ? (
          <>
            <Field label="Name" optional>
              <TextInput value={name} onChange={setName} placeholder="Name" />
            </Field>
            <Field label="Age" optional>
              <NumberInput value={age} onChange={setAge} suffix="years" />
            </Field>
            <Field label="Weights in" hint="A display choice. Nothing you have already logged changes.">
              <Options
                columns={2}
                value={unit}
                onPick={(v) => set({ units: v })}
                options={[
                  { v: 'lb' as const, label: 'lb' },
                  { v: 'kg' as const, label: 'kg' },
                ]}
              />
            </Field>
            <SexField profile={draft} onChange={set} />

            <GoalPicker goals={goalsOf(draft)} onChange={(goals) => set({ goals, goalChoice: goals[0] })} />

            <BringUpField profile={draft} onChange={set} />
            {plan.goalCoverage ? <Note>{plan.goalCoverage}</Note> : plan.goalNote ? <Note>{plan.goalNote}</Note> : null}
          </>
        ) : null}

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

            <Field label="Days a week">
              <Options
                columns={2}
                value={draft.days}
                onPick={(v) => set({ days: v })}
                options={[3, 4, 5, 6].map((n) => ({ v: n, label: `${n} days` }))}
              />
            </Field>

            {(draft.days ?? 0) >= 4 ? (
              <Field label="Leg days" hint="Two is quads on one day, hamstrings and glutes on the other.">
                <Options
                  columns={2}
                  value={legDaysOf(draft)}
                  onPick={(v) => set({ legDays: v })}
                  options={[
                    { v: 1 as const, label: 'Once a week' },
                    { v: 2 as const, label: 'Twice, split' },
                  ]}
                />
              </Field>
            ) : null}

            <Field label="How long have you got?" hint="A ceiling, not a target. Sessions land where they land and the app tells you what each one costs.">
              <Options
                columns={2}
                value={draft.minutes}
                onPick={(v) => set({ minutes: v })}
                options={[
                  { v: 30 as const, label: 'Up to 30 minutes' },
                  { v: 45 as const, label: 'Up to 45 minutes' },
                  { v: 60 as const, label: 'Up to an hour' },
                  { v: LONG_SESSION, label: 'No limit' },
                ]}
              />
            </Field>
            <Field label="Where are you training?">
              <Options
                value={draft.access}
                onPick={(v) => set({ access: v })}
                options={[
                  { v: 'full' as const, label: 'Full gym' },
                  { v: 'basic' as const, label: 'Basic gym' },
                  { v: 'home' as const, label: 'Home with kit' },
                  { v: 'body' as const, label: 'Bodyweight only' },
                ]}
              />
            </Field>
            <Field label="Rest of the week" optional>
              <Chips options={OTHER_TRAINING} selected={draft.other ?? []} onToggle={(v) => toggle('other', v)} />
              {/* This field's whole job is the advice under it, and until every
                  answer had a line, four of the five were collected and read by
                  nothing, which is the exact bug the barbell question had. */}
              {(draft.other ?? []).map((o) => (OTHER_NOTES[o] ? <Note key={o}>{OTHER_NOTES[o]}</Note> : null))}
            </Field>
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
                      ? { block: true, blockStart: draft.blockStart ?? mondayOf(today()) }
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
            <Field label="Never suggest" optional>
              <Chips
                options={COMMON_DISLIKES}
                selected={draft.dislikes ?? []}
                onToggle={(v) => toggle('dislikes', v)}
              />
            </Field>
          </>
        ) : null}

        {/* Records moved to its own place on the nav. Everything that
            answers "how am I doing" was three taps deep inside a screen that
            otherwise looks like a form, and nobody would guess it lived
            there. */}

        {section === 'body' ? (
          <>
            <BodyWeightCard
              weights={weights}
              goalWeight={draft.goalWeight}
              unit={unit}
              onLog={onLogWeight}
            />

            <Field label="Goal weight" optional>
              <NumberInput decimal value={goalWeight} onChange={setGoalWeight} suffix={unitLabel(unit)} />
            </Field>
            <Field label="Height" optional>
              <div className="flex gap-2">
                <NumberInput value={heightFt} onChange={setHeightFt} suffix="ft" />
                <NumberInput value={heightInch} onChange={setHeightInch} suffix="in" />
              </div>
            </Field>

            <SoreFields draft={draft} set={set} toggle={toggle} />

            <Field label="Any heart, lung, kidney or blood sugar condition, or told by a doctor to limit exercise?">
              <Options
                columns={2}
                value={draft.condition}
                onPick={(v) => set({ condition: v })}
                options={[
                  { v: 'no' as const, label: 'No' },
                  { v: 'yes' as const, label: 'Yes' },
                  { v: 'skip' as const, label: 'Rather not say' },
                ]}
              />
            </Field>
          </>
        ) : null}
      </div>

      <SaveButton onClick={commit} />
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

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-6 w-full rounded-xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent"
    >
      Save
    </button>
  )
}
