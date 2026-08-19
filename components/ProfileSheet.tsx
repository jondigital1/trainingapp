'use client'

import { useState } from 'react'
import {
  ageBand,
  LONG_SESSION,
  COMMON_DISLIKES,
  GOAL_FROM_CHOICE,
  OTHER_TRAINING,
  planFor,
  PROGRAMS,
  SORE_JOINTS,
  unitOf,
  type Profile,
} from '@/lib/onboarding'
import BodyWeightCard from './BodyWeightCard'
import ScheduleCard from './ScheduleCard'
import RecordsTab from './RecordsTab'
import { fmtDelta, fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { fmtDate, today } from '@/lib/format'
import { blockWeek, mondayOf } from '@/lib/block'
import { scheduledDays } from '@/lib/schedule'
import type { BodyWeight, Workout } from '@/lib/types'
import { Chips, Field, NumberInput, Note, Options, TextInput } from './Form'
import Sheet from './Sheet'

type Focus = 'minutes' | 'sore' | 'all'

// The same five sections the questionnaire asked, in the same order, so coming
// back to change an answer means going to where you gave it.
const SECTIONS = [
  { id: 'you', label: 'You' },
  { id: 'experience', label: 'Experience' },
  { id: 'week', label: 'Your week' },
  { id: 'body', label: 'Your body' },
  { id: 'records', label: 'Records' },
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
  onLogWeight,
  onOpenSettings,
  onClose,
}: {
  profile: Profile
  focus: Focus
  weights: BodyWeight[]
  workouts: Workout[]
  inline?: boolean
  onSave: (next: Profile) => void
  onLogWeight: (pounds: number) => void
  onOpenSettings?: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [section, setSection] = useState<Section>(focus === 'minutes' ? 'week' : focus === 'sore' ? 'body' : 'you')
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

  const set = (patch: Partial<Profile>) => setDraft((prev) => ({ ...prev, ...patch }))
  const toggle = (key: 'sore' | 'other' | 'dislikes', v: string) => {
    const list = draft[key] ?? []
    set({ [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } as Partial<Profile>)
  }

  function commit() {
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
    const w = numOrNull(todayWeight)
    if (w != null) onLogWeight(toPounds(w, unit))
    onSave(next)
  }

  // Straight to the one question that was asked, when the app asked it in
  // context. The full page is a different job from "how long have you got".
  if (focus !== 'all') {
    return (
      <Sheet title={focus === 'minutes' ? 'How long have you got?' : 'Anything sore?'} onClose={onClose}>
        {focus === 'minutes' ? (
          <Field label="Time in the gym" hint="Sets how many movements we put in a session.">
            <Options
              columns={2}
              value={draft.minutes}
              onPick={(v) => set({ minutes: v })}
              options={[
                { v: 30 as const, label: '30 minutes' },
                { v: 60 as const, label: '1 hour' },
                { v: LONG_SESSION, label: '90 minutes' },
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
      onClose={onClose}
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
      <div className="rounded-2xl surface p-3 ring-1 ring-edge">
        <p className="text-xs uppercase tracking-wide text-accent-ink">{plan.program}</p>
        <p className="mt-1 text-sm">
          {name.trim() ? `${name.trim()}, on ` : ''}
          {plan.splitName}, {plan.days} days a week
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{blurb}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={`rounded-full px-3 py-2 text-sm ring-1 ${
              section === s.id ? 'bg-accent text-on-accent ring-accent' : 'surface text-muted ring-edge'
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
                  { v: 'lb' as const, label: 'Pounds' },
                  { v: 'kg' as const, label: 'Kilos' },
                ]}
              />
            </Field>
            <Field label="What is this for?">
              <Options
                columns={2}
                value={draft.goalChoice}
                onPick={(v) => set({ goalChoice: v })}
                options={[
                  { v: 'muscle' as const, label: 'Build muscle' },
                  { v: 'strength' as const, label: 'Get stronger' },
                  { v: 'lean' as const, label: 'Lean out' },
                  { v: 'health' as const, label: 'Stay capable' },
                ]}
              />
            </Field>
            {plan.goalNote ? <Note>{plan.goalNote}</Note> : null}
          </>
        ) : null}

        {section === 'experience' ? (
          <>
            <Field label="How long have you been lifting?">
              <Options
                value={draft.years}
                onPick={(v) => set({ years: v })}
                options={[
                  { v: 'never' as const, label: 'Never done it' },
                  { v: 'under6' as const, label: 'Under 6 months' },
                  { v: 'sixToTwo' as const, label: '6 months to 2 years' },
                  { v: 'overTwo' as const, label: 'Over 2 years' },
                ]}
              />
            </Field>
            {draft.years === 'never' || draft.years === 'under6' ? (
              <Field label="Have you trained seriously in the past?">
                <Options
                  value={draft.before}
                  onPick={(v) => set({ before: v })}
                  options={[
                    { v: 'no' as const, label: 'No, this is new' },
                    { v: 'thisYear' as const, label: 'Yes, within the last year' },
                    { v: 'longAgo' as const, label: 'Yes, longer ago than that' },
                  ]}
                />
              </Field>
            ) : null}
            <Field label="Could you name the weight you last used on your main lifts?">
              <Options
                value={draft.knows}
                onPick={(v) => set({ knows: v })}
                options={[
                  { v: 'yes' as const, label: 'Yes, to the plate' },
                  { v: 'roughly' as const, label: 'Roughly' },
                  { v: 'no' as const, label: 'No idea' },
                ]}
              />
            </Field>
            <Field label="Barbell lifts">
              <Options
                columns={2}
                value={draft.barbell}
                onPick={(v) => set({ barbell: v })}
                options={[
                  { v: 'confident' as const, label: 'Confident' },
                  { v: 'rusty' as const, label: 'A bit rusty' },
                  { v: 'never' as const, label: 'Never tried' },
                  { v: 'no' as const, label: 'Not interested' },
                ]}
              />
            </Field>
          </>
        ) : null}

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
            <Field label="Time in the gym" hint="Sets how many movements we put in a session.">
              <Options
                columns={2}
                value={draft.minutes}
                onPick={(v) => set({ minutes: v })}
                options={[
                  { v: 30 as const, label: '30 minutes' },
                  { v: 60 as const, label: '1 hour' },
                  { v: LONG_SESSION, label: '90 minutes' },
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
                  { v: 'home' as const, label: 'Home with some kit' },
                  { v: 'body' as const, label: 'Bodyweight only' },
                ]}
              />
            </Field>
            <Field label="Rest of the week" optional>
              <Chips options={OTHER_TRAINING} selected={draft.other ?? []} onToggle={(v) => toggle('other', v)} />
              {(draft.other ?? []).includes('Running') ? (
                <Note>Lift first when both land on the same day.</Note>
              ) : null}
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

        {section === 'records' ? (
          <RecordsTab
            workouts={workouts}
            today={today()}
            target={scheduledDays(draft) || draft.days || 3}
          />
        ) : null}

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

            <Field label="Has a doctor told you to limit exercise, or do you have a heart, lung, kidney or blood sugar condition?">
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
            <Field label="When you push yourself, do you get chest pain, dizziness, blackouts or breathlessness out of proportion to the effort?">
              <Options
                columns={2}
                value={draft.symptoms}
                onPick={(v) => set({ symptoms: v })}
                options={[
                  { v: 'no' as const, label: 'No' },
                  { v: 'yes' as const, label: 'Yes' },
                ]}
              />
            </Field>
          </>
        ) : null}
      </div>

      <SaveButton onClick={commit} />
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
              Working around it is normal. Keep it at <span className="num text-accent-ink">5 out of 10</span> or
              under while you lift, and it should be back to its usual self the next morning. Worse the next
              day means that was too heavy.
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
            <Note>Worth a professional eye before you load it. We will keep suggesting the rest.</Note>
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
      className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-medium text-on-accent"
    >
      Save
    </button>
  )
}
