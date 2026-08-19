'use client'

import { useMemo, useState } from 'react'
import {
  buildDay,
  dayById,
  GOAL_CHOICES,
  GOAL_FROM_CHOICE,
  goalCoverage,
  goalNoteFor,
  goalsAgree,
  goalsOf,
  primaryGoal,
  legDaysOf,
  LONG_SESSION,
  planFor,
  PROGRAMS,
  selfDirected,
  SORE_JOINTS,
  type Profile,
} from '@/lib/onboarding'
import { fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { mondayOf } from '@/lib/block'
import { today as todayIso } from '@/lib/format'
import { Chips, Field, Many, NumberInput, Note, Options, TextInput } from './Form'
import LiftyMark from './LiftyMark'
import type { Goal } from '@/lib/types'

// Five sections rather than a dozen full screen taps. Answers that belong
// together are asked together, everything is optional, and every one of them is
// editable afterwards on the profile page using the same controls.
const STEPS = [
  { id: 'you', title: 'You', kicker: 'The bits that go on your profile' },
  { id: 'experience', title: 'Experience', kicker: 'This picks your program' },
  { id: 'week', title: 'Your week', kicker: 'What you can actually commit to' },
  { id: 'body', title: 'Your body', kicker: 'Where you are starting from' },
  { id: 'plan', title: 'Your plan', kicker: '' },
] as const

export interface OnboardingResult {
  profile: Profile
  goal: Goal
  startDayId: string | null
  // Open the builder instead of starting a session. What somebody who writes
  // their own workouts wanted from the beginning.
  build?: boolean
  // Day one bodyweight, in pounds, or null if they did not give one.
  weight: number | null
}

// A number in pounds, back into the box in whatever unit is on screen.
function inputFor(lb: number | undefined, unit: Unit): string {
  if (lb == null) return ''
  const n = Math.round(toDisplay(lb, unit) * 10) / 10
  return String(n)
}

export default function Onboarding({
  onFinish,
  initial,
  again,
}: {
  onFinish: (result: OnboardingResult) => void
  // Running it a second time starts from the answers already given rather
  // than from nothing. Changing your mind about one of them should not mean
  // typing the other twelve again.
  initial?: Profile
  again?: boolean
}) {
  const seed = initial ?? {}
  const seedUnit: Unit = seed.units === 'kg' ? 'kg' : 'lb'
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>({ units: seedUnit, ...seed })
  // Typed numbers stay strings until they are saved, so a half typed "18." is
  // not repeatedly parsed out from under the person typing it.
  const [name, setName] = useState(seed.name ?? '')
  const [age, setAge] = useState(seed.ageYears != null ? String(seed.ageYears) : '')
  const [weight, setWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState(inputFor(seed.goalWeight, seedUnit))
  const [heightFt, setHeightFt] = useState(
    seed.heightIn != null ? String(Math.floor(seed.heightIn / 12)) : '',
  )
  const [heightIn, setHeightIn] = useState(
    seed.heightIn != null ? String(Math.round(seed.heightIn % 12)) : '',
  )

  const unit: Unit = profile.units === 'kg' ? 'kg' : 'lb'
  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))
  const toggleSore = (v: string) => {
    const list = profile.sore ?? []
    set({ sore: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] })
  }

  const num = (s: string): number | null => {
    const n = Number(s)
    return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
  }

  // The profile as it will be saved, with the typed fields folded in. Built on
  // demand so the plan preview on the last step reflects everything answered.
  const full = useMemo((): Profile => {
    const ft = Number(heightFt)
    const inch = Number(heightIn)
    const height =
      Number.isFinite(ft) && ft > 0 ? ft * 12 + (Number.isFinite(inch) ? inch : 0) : null
    const gw = num(goalWeight)
    return {
      ...profile,
      name: name.trim() || undefined,
      ageYears: num(age) ?? undefined,
      heightIn: height ?? undefined,
      goalWeight: gw != null ? toPounds(gw, unit) : undefined,
    }
  }, [profile, name, age, goalWeight, heightFt, heightIn, unit])

  const goal: Goal = GOAL_FROM_CHOICE[profile.goalChoice ?? 'muscle'] ?? 'muscle'

  function finish(startDayId: string | null, build?: boolean) {
    const w = num(weight)
    const plan = planFor(full, goal)
    onFinish({
      // Performance starts a six week block on day one. That is the whole
      // point of asking about experience: somebody who has trained for years
      // should not have to go hunting in Settings for structure they already
      // know they want.
      profile: plan.block ? { ...full, block: true, blockStart: mondayOf(todayIso()) } : full,
      goal,
      startDayId,
      build,
      weight: w != null ? toPounds(w, unit) : null,
    })
  }

  const current = STEPS[Math.min(step, STEPS.length - 1)]
  const last = step >= STEPS.length - 1
  const own = selfDirected(full)

  return (
    <Frame>
      <Header
        index={Math.min(step, STEPS.length - 1)}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onJump={(i) => setStep(i)}
      />

      <div className="flex-1 pb-4">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">{current.title}</h1>
        {current.kicker ? <p className="mt-1 text-sm text-muted">{current.kicker}</p> : null}

        <div className="mt-6">
          {current.id === 'you' ? (
            <>
              {!again ? (
                <p className="mb-4 text-sm leading-relaxed text-muted">
                  Five short sections and you have a plan and a session to start.
                </p>
              ) : null}
              <Field label="What should we call you?" optional>
                <TextInput value={name} onChange={setName} placeholder="Name" autoComplete="given-name" />
              </Field>
              <div className="mt-4 flex gap-2">
                <div className="flex-1">
                  <Field label="Age">
                    <NumberInput value={age} onChange={setAge} suffix="yrs" placeholder="35" />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Weights in">
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
                </div>
              </div>
              <Field
                label="What do you want out of this?"
                hint="Pick as many as you like. One of them sets the reps and the rests, and you can change which any time."
              >
                <Many
                  columns={2}
                  value={goalsOf(profile)}
                  onToggle={(v) => {
                    const now = goalsOf(profile)
                    const next = now.includes(v) ? now.filter((g) => g !== v) : [...now, v]
                    set({ goals: next, goalChoice: next.includes(profile.goalChoice!) ? profile.goalChoice : next[0] })
                  }}
                  options={GOAL_CHOICES}
                />
              </Field>

              {/* Only when the picks genuinely pull in different directions. Wanting to
                  build muscle and lean out is one answer, and asking which comes first
                  would be asking somebody to choose between a thing and itself. */}
              {goalsOf(profile).length > 1 && !goalsAgree(goalsOf(profile)) ? (
                <Field label="Which one first?" hint="The one that sets the rep ranges right now.">
                  <Options
                    columns={2}
                    value={primaryGoal(profile)}
                    onPick={(v) => set({ goalChoice: v })}
                    options={GOAL_CHOICES.filter((c) => goalsOf(profile).includes(c.v))}
                  />
                </Field>
              ) : null}

              {/* Said here, where the choice is made, rather than four steps
                  later on the plan screen. */}
              {goalCoverage(profile) ? (
                <Note>{goalCoverage(profile)}</Note>
              ) : primaryGoal(profile) ? (
                <Note>{goalNoteFor(primaryGoal(profile))}</Note>
              ) : null}
            </>
          ) : null}

          {current.id === 'experience' ? (
            <>
              <Field label="How long have you been lifting?" hint="Without a break longer than a month.">
                <Options
                  columns={2}
                  value={profile.years}
                  onPick={(v) => set({ years: v })}
                  options={[
                    { v: 'never' as const, label: 'Never done it' },
                    { v: 'under6' as const, label: 'Under 6 months' },
                    { v: 'sixToTwo' as const, label: '6 months to 2 years' },
                    { v: 'overTwo' as const, label: 'Over 2 years' },
                  ]}
                />
              </Field>

              {profile.years === 'never' || profile.years === 'under6' ? (
                <Field label="Have you trained seriously in the past?">
                  <Options
                    columns={2}
                    value={profile.before}
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
                  columns={2}
                  value={profile.knows}
                  onPick={(v) => set({ knows: v })}
                  options={[
                    { v: 'yes' as const, label: 'Yes, to the plate' },
                    { v: 'roughly' as const, label: 'Roughly' },
                    { v: 'no' as const, label: 'No idea' },
                  ]}
                />
              </Field>

              <Field
                label="Do you write your own workouts?"
                hint="There is a plan either way. This decides whether it is the first thing you see."
              >
                <Options
                  value={profile.writesOwn}
                  onPick={(v) => set({ writesOwn: v })}
                  options={[
                    { v: 'no' as const, label: 'No, give me a plan' },
                    { v: 'sometimes' as const, label: 'Sometimes', note: 'A plan to start from, changed when you feel like it' },
                    { v: 'yes' as const, label: 'Yes, I know what I want to do', note: 'Straight to the builder' },
                  ]}
                />
              </Field>

              <Field label="Barbell lifts" hint="Squat, deadlift, bench, overhead press.">
                <Options
                  columns={2}
                  value={profile.barbell}
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

          {current.id === 'week' ? (
            <>
              <Field label="Days a week" hint="Realistically. The plan is built around the number you hit.">
                <Options
                  columns={2}
                  value={profile.days}
                  onPick={(v) => set({ days: v })}
                  options={[
                    { v: 3, label: '3 days', note: 'The sweet spot' },
                    { v: 4, label: '4 days' },
                    { v: 5, label: '5 days' },
                    { v: 6, label: '6 days' },
                  ]}
                />
              </Field>
              {(profile.days ?? 0) >= 4 ? (
                <Field
                  label="Leg days"
                  hint="Two is quads on one day, hamstrings and glutes on the other."
                >
                  <Options
                    columns={2}
                    value={legDaysOf(profile)}
                    onPick={(v) => set({ legDays: v })}
                    options={[
                      { v: 1 as const, label: 'Once a week' },
                      { v: 2 as const, label: 'Twice, split' },
                    ]}
                  />
                </Field>
              ) : null}
              <Field label="How long have you got?" hint="Sets how many movements go in a session.">
                <Options
                  columns={2}
                  value={profile.minutes}
                  onPick={(v) => set({ minutes: v })}
                  options={[
                    { v: 30 as const, label: '30 minutes' },
                    { v: 60 as const, label: '1 hour' },
                    { v: LONG_SESSION, label: '90 minutes', note: 'Nothing gets trimmed' },
                  ]}
                />
              </Field>
              <Field label="Where are you training?">
                <Options
                  columns={2}
                  value={profile.access}
                  onPick={(v) => set({ access: v })}
                  options={[
                    { v: 'full' as const, label: 'Full gym' },
                    { v: 'basic' as const, label: 'Basic gym' },
                    { v: 'home' as const, label: 'Home with kit' },
                    { v: 'body' as const, label: 'Bodyweight only' },
                  ]}
                />
              </Field>
            </>
          ) : null}

          {current.id === 'body' ? (
            <>
              <Field
                label="Where are you today?"
                hint={
                  again
                    ? 'A fresh reading, if you want one. Leaving it blank changes nothing you have already logged.'
                    : 'Day one. Everything after it is measured from here, and you can log it as often or as rarely as you like.'
                }
                optional
              >
                <NumberInput
                  decimal
                  value={weight}
                  onChange={setWeight}
                  suffix={unitLabel(unit)}
                  placeholder={unit === 'kg' ? '82' : '180'}
                />
              </Field>
              <div className="mt-4 flex gap-2">
                <div className="flex-1">
                  <Field label="Heading for">
                    <NumberInput
                      decimal
                      value={goalWeight}
                      onChange={setGoalWeight}
                      suffix={unitLabel(unit)}
                      placeholder={unit === 'kg' ? '77' : '170'}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Height">
                    <div className="flex gap-2">
                      <NumberInput value={heightFt} onChange={setHeightFt} suffix="ft" placeholder="5" />
                      <NumberInput value={heightIn} onChange={setHeightIn} suffix="in" placeholder="10" />
                    </div>
                  </Field>
                </div>
              </div>

              <Field label="Anything giving you trouble?" optional>
                <Chips options={SORE_JOINTS} selected={profile.sore ?? []} onToggle={toggleSore} />
                {(profile.sore ?? []).length ? (
                  <Note>
                    We swap the movement, not the muscle. A sore knee gets the leg press, not a week off legs.
                  </Note>
                ) : null}
              </Field>

              <Field
                label="Any heart, lung, kidney or blood sugar condition, or told by a doctor to limit exercise?"
                hint="Two questions we have to ask. They make the plan lighter, they lock nothing."
              >
                <Options
                  columns={2}
                  value={profile.condition}
                  onPick={(v) => set({ condition: v })}
                  options={[
                    { v: 'no' as const, label: 'No' },
                    { v: 'yes' as const, label: 'Yes' },
                    { v: 'skip' as const, label: 'Rather not say' },
                  ]}
                />
              </Field>
              <Field label="Chest pain, dizziness, blackouts or odd breathlessness when you push?">
                <Options
                  columns={2}
                  value={profile.symptoms}
                  onPick={(v) => set({ symptoms: v })}
                  options={[
                    { v: 'no' as const, label: 'No' },
                    { v: 'yes' as const, label: 'Yes' },
                  ]}
                />
              </Field>
            </>
          ) : null}

          {current.id === 'plan' ? <PlanReview profile={full} goal={goal} unit={unit} /> : null}
        </div>
      </div>

      <div className="sticky bottom-0 bg-ink pb-2 pt-2">
        {last ? (
          own ? (
            // They said they write their own, so the builder is the button and
            // the plan is the quiet one. It is still made and still there.
            <div className="flex gap-2">
              <button
                onClick={() => finish(null, true)}
                className="flex-1 rounded-2xl bg-accent py-4 font-display text-base font-bold text-on-accent"
              >
                Build my first workout
              </button>
              <button onClick={() => finish(null)} className="px-5 py-4 text-base font-extrabold text-muted">
                Later
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => finish(planFor(full, goal).dayIds[0])}
                className="flex-1 rounded-2xl bg-accent py-4 font-display text-base font-bold text-on-accent"
              >
                Start day 1
              </button>
              <button onClick={() => finish(null)} className="px-5 py-4 text-base font-extrabold text-muted">
                Later
              </button>
            </div>
          )
        ) : (
          <>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full rounded-2xl bg-accent py-4 font-display text-base font-bold text-on-accent"
            >
              Continue
            </button>
            {step === 0 && !again ? (
              <button onClick={() => finish(null)} className="mt-1 w-full py-2 text-sm text-muted">
                Skip and pick something sensible
              </button>
            ) : null}
          </>
        )}
      </div>
    </Frame>
  )
}

// The rail doubles as navigation: a step you have been through is a tap away,
// which is what makes this a form rather than a corridor.
function Header({
  index,
  onBack,
  onJump,
}: {
  index: number
  onBack: () => void
  onJump: (i: number) => void
}) {
  return (
    <div className="sticky top-0 z-10 bg-ink pb-4 pt-1">
      {/* The mark rides in the progress row, so the questionnaire is plainly
          the same thing that will be coaching you afterwards. */}
      <div className="flex items-center gap-2">
        {index > 0 ? (
          <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-muted" aria-label="Back">
            &larr;
          </button>
        ) : null}
        <LiftyMark size={22} />
        <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
          Step {index + 1} of {STEPS.length}
        </p>
      </div>
      <div className="mt-2 flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => (i <= index ? onJump(i) : undefined)}
            aria-label={s.title}
            aria-current={i === index ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-track'}`}
          />
        ))}
      </div>
    </div>
  )
}

