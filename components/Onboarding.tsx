'use client'

import { useMemo, useState } from 'react'
import {
  buildDay,
  dayById,
  GOAL_FROM_CHOICE,
  planFor,
  PROGRAMS,
  SORE_JOINTS,
  type Profile,
} from '@/lib/onboarding'
import { fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { Chips, Field, NumberInput, Note, Options, TextInput } from './Form'
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

  function finish(startDayId: string | null) {
    const w = num(weight)
    const plan = planFor(full, goal)
    onFinish({
      // Performance turns the effort wave on from day one. That is the whole
      // point of asking about experience: an experienced lifter should not
      // have to go hunting in Settings for the screens they already know.
      profile: plan.wave ? { ...full, wave: true } : full,
      goal,
      startDayId,
      weight: w != null ? toPounds(w, unit) : null,
    })
  }

  const current = STEPS[Math.min(step, STEPS.length - 1)]
  const last = step >= STEPS.length - 1

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
                <p className="mb-5 text-sm leading-relaxed text-muted">
                  Log every set. See what you did last time on the line above the inputs. Know what to do
                  next. Five short sections and you have a plan and a session to start.
                </p>
              ) : null}
              <Field label="What should we call you?" optional>
                <TextInput value={name} onChange={setName} placeholder="Name" autoComplete="given-name" />
              </Field>
              <Field label="Age" hint="Sets the sets. Over 60 starts with fewer of them and adds from there." optional>
                <NumberInput value={age} onChange={setAge} suffix="years" placeholder="35" />
              </Field>
              <Field label="Weights in">
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
              <Field label="What is this for?" hint="Sets the rep ranges and what the coach line asks of you.">
                <Options
                  value={profile.goalChoice}
                  onPick={(v) => set({ goalChoice: v })}
                  options={[
                    { v: 'muscle' as const, label: 'Build muscle' },
                    { v: 'strength' as const, label: 'Get stronger' },
                    { v: 'lean' as const, label: 'Lean out' },
                    { v: 'health' as const, label: 'Stay healthy and capable' },
                  ]}
                />
              </Field>
            </>
          ) : null}

          {current.id === 'experience' ? (
            <>
              <Field label="How long have you been lifting?" hint="Without a break longer than a month.">
                <Options
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

              <Field
                label="Could you name the weight you last used on your main lifts?"
                hint="The most honest experience question there is. No wrong answer."
              >
                <Options
                  value={profile.knows}
                  onPick={(v) => set({ knows: v })}
                  options={[
                    { v: 'yes' as const, label: 'Yes, to the plate' },
                    { v: 'roughly' as const, label: 'Roughly' },
                    { v: 'no' as const, label: 'No idea' },
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
              <Field label="Days a week" hint="Realistically. The plan is built around the number you actually hit.">
                <Options
                  columns={2}
                  value={profile.days}
                  onPick={(v) => set({ days: v })}
                  options={[
                    { v: 2, label: '2 days', note: 'Enough to progress' },
                    { v: 3, label: '3 days', note: 'The sweet spot' },
                    { v: 4, label: '4 days' },
                    { v: 5, label: '5 days' },
                    { v: 6, label: '6 days' },
                    { v: 7, label: '7 days', note: 'No rest day' },
                  ]}
                />
              </Field>
              <Field label="How long have you got?" hint="Sets how many movements go in a session.">
                <Options
                  columns={2}
                  value={profile.minutes}
                  onPick={(v) => set({ minutes: v })}
                  options={[
                    { v: 30 as const, label: '30 min' },
                    { v: 45 as const, label: '45 min' },
                    { v: 60 as const, label: '60 min' },
                    { v: 75 as const, label: '75 or more' },
                  ]}
                />
              </Field>
              <Field label="Where are you training?">
                <Options
                  value={profile.access}
                  onPick={(v) => set({ access: v })}
                  options={[
                    { v: 'full' as const, label: 'Full gym' },
                    { v: 'basic' as const, label: 'Basic gym', note: 'Dumbbells, benches, a few machines' },
                    { v: 'home' as const, label: 'Home with some kit' },
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
              <Field label="Where are you heading?" optional>
                <NumberInput
                  decimal
                  value={goalWeight}
                  onChange={setGoalWeight}
                  suffix={unitLabel(unit)}
                  placeholder={unit === 'kg' ? '77' : '170'}
                />
              </Field>
              <Field label="Height" optional>
                <div className="flex gap-2">
                  <NumberInput value={heightFt} onChange={setHeightFt} suffix="ft" placeholder="5" />
                  <NumberInput value={heightIn} onChange={setHeightIn} suffix="in" placeholder="10" />
                </div>
              </Field>

              <Field label="Anything giving you trouble?" optional>
                <Chips options={SORE_JOINTS} selected={profile.sore ?? []} onToggle={toggleSore} />
                {(profile.sore ?? []).length ? (
                  <Note>
                    We swap the movement, not the muscle. A sore knee gets the leg press, not a week off legs.
                  </Note>
                ) : null}
              </Field>

              <Field
                label="Has a doctor told you to limit exercise, or do you have a heart, lung, kidney or blood sugar condition?"
                hint="Two questions we have to ask. They make the plan lighter, they do not lock anything."
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
              <Field label="When you push yourself, do you get chest pain, dizziness, blackouts or breathlessness out of proportion to the effort?">
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
          <div className="flex gap-2">
            <button
              onClick={() => finish(planFor(full, goal).dayIds[0])}
              className="flex-1 rounded-2xl bg-accent py-4 text-base font-medium text-on-accent"
            >
              Start day 1
            </button>
            <button onClick={() => finish(null)} className="rounded-2xl px-5 py-4 text-base text-muted">
              Later
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full rounded-2xl bg-accent py-4 text-base font-medium text-on-accent"
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
      <div className="flex items-center gap-2">
        {index > 0 ? (
          <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-muted" aria-label="Back">
            &larr;
          </button>
        ) : null}
        <p className="text-xs uppercase tracking-wide text-muted">
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
            className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-edge'}`}
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
  if (plan.restNote) notes.push(plan.restNote)
  if (plan.cleared)
    notes.push(
      'You flagged something on the health questions, so this starts lighter, nothing goes to failure and the effort targets stay off. Worth a word with your doctor before you push hard.',
    )
  if (plan.returning)
    notes.push('You have done this before, so this is two to three weeks of rebuilding, not a beginner course.')
  if (!plan.showRpe && !plan.cleared)
    notes.push(
      'No effort scale yet. Add a rep or a little load when the last set felt like you had two left. We will turn RPE on when it will mean something.',
    )
  if (plan.wave)
    notes.push(
      'The three week effort wave is on from day one: build at two in reserve, push at one, then a week that goes to the end. Off in Settings if you would rather not.',
    )
  if (plan.goalNote) notes.push(plan.goalNote)
  if (profile.goalWeight != null)
    notes.push(`Goal weight ${fmtWeight(profile.goalWeight, unit)}. It sits on the Progress tab next to the lifts.`)
  if (swaps.length)
    notes.push(`Swapped for what you have: ${swaps.map((s) => `${s.swappedFrom} to ${s.name}`).join(', ')}.`)

  return (
    <>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <p className="text-xs uppercase tracking-wide text-accent">{plan.program}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
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
        <Row label="Effort scale" value={plan.showRpe ? 'RPE on' : 'hidden for now'} />
      </div>

      {notes.map((n) => (
        <Note key={n}>{n}</Note>
      ))}
    </>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-safe pt-8">{children}</main>
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
