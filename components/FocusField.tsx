'use client'

import { defaultFocus, FOCUS_GROUPS, focusNote, type Profile } from '@/lib/onboarding'
import { Field, Many, Note, Options } from './Form'

/**
 * Two questions that belong together: what somebody is, and what they want to
 * bring up.
 *
 * The first exists because a questionnaire that asks your age, your height,
 * your injuries and four goals but never this does not read as neutral. It
 * reads as an app whose default person is a man. The second is what makes the
 * first honest: the answer to "what are you" only ticks the starting answer to
 * "what do you want", which is on the same screen and is one tap to change.
 *
 * Nothing is inferred quietly. An app that asks and then hands out the
 * identical week is worse than one that never asked, because now the person
 * knows it asked and ignored them.
 */
export function FocusField({
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
        label="Anything the plan should know?"
        hint="Used for one thing: which muscle groups it puts first. Nothing else reads it."
      >
        <Options
          columns={2}
          value={profile.sex}
          onPick={(v) =>
            // Changing this re-ticks the groups below, unless they have already
            // been touched by hand. An answer somebody gave is not overwritten
            // by an assumption.
            onChange({ sex: v, focus: profile.focus ?? defaultFocus(v) })
          }
          options={[
            { v: 'female' as const, label: 'Female' },
            { v: 'male' as const, label: 'Male' },
            { v: 'skip' as const, label: 'Rather not say' },
          ]}
        />
      </Field>

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
