'use client'

import { defaultFocus, FOCUS_GROUPS, focusNote, type Profile } from '@/lib/onboarding'
import { Field, Many, Note, Options } from './Form'

/**
 * Two questions that belong to each other but not to the same screen.
 *
 * The first exists because a questionnaire that asks your age, your height,
 * your weight, your injuries and four goals but never this does not read as
 * neutral. It reads as an app whose default person is a man. It sits with the
 * other facts about a person, because that is what it is.
 *
 * The second is what makes the first honest. The answer to "what are you" only
 * ticks the starting answer here, and here is on screen with the reason
 * written underneath and one tap to change it. An app that asks and then hands
 * out the identical week is worse than one that never asked, because now the
 * person knows it asked and ignored them.
 */
export function SexField({
  profile,
  onChange,
}: {
  profile: Profile
  onChange: (patch: Partial<Profile>) => void
}) {
  return (
    <Field
      label="Anything the plan should know?"
      hint="Used for one thing: which muscle groups it puts first. Nothing else reads it."
    >
      <Options
        columns={2}
        value={profile.sex}
        onPick={(v) =>
          // Changing this re-ticks the groups on the next screen, unless they
          // have already been touched by hand. An answer somebody gave is not
          // overwritten by an assumption.
          onChange({ sex: v, focus: profile.focus ?? defaultFocus(v) })
        }
        options={[
          { v: 'female' as const, label: 'Female' },
          { v: 'male' as const, label: 'Male' },
          { v: 'skip' as const, label: 'Rather not say' },
        ]}
      />
    </Field>
  )
}

export function BringUpField({
  profile,
  onChange,
}: {
  profile: Profile
  onChange: (patch: Partial<Profile>) => void
}) {
  const focus = profile.focus ?? defaultFocus(profile.sex)
  const note = focusNote(focus)

  return (
    <>
      <Field
        label="Anything you want to bring up?"
        hint="Pick as many as you like, or none. Everything still gets trained."
      >
        <Many
          columns={2}
          value={focus}
          onToggle={(v) =>
            onChange({ focus: focus.includes(v) ? focus.filter((g) => g !== v) : [...focus, v] })
          }
          options={FOCUS_GROUPS.map((g) => ({ v: g, label: g }))}
        />
      </Field>

      {note ? <Note>{note}</Note> : null}
    </>
  )
}