function PlanReview({ profile, goal, unit }: { profile: Profile; goal: Goal; unit: Unit }) {
  const plan = planFor(profile, goal)
  const days = plan.dayIds.map((id) => dayById(id)).filter(Boolean)
  const swaps = days[0] ? buildDay(days[0]!, profile).filter((i) => i.swappedFrom) : []
  const blurb = PROGRAMS.find((p) => p.id === plan.program)?.blurb ?? ''

  const notes: string[] = []
  // Said first, because it changes what everything under it is for.
  if (plan.selfDirected)
    notes.push(
      'You write your own, so that is where this ends: the builder, with the whole movement library in it. The plan above still exists and is sitting in Start whenever you want a day handed to you.',
    )
  if (plan.restNote) notes.push(plan.restNote)
  if (plan.cleared)
    notes.push(
      'You flagged something on the health questions, so this starts lighter, nothing goes to failure and the effort targets stay off. Worth a word with your doctor before you push hard.',
    )
  if (plan.returning)
    notes.push('You have done this before, so this is two to three weeks of rebuilding, not a beginner course.')
  if (plan.block)
    notes.push(
      'Six week blocks are on from day one: five weeks of climbing effort, then a deload that turns the work into progress. Off in Settings if you would rather not.',
    )
  if (plan.goalNote) notes.push(plan.goalNote)
  if (profile.goalWeight != null)
    notes.push(`Goal weight ${fmtWeight(profile.goalWeight, unit)}. It sits on the Progress tab next to the lifts.`)
  if (swaps.length)
    notes.push(`Swapped for what you have: ${swaps.map((s) => `${s.swappedFrom} to ${s.name}`).join(', ')}.`)

  return (
    <>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-accent-ink">
          {plan.selfDirected ? `${plan.program} · plan kept aside` : plan.program}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
          {plan.splitName}, {plan.days} days a week
        </h2>
        <p className="mt-1 text-sm text-muted">{blurb}</p>
        <p className="mt-2 text-sm text-muted num">
          {plan.reps} reps · {plan.sets} sets per exercise
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {days.map((d, i) => (
          <div
            key={`${d!.id}-${i}`}
            className="flex items-center justify-between rounded-xl bg-card px-3 py-3 ring-1 ring-edge"
          >
            <span className="text-sm">{d!.name}</span>
            <span className="num text-xs text-muted">day {i + 1}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-edge">
        <Row label="Sets per muscle, per session" value={plan.perMuscle} />
        <Row label="Weekly target per muscle" value="10 plus" />
        <Row label="Exercises per session" value={String(plan.exercises)} />
        <Row label="How hard" value={plan.cleared ? 'comfortable' : 'stop 2 to 3 short'} />
        <Row label="Leg days" value={plan.legDays === 2 ? 'two, quads and posterior' : 'one'} />
        <Row label="Training blocks" value={plan.block ? '6 weeks, on' : 'off'} />
      </div>

      {notes.map((n) => (
        <Note key={n}>{n}</Note>
      ))}
    </>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="frame-page mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-safe pt-8">{children}</main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-edge py-2 text-sm last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="num text-muted">{value}</span>
    </div>
  )
}
