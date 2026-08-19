'use client'

import { GOAL_CHOICES, goalsAgree, promoteGoal } from '@/lib/onboarding'
import type { Profile } from '@/lib/onboarding'
import { Field, Many } from './Form'

type Choice = NonNullable<Profile['goalChoice']>

const LABEL: Record<Choice, string> = Object.fromEntries(GOAL_CHOICES.map((c) => [c.v, c.label])) as Record<
  Choice,
  string
>

/**
 * Goals, in the order somebody wants them. Asking for an order rather than a
 * winner is the difference between a questionnaire and a plan: somebody who
 * says build muscle first, then get stronger, has described a year, and the
 * app can hold that instead of making them pretend the other three do not
 * exist. The front of the list is what sets the numbers today, and moving
 * something up is one tap whenever they are ready.
 */
export function GoalPicker({ goals, onChange }: { goals: Choice[]; onChange: (goals: Choice[]) => void }) {
  const showOrder = goals.length > 1 && !goalsAgree(goals)
  return (
    <>
      <Field
        label="What do you want out of this?"
        hint="Pick as many as you like, in the order you want them. Nothing you pick gets thrown away."
      >
        <Many
          columns={2}
          ordered
          value={goals}
          onToggle={(v) => onChange(goals.includes(v) ? goals.filter((g) => g !== v) : [...goals, v])}
          options={GOAL_CHOICES}
        />
      </Field>

      {/* Only when the picks genuinely pull in different directions. Wanting to
          build muscle and lean out is one answer, and asking which comes first
          would be asking somebody to choose between a thing and itself. */}
      {showOrder ? (
        <Field
          label="What are you going after first?"
          hint="The top one sets the reps and the rests. The others are what you move on to, whenever you are ready."
        >
          <div className="surface overflow-hidden rounded-xl ring-1 ring-edge">
            {goals.map((g, i) => (
              <div
                key={g}
                className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-edge' : ''}`}
              >
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent-ink text-xs font-semibold text-card">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-bright">{LABEL[g]}</span>
                {i === 0 ? (
                  <span className="text-xs text-muted">Right now</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange(promoteGoal(goals, g))}
                    className="rounded-lg px-2.5 py-1 text-xs text-bright ring-1 ring-edge"
                  >
                    Start this
                  </button>
                )}
              </div>
            ))}
          </div>
        </Field>
      ) : null}
    </>
  )
}
